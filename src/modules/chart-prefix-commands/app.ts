import { runScript, waitForElement } from "~/shared/utils/dom";

type FilterType =
	| "genre_include"
	| "genre_exclude"
	| "sec_genre_include"
	| "sec_genre_exclude"
	| "genre_either_include"
	| "genre_either_exclude"
	| "descriptor_include"
	| "descriptor_exclude";

type Scope = "genre" | "descriptor";

type BrowseResult = {
	display_name?: string;
	name?: string;
	component?: string;
	path?: string;
	assoc_id?: number;
};

type NativeQueryResult = {
	subBrowseActive: boolean;
	item: BrowseResult | null;
};

const INPUT_ID = "ui_browser_input_page_charts_settings";
const BROWSER_ID = "page_charts_settings";
const NATIVE_QUERY_EVENT = "EbrChartBrowserFirstMatchEvent";
const RYMCHART_PATCH_ATTEMPTS = 20;
const RYMCHART_PATCH_INTERVAL_MS = 200;
const SHORTCUT_SECTION_SELECTOR = ".page_chart_query_free_section_new";
const SHORTCUT_LABEL_SELECTOR = ".page_chart_query_free_section_label";

let excludeMode = false;

export async function main(): Promise<void> {
	const input = await waitForElement<HTMLInputElement>(`#${INPUT_ID}`);
	mount(input);
}

function itemId(item: BrowseResult): number | null {
	if (item.assoc_id != null) return item.assoc_id;
	const match = /\/(\d+)$/.exec(item.path ?? "");
	return match ? Number.parseInt(match[1], 10) : null;
}

function applyItem(filterType: FilterType, item: BrowseResult): void {
	const name = item.display_name ?? item.name ?? "";
	const id = itemId(item);
	if (!name || id == null) return;

	runScript(`
		(function () {
			var chart = window.RYMchart;
			if (!chart) return;
			var originalCreateChart = chart.onClickCreateChart;
			chart.onClickCreateChart = function () {};
			try {
				chart.addBrowserItem(${JSON.stringify(filterType)}, ${id}, ${JSON.stringify(name)});
			} finally {
				chart.onClickCreateChart = originalCreateChart;
			}
		})();
	`);
}

/**
 * Reads RYM's own native browse-widget state via an injected script rather
 * than a separate fetch, so shortcuts always match what RYM's own dropdown
 * would show. Deliberately reads RYMbrowser.resultCache (keyed by the exact
 * {q, component} that produced it) rather than currentResultSet ("last
 * rendered", which can be stale relative to the just-typed query if a
 * shortcut is pressed before RYM's own debounced search round-trip lands) —
 * a missing cache entry for the current input value means no match yet,
 * not a wrong one.
 */
function queryNativeBrowser(scope: Scope): Promise<NativeQueryResult> {
	const promise = new Promise<NativeQueryResult>((resolve) => {
		const listener = (e: Event) => {
			document.removeEventListener(NATIVE_QUERY_EVENT, listener);
			resolve((e as CustomEvent).detail as NativeQueryResult);
		};
		document.addEventListener(NATIVE_QUERY_EVENT, listener);
	});

	runScript(`
		(function () {
			var browser = window.RYMbrowser;
			var id = ${JSON.stringify(BROWSER_ID)};
			var path = (browser && browser.path && browser.path[id]) || [];
			var subBrowseActive = path.length > 0;
			var item = null;
			if (!subBrowseActive && browser && browser.resultCache) {
				var input = document.getElementById(${JSON.stringify(INPUT_ID)});
				var root = document.getElementById("ui_browser_" + id);
				var query = input ? input.value.trim() : "";
				var component = root ? root.dataset.component || "" : "";
				var cacheKey = JSON.stringify({ q: query, component: component });
				var resultSet = browser.resultCache[cacheKey];
				var results = (resultSet && resultSet.results) || [];
				for (var i = 0; i < results.length; i++) {
					var result = results[i];
					var resultComponent = result.component || (result.path || "").split("/")[0];
					if (resultComponent === ${JSON.stringify(scope)}) {
						item = result;
						break;
					}
				}
			}
			document.dispatchEvent(
				new CustomEvent(${JSON.stringify(NATIVE_QUERY_EVENT)}, {
					detail: { subBrowseActive: subBrowseActive, item: item },
				}),
			);
		})();
	`);

	return promise;
}

async function applyNativeMatch(
	scope: Scope,
	filterType: FilterType,
	input: HTMLInputElement,
): Promise<void> {
	const { subBrowseActive, item } = await queryNativeBrowser(scope);
	if (subBrowseActive || !item) return;

	applyItem(filterType, item);
	resetInput(input);
}

function genreFilterTypeFor(
	shortcutKey: 1 | 2 | 3,
	exclude: boolean,
): FilterType {
	if (shortcutKey === 1) return exclude ? "genre_exclude" : "genre_include";
	if (shortcutKey === 2)
		return exclude ? "sec_genre_exclude" : "sec_genre_include";
	return exclude ? "genre_either_exclude" : "genre_either_include";
}

function findShortcutLabel(input: HTMLInputElement): HTMLElement | null {
	const section = input.closest<HTMLElement>(SHORTCUT_SECTION_SELECTOR);
	return section?.querySelector<HTMLElement>(SHORTCUT_LABEL_SELECTOR) ?? null;
}

function insertShortcutHint(input: HTMLInputElement): void {
	const label = findShortcutLabel(input);
	if (!label || label.dataset.ebrHint) return;

	label.dataset.ebrHint = "1";
	label.insertAdjacentHTML(
		"beforeend",
		`<br>^1/2/3 top genre &nbsp;·&nbsp; ^D top descriptor &nbsp;·&nbsp; +Shift = exclude<span class="ebr-exclude-badge"></span><br>
		^\` toggle exclude mode`,
	);
}

function updateExcludeBadge(input: HTMLInputElement): void {
	const badge =
		findShortcutLabel(input)?.querySelector<HTMLElement>(".ebr-exclude-badge");
	if (badge) badge.textContent = excludeMode ? " [EXCL]" : "";
}

function resetInput(input: HTMLInputElement): void {
	input.value = "";
	excludeMode = false;
	updateExcludeBadge(input);
}

function updateChart(): void {
	runScript(`
		if (window.RYMchart && typeof window.RYMchart.onClickCreateChart === "function") {
			window.RYMchart.onClickCreateChart();
		}
	`);
}

function handleToggleExcludeMode(
	event: KeyboardEvent,
	input: HTMLInputElement,
): boolean {
	if (event.key !== "`" || !event.ctrlKey) return false;
	excludeMode = !excludeMode;
	updateExcludeBadge(input);
	return true;
}

function handleDescriptorShortcut(
	event: KeyboardEvent,
	input: HTMLInputElement,
): boolean {
	if (!event.ctrlKey || event.key.toLowerCase() !== "d") return false;

	const filterType =
		event.shiftKey || excludeMode ? "descriptor_exclude" : "descriptor_include";
	void applyNativeMatch("descriptor", filterType, input);
	return true;
}

function handleGenreShortcut(
	event: KeyboardEvent,
	input: HTMLInputElement,
): boolean {
	const digitMatch = /^Digit([123])$/.exec(event.code ?? "");
	if (!event.ctrlKey || !digitMatch) return false;

	const shortcutKey = Number.parseInt(digitMatch[1], 10) as 1 | 2 | 3;
	const filterType = genreFilterTypeFor(
		shortcutKey,
		event.shiftKey || excludeMode,
	);
	void applyNativeMatch("genre", filterType, input);
	return true;
}

function handleCtrlEnter(event: KeyboardEvent): boolean {
	if (event.key !== "Enter" || !event.ctrlKey) return false;
	updateChart();
	return true;
}

const KEY_HANDLERS = [
	handleToggleExcludeMode,
	handleDescriptorShortcut,
	handleGenreShortcut,
	handleCtrlEnter,
];

function onKeyDown(event: KeyboardEvent): void {
	const input = event.target as HTMLInputElement;
	for (const handler of KEY_HANDLERS) {
		if (!handler(event, input)) continue;
		event.preventDefault();
		event.stopPropagation();
		return;
	}
}

function patchRYMChartRemoval(): void {
	runScript(`
		(function () {
			var attempts = 0;
			var interval = setInterval(function () {
				attempts += 1;
				if (attempts > ${RYMCHART_PATCH_ATTEMPTS}) {
					clearInterval(interval);
					return;
				}
				var chart = window.RYMchart;
				if (!chart || typeof chart.removeBrowserItem !== "function") return;
				clearInterval(interval);
				var original = chart.removeBrowserItem.bind(chart);
				chart.removeBrowserItem = function () {
					var originalCreateChart = chart.onClickCreateChart;
					chart.onClickCreateChart = function () {};
					try {
						return original.apply(chart, arguments);
					} finally {
						chart.onClickCreateChart = originalCreateChart;
					}
				};
			}, ${RYMCHART_PATCH_INTERVAL_MS});
		})();
	`);
}

function mount(input: HTMLInputElement): void {
	insertShortcutHint(input);

	input.addEventListener("keydown", onKeyDown, true);

	document.addEventListener(
		"keydown",
		(event) => {
			if (
				event.key !== "Enter" ||
				!event.ctrlKey ||
				document.activeElement === input
			)
				return;
			event.preventDefault();
			event.stopPropagation();
			updateChart();
		},
		true,
	);

	patchRYMChartRemoval();
}
