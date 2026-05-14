import { render } from "preact";

import { waitForElement } from "~/shared/utils/dom";

import type { FilterType } from "./apply";
import { applyToChartAndUpdate } from "./apply";
import type { FieldRef, Pill } from "./ChartFilterField";
import { ChartFilterField } from "./ChartFilterField";
import { tokenize } from "./tokenize";

type FieldConfig = {
	filterType: FilterType;
	scope: "genre" | "descriptor";
	label: string;
};

const FIELDS: FieldConfig[] = [
	{ filterType: "genre_include", scope: "genre", label: "Include genres" },
	{
		filterType: "sec_genre_include",
		scope: "genre",
		label: "Include influences",
	},
	{
		filterType: "genre_either_include",
		scope: "genre",
		label: "Include as either genre or influence",
	},
	{
		filterType: "descriptor_include",
		scope: "descriptor",
		label: "Include descriptors",
	},
	{ filterType: "genre_exclude", scope: "genre", label: "Exclude genres" },
	{
		filterType: "sec_genre_exclude",
		scope: "genre",
		label: "Exclude influences",
	},
	{
		filterType: "genre_either_exclude",
		scope: "genre",
		label: "Exclude as either genre or influence",
	},
	{
		filterType: "descriptor_exclude",
		scope: "descriptor",
		label: "Exclude descriptors",
	},
];

const hideOriginalBrowser = () => {
	const browser = document.getElementById(
		"ui_browser_outer_page_charts_settings",
	);
	if (browser) browser.style.display = "none";

	// Also hide the "Filter this chart by genre, country, language..." label that
	// sits next to the original browser, since it advertised the unified search.
	const labels = document.querySelectorAll<HTMLElement>(
		".page_chart_query_free_section_label",
	);
	for (const label of labels) {
		if (label.textContent?.includes("Filter this chart by genre, country")) {
			label.style.display = "none";
		}
	}
};

const collectItems = async (
	refs: Map<FilterType, FieldRef>,
): Promise<{ filterType: FilterType; path: string; name: string }[]> => {
	const items: { filterType: FilterType; path: string; name: string }[] = [];

	for (const [filterType, ref] of refs.entries()) {
		const scope = FIELDS.find((f) => f.filterType === filterType)?.scope;
		if (!scope) continue;

		for (const pill of ref.getPills()) {
			if (pill.kind === "confirmed") {
				items.push({ filterType, path: pill.path, name: pill.name });
			}
		}

		const raw = ref.getRawText();
		if (raw.trim().length > 0) {
			// eslint-disable-next-line no-await-in-loop
			const { matched } = await tokenize(raw, scope);
			for (const m of matched) {
				const name = (m.display_name ?? m.name ?? "") as string;
				const path = (m.path as string | undefined) ?? "";
				if (name && path) items.push({ filterType, path, name });
			}
		}

		ref.clear();
	}

	return items;
};

const findUpdateButton = (): HTMLElement | null =>
	document.getElementById("page_chart_query_create_btn");

const hasPending = (refs: Map<FilterType, FieldRef>): boolean => {
	for (const ref of refs.values()) {
		if (ref.getRawText().trim().length > 0) return true;
		if (ref.getPills().some((p: Pill) => p.kind === "pending")) return true;
		if (ref.getPills().some((p: Pill) => p.kind === "confirmed")) return true;
	}
	return false;
};

export const main = async () => {
	// Wait until at least one section is present; confirms we're on a chart page
	// with the filter sidebar.
	await waitForElement("#page_chart_query_free_section_items_genre_include");

	hideOriginalBrowser();

	// Mount one panel right before the unified search location (if present),
	// otherwise after the last filter-items div so it sits in roughly the same
	// place.
	const browser = document.getElementById(
		"ui_browser_outer_page_charts_settings",
	);
	const mount = document.createElement("div");
	mount.id = "ebr-cft-panel-mount";
	mount.className = "ebr-cft-panel";
	if (browser?.parentElement) {
		browser.parentElement.insertBefore(mount, browser);
	} else {
		const fallback = document.querySelector(
			".page_chart_query_free_section_new",
		);
		fallback?.append(mount);
	}

	const refs = new Map<FilterType, FieldRef>();

	render(
		<>
			{FIELDS.map((config) => (
				<ChartFilterField
					key={config.filterType}
					filterType={config.filterType}
					scope={config.scope}
					label={config.label}
					registerRef={(ref) => refs.set(config.filterType, ref)}
				/>
			))}
		</>,
		mount,
	);

	const updateButton = findUpdateButton();
	if (updateButton) {
		updateButton.addEventListener(
			"click",
			(event) => {
				if (!hasPending(refs)) return;

				// Block the page's own handler so it doesn't fire with stale state;
				// we will call RYMchart.onClickCreateChart() ourselves after we've
				// pushed the new items into the chart filter.
				event.preventDefault();
				event.stopImmediatePropagation();

				void (async () => {
					try {
						const items = await collectItems(refs);
						applyToChartAndUpdate(items);
					} catch (error) {
						console.error("ebr chart-filter-textfields:", error);
						// Even if tokenization broke, still update the chart with what
						// we have so the user's other sidebar changes aren't lost.
						applyToChartAndUpdate([]);
					}
				})();
			},
			true,
		);
	}
};
