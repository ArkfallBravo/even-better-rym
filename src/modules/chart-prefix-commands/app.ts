import { waitForElement } from "~/shared/utils/dom";

import type { RYMChartApi } from "./types";

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

type PrefixDefinition = {
	filterType: FilterType;
	scope: Scope;
	label: string;
};

type PrefixCommand = PrefixDefinition & {
	prefix: string;
	query: string;
};

type BrowseResult = {
	display_name?: string;
	name?: string;
	component?: string;
	path?: string;
	assoc_id?: number;
};

const PREFIX_DEFINITIONS: Record<string, PrefixDefinition> = {
	"+g": { filterType: "genre_include", scope: "genre", label: "Include genre" },
	"-g": { filterType: "genre_exclude", scope: "genre", label: "Exclude genre" },
	"+i": {
		filterType: "sec_genre_include",
		scope: "genre",
		label: "Include influence",
	},
	"-i": {
		filterType: "sec_genre_exclude",
		scope: "genre",
		label: "Exclude influence",
	},
	"+gi": {
		filterType: "genre_either_include",
		scope: "genre",
		label: "Include as genre or influence",
	},
	"-gi": {
		filterType: "genre_either_exclude",
		scope: "genre",
		label: "Exclude as genre or influence",
	},
	"+d": {
		filterType: "descriptor_include",
		scope: "descriptor",
		label: "Include descriptor",
	},
	"-d": {
		filterType: "descriptor_exclude",
		scope: "descriptor",
		label: "Exclude descriptor",
	},
};

const CONTAINER_ID = "ui_browser_list_contents_page_charts_settings";
const LIST_ID = "ui_browser_list_page_charts_settings";
const INPUT_ID = "ui_browser_input_page_charts_settings";
const BROWSE_ENDPOINT = "/api/1/browse/music/";
const DEBOUNCE_MS = 180;
const MAX_SUGGESTIONS = 12;
const RYMCHART_PATCH_ATTEMPTS = 20;
const RYMCHART_PATCH_INTERVAL_MS = 200;

let suggestions: BrowseResult[] = [];
let activeIndex = 0;
let currentCommand: PrefixCommand | null = null;
let excludeMode = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const suggestionCache = new Map<string, Promise<BrowseResult[]>>();

export async function main(): Promise<void> {
	const input = await waitForElement<HTMLInputElement>(`#${INPUT_ID}`);
	mount(input);
}

function parsePrefixCommand(text: string): PrefixCommand | null {
	const match = /^([+-](?:gi|g|i|d))(?:\s+(.*))?$/i.exec(text);
	if (!match) return null;

	const definition = PREFIX_DEFINITIONS[match[1].toLowerCase()];
	if (!definition) return null;

	return {
		...definition,
		prefix: match[1].toLowerCase(),
		query: (match[2] ?? "").trim(),
	};
}

function resultComponent(result: BrowseResult): string {
	return result.component ?? (result.path ?? "").split("/")[0];
}

function matchesScope(result: BrowseResult, scope: Scope): boolean {
	if (typeof result.component === "string") return result.component === scope;
	if (typeof result.path === "string")
		return result.path.startsWith(`${scope}/`);
	return false;
}

function fetchSuggestions(
	query: string,
	scope: Scope | "all",
): Promise<BrowseResult[]> {
	const cacheKey = `${scope}:${query.toLowerCase().trim()}`;
	const cached = suggestionCache.get(cacheKey);
	if (cached) return cached;

	const url = new URL(BROWSE_ENDPOINT, globalThis.location.origin);
	url.searchParams.set("q", query);
	url.searchParams.set("component", "");

	const request = fetch(url.toString(), { credentials: "include" })
		.then((response) => response.json())
		.then((data: { results?: BrowseResult[] }) => {
			const results = data.results ?? [];
			const filtered =
				scope === "all"
					? results.slice(0, MAX_SUGGESTIONS)
					: results.filter((result) => matchesScope(result, scope));
			return filtered.slice(0, MAX_SUGGESTIONS);
		})
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

	const chart = window.RYMchart;
	if (!chart) return;

	const originalCreateChart = chart.onClickCreateChart;
	chart.onClickCreateChart = () => {};
	try {
		chart.addBrowserItem(filterType, id, name);
	} finally {
		chart.onClickCreateChart = originalCreateChart;
	}
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

function renderHint(): void {
	const container = getContainer();
	if (!container) return;

	container.innerHTML = `
		<div class="ui_browser_list_item ui_browser_list_item_category">
			<div class="ui_browser_list_item_category_title">Chart filter shortcuts</div>
			<div class="ui_browser_list_item_category_description">
				Type to search &nbsp;·&nbsp;
				^1/2/3 top genre &nbsp;·&nbsp; ^D top descriptor &nbsp;·&nbsp; +Shift = exclude<br>
				^\` toggle exclude mode &nbsp;·&nbsp; Prefix: +g −g &nbsp;+i −i &nbsp;+gi −gi &nbsp;+d −d
			</div>
		</div>`;
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

function renderPrefixMode(
	container: HTMLElement,
	command: PrefixCommand,
): void {
	if (!command.query) {
		container.innerHTML = `<div class="ui_browser_list_item ui_browser_list_item_category">
			<div class="ui_browser_list_item_category_title">${escapeHtml(command.prefix)} …</div>
			<div class="ui_browser_list_item_category_description">${escapeHtml(command.label)} — type to search</div>
		</div>`;
		return;
	}

	if (!suggestions.length) {
		container.innerHTML = `<div class="ui_browser_list_item ui_browser_list_item_category">
			<div class="ui_browser_list_item_category_title">No matches</div>
			<div class="ui_browser_list_item_category_description">${escapeHtml(command.label)}</div>
		</div>`;
		return;
	}

	container.innerHTML = suggestions
		.map((result, index) =>
			suggestionRow(index, result.display_name ?? result.name ?? ""),
		)
		.join("");
	bindSuggestionClicks(container, (index) => {
		applyItem(command.filterType, suggestions[index]);
		resetInput();
	});
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

	if (currentCommand) {
		renderPrefixMode(container, currentCommand);
	} else {
		renderFreeMode(container);
	}
}

function resetInput(): void {
	const input = document.getElementById(INPUT_ID) as HTMLInputElement | null;
	if (input) input.value = "";
	currentCommand = null;
	suggestions = [];
	activeIndex = 0;
	excludeMode = false;
	renderHint();
}

function leavePrefixMode(): void {
	currentCommand = null;
	suggestions = [];
	activeIndex = 0;
}

function scheduleSearch(
	query: string,
	scope: Scope | "all",
	stillValid: () => boolean,
): void {
	if (debounceTimer) clearTimeout(debounceTimer);
	render();
	debounceTimer = setTimeout(() => {
		void fetchSuggestions(query, scope).then((results) => {
			if (!stillValid()) return;
			suggestions = results;
			activeIndex = 0;
			render();
		});
	}, DEBOUNCE_MS);
}

function handlePrefixInput(command: PrefixCommand): void {
	currentCommand = command;
	activeIndex = 0;
	showList();
	if (!command.query) {
		suggestions = [];
		render();
		return;
	}
	scheduleSearch(
		command.query,
		command.scope,
		() =>
			currentCommand?.prefix === command.prefix &&
			currentCommand?.query === command.query,
	);
}

function handleFreeInput(input: HTMLInputElement): void {
	if (currentCommand !== null) leavePrefixMode();

	const query = input.value.trim();
	if (!query) {
		suggestions = [];
		renderHint();
		return;
	}

	showList();
	scheduleSearch(query, "all", () => input.value.trim() === query);
}

function onInput(event: Event): void {
	const input = event.target as HTMLInputElement;
	const command = parsePrefixCommand(input.value);

	if (command) {
		handlePrefixInput(command);
	} else {
		handleFreeInput(input);
	}
}

function updateChart(): void {
	const chart = window.RYMchart;
	chart?.onClickCreateChart();
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

	if (currentCommand && suggestions.length) {
		applyItem(currentCommand.filterType, suggestions[activeIndex]);
		resetInput();
	}
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

function handlePlainEnter(event: KeyboardEvent): boolean {
	if (event.key !== "Enter" || !currentCommand || !suggestions.length)
		return false;
	applyItem(currentCommand.filterType, suggestions[activeIndex]);
	resetInput();
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
	handlePlainEnter,
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

function suppressChartReloadOnRemove(chart: RYMChartApi): void {
	const original = chart.removeBrowserItem.bind(chart);
	chart.removeBrowserItem = (...args: unknown[]) => {
		const originalCreateChart = chart.onClickCreateChart;
		chart.onClickCreateChart = () => {};
		try {
			return original(...args);
		} finally {
			chart.onClickCreateChart = originalCreateChart;
		}
	};
}

function patchRYMChartRemoval(): void {
	let attempts = 0;
	const interval = setInterval(() => {
		attempts += 1;
		if (attempts > RYMCHART_PATCH_ATTEMPTS) {
			clearInterval(interval);
			return;
		}
		const chart = window.RYMchart;
		if (!chart) return;
		clearInterval(interval);
		suppressChartReloadOnRemove(chart);
	}, RYMCHART_PATCH_INTERVAL_MS);
}

function observeContainerOverwrites(container: HTMLElement): void {
	new MutationObserver(() => {
		if (!container.querySelector('[id^="ui_browser_list_item__"]')) return;
		if (currentCommand !== null || suggestions.length) {
			render();
		} else {
			renderHint();
		}
	}).observe(container, { childList: true, subtree: true });
}

function suppressNativeKeyUp(input: HTMLInputElement): void {
	const originalKeyUp = input.onkeyup;
	input.onkeyup = function (this: GlobalEventHandlers, event: KeyboardEvent) {
		if (input.value.trim() || currentCommand !== null) return;
		originalKeyUp?.call(this, event);
	};
}

function suppressNativeBlur(input: HTMLInputElement): void {
	const originalBlur = input.onblur;
	input.onblur = function (this: GlobalEventHandlers, event: FocusEvent) {
		hideList();
		if (currentCommand !== null || suggestions.length) return;
		originalBlur?.call(this, event);
	};
}

function overrideNativeFocus(input: HTMLInputElement): void {
	input.onfocus = () => {
		showList();
		if (suggestions.length) {
			render();
		} else {
			renderHint();
		}
	};
}

function mount(input: HTMLInputElement): void {
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
