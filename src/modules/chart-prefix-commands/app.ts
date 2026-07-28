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

const CONTAINER_ID = "ui_browser_list_contents_page_charts_settings";
const LIST_ID = "ui_browser_list_page_charts_settings";
const INPUT_ID = "ui_browser_input_page_charts_settings";
const BROWSE_ENDPOINT = "/api/1/browse/music/";
const DEBOUNCE_MS = 180;
const MAX_SUGGESTIONS = 12;
const RYMCHART_PATCH_ATTEMPTS = 20;
const RYMCHART_PATCH_INTERVAL_MS = 200;
const SHORTCUT_SECTION_SELECTOR = ".page_chart_query_free_section_new";
const SHORTCUT_LABEL_SELECTOR = ".page_chart_query_free_section_label";

let suggestions: BrowseResult[] = [];
let activeIndex = 0;
let excludeMode = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const suggestionCache = new Map<string, Promise<BrowseResult[]>>();

export async function main(): Promise<void> {
	const input = await waitForElement<HTMLInputElement>(`#${INPUT_ID}`);
	mount(input);
}

function resultComponent(result: BrowseResult): string {
	return result.component ?? (result.path ?? "").split("/")[0];
}

function fetchSuggestions(query: string): Promise<BrowseResult[]> {
	const cacheKey = query.toLowerCase().trim();
	const cached = suggestionCache.get(cacheKey);
	if (cached) return cached;

	const url = new URL(BROWSE_ENDPOINT, globalThis.location.origin);
	url.searchParams.set("q", query);
	url.searchParams.set("component", "");

	const request = fetch(url.toString(), { credentials: "include" })
		.then((response) => response.json())
		.then((data: { results?: BrowseResult[] }) =>
			(data.results ?? []).slice(0, MAX_SUGGESTIONS),
		)
		.catch(() => []);

	suggestionCache.set(cacheKey, request);
	return request;
}

function filterTypeFor(
	scope: Scope,
	shortcutKey: 1 | 2 | 3,
	exclude: boolean,
): FilterType | null {
	if (scope === "genre") {
		if (shortcutKey === 1) return exclude ? "genre_exclude" : "genre_include";
		if (shortcutKey === 2)
			return exclude ? "sec_genre_exclude" : "sec_genre_include";
		if (shortcutKey === 3)
			return exclude ? "genre_either_exclude" : "genre_either_include";
	}
	if (scope === "descriptor" && shortcutKey === 1) {
		return exclude ? "descriptor_exclude" : "descriptor_include";
	}
	return null;
}

function findFirstOfType(scope: Scope): BrowseResult | null {
	return (
		suggestions.find((result) => resultComponent(result) === scope) ?? null
	);
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

function escapeHtml(value: string): string {
	const entities: Record<string, string> = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#39;",
	};
	return value.replace(/[&<>"']/g, (character) => entities[character]);
}

function getContainer(): HTMLElement | null {
	return document.getElementById(CONTAINER_ID);
}

function showList(): void {
	const list = document.getElementById(LIST_ID);
	if (list) list.style.display = "block";
}

function hideList(): void {
	const list = document.getElementById(LIST_ID);
	if (list) list.style.display = "none";
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
		`<br>Type to search &nbsp;·&nbsp;
		^1/2/3 top genre &nbsp;·&nbsp; ^D top descriptor &nbsp;·&nbsp; +Shift = exclude<br>
		^\` toggle exclude mode`,
	);
}

function suggestionRow(
	index: number,
	label: string,
	typeLabel?: string,
): string {
	const activeClass = index === activeIndex ? " ebr-active" : "";
	const typeBadge = typeLabel
		? `<span class="ebr-type-badge">${typeLabel}</span>`
		: "";
	return `<div class="ui_browser_list_item ui_browser_list_item_category${activeClass}" data-ebr-idx="${index}">
		<div class="ui_browser_list_item_category_title">${escapeHtml(label)}${typeBadge}</div>
	</div>`;
}

function bindSuggestionClicks(
	container: HTMLElement,
	onSelect: (index: number) => void,
): void {
	for (const element of container.querySelectorAll<HTMLElement>(
		"[data-ebr-idx]",
	)) {
		element.addEventListener("mousedown", (event) => {
			event.preventDefault();
			onSelect(Number.parseInt(element.dataset.ebrIdx ?? "0", 10));
		});
	}
}

function freeModeHeader(): string {
	const exclusionBadge = excludeMode
		? ' <span class="ebr-exclude-badge">[EXCL]</span>'
		: "";
	return `<div class="ui_browser_list_item ui_browser_list_item_category">
		<div class="ui_browser_list_item_category_title">^1/2/3 top genre &nbsp;·&nbsp; ^D top descriptor &nbsp;·&nbsp; +Shift = exclude${exclusionBadge}</div>
		<div class="ui_browser_list_item_category_description">Tab to cycle &nbsp;·&nbsp; ^\` toggle exclude mode</div>
	</div>`;
}

function renderFreeMode(container: HTMLElement): void {
	if (!suggestions.length) return;

	const rows = suggestions
		.map((result, index) =>
			suggestionRow(
				index,
				result.display_name ?? result.name ?? "",
				result.component === "descriptor" ? "d" : "g",
			),
		)
		.join("");
	container.innerHTML = freeModeHeader() + rows;
	bindSuggestionClicks(container, (index) => {
		activeIndex = index;
		render();
	});
}

function render(): void {
	showList();
	const container = getContainer();
	if (!container) return;
	renderFreeMode(container);
}

function resetInput(): void {
	const input = document.getElementById(INPUT_ID) as HTMLInputElement | null;
	if (input) input.value = "";
	suggestions = [];
	activeIndex = 0;
	excludeMode = false;
	hideList();
}

function scheduleSearch(query: string, stillValid: () => boolean): void {
	if (debounceTimer) clearTimeout(debounceTimer);
	render();
	debounceTimer = setTimeout(() => {
		void fetchSuggestions(query).then((results) => {
			if (!stillValid()) return;
			suggestions = results;
			activeIndex = 0;
			render();
		});
	}, DEBOUNCE_MS);
}

function onInput(event: Event): void {
	const input = event.target as HTMLInputElement;
	const query = input.value.trim();
	if (!query) {
		suggestions = [];
		hideList();
		return;
	}

	showList();
	scheduleSearch(query, () => input.value.trim() === query);
}

function updateChart(): void {
	runScript(`
		if (window.RYMchart && typeof window.RYMchart.onClickCreateChart === "function") {
			window.RYMchart.onClickCreateChart();
		}
	`);
}

function handleToggleExcludeMode(event: KeyboardEvent): boolean {
	if (event.key !== "`" || !event.ctrlKey) return false;
	excludeMode = !excludeMode;
	render();
	return true;
}

function handleDescriptorShortcut(event: KeyboardEvent): boolean {
	if (!event.ctrlKey || event.key.toLowerCase() !== "d") return false;
	if (!suggestions.length) return true;

	const item = findFirstOfType("descriptor");
	if (!item) return true;

	const filterType =
		event.shiftKey || excludeMode ? "descriptor_exclude" : "descriptor_include";
	applyItem(filterType, item);
	resetInput();
	return true;
}

function handleGenreShortcut(event: KeyboardEvent): boolean {
	const digitMatch = /^Digit([123])$/.exec(event.code ?? "");
	if (!event.ctrlKey || !digitMatch) return false;
	if (!suggestions.length) return true;

	const item = findFirstOfType("genre");
	if (!item) return true;

	const shortcutKey = Number.parseInt(digitMatch[1], 10) as 1 | 2 | 3;
	const filterType = filterTypeFor(
		"genre",
		shortcutKey,
		event.shiftKey || excludeMode,
	);
	if (!filterType) return true;

	applyItem(filterType, item);
	resetInput();
	return true;
}

function handleCtrlEnter(event: KeyboardEvent): boolean {
	if (event.key !== "Enter" || !event.ctrlKey) return false;
	updateChart();
	return true;
}

function handleTabCycle(event: KeyboardEvent): boolean {
	if (event.key !== "Tab" || !suggestions.length) return false;
	activeIndex =
		(activeIndex + (event.shiftKey ? -1 : 1) + suggestions.length) %
		suggestions.length;
	render();
	return true;
}

function handleEscape(event: KeyboardEvent): boolean {
	if (event.key !== "Escape") return false;
	resetInput();
	return true;
}

const KEY_HANDLERS = [
	handleToggleExcludeMode,
	handleDescriptorShortcut,
	handleGenreShortcut,
	handleCtrlEnter,
	handleTabCycle,
	handleEscape,
];

function onKeyDown(event: KeyboardEvent): void {
	for (const handler of KEY_HANDLERS) {
		if (!handler(event)) continue;
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

function observeContainerOverwrites(container: HTMLElement): void {
	new MutationObserver(() => {
		if (!container.querySelector('[id^="ui_browser_list_item__"]')) return;
		if (suggestions.length) {
			render();
		} else {
			hideList();
		}
	}).observe(container, { childList: true, subtree: true });
}

function suppressNativeKeyUp(input: HTMLInputElement): void {
	const originalKeyUp = input.onkeyup;
	input.onkeyup = function (this: GlobalEventHandlers, event: KeyboardEvent) {
		if (input.value.trim()) return;
		originalKeyUp?.call(this, event);
	};
}

function suppressNativeBlur(input: HTMLInputElement): void {
	const originalBlur = input.onblur;
	input.onblur = function (this: GlobalEventHandlers, event: FocusEvent) {
		hideList();
		if (suggestions.length) return;
		originalBlur?.call(this, event);
	};
}

function overrideNativeFocus(input: HTMLInputElement): void {
	input.onfocus = () => {
		if (!suggestions.length) {
			hideList();
			return;
		}
		showList();
		render();
	};
}

function mount(input: HTMLInputElement): void {
	insertShortcutHint(input);
	suppressNativeKeyUp(input);
	overrideNativeFocus(input);
	suppressNativeBlur(input);

	input.addEventListener("input", onInput);
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

	const container = getContainer();
	if (container) observeContainerOverwrites(container);
}
