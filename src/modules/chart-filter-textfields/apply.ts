import { runScript } from "~/shared/utils/dom";

export type FilterType =
	| "genre_include"
	| "genre_exclude"
	| "sec_genre_include"
	| "sec_genre_exclude"
	| "genre_either_include"
	| "genre_either_exclude"
	| "descriptor_include"
	| "descriptor_exclude";

// Pushes items into the chart filter state via `RYMchart.addBrowserItem` and
// then fires `RYMchart.onClickCreateChart` to refresh the chart — both live
// on `window` in the page's main world, so we inject a script tag.
export const applyToChartAndUpdate = (
	items: { filterType: FilterType; path: string; name: string }[],
): void => {
	const payload = JSON.stringify(items);
	runScript(`(function(){
		var items = ${payload};
		if (typeof window.RYMchart !== 'undefined' && typeof window.RYMchart.addBrowserItem === 'function') {
			for (var i = 0; i < items.length; i++) {
				try { window.RYMchart.addBrowserItem(items[i].filterType, items[i].path, items[i].name); }
				catch (e) { console.error('ebr addBrowserItem failed', e); }
			}
		}
		if (typeof window.RYMchart !== 'undefined' && typeof window.RYMchart.onClickCreateChart === 'function') {
			try { window.RYMchart.onClickCreateChart(); }
			catch (e) { console.error('ebr onClickCreateChart failed', e); }
		}
	})();`);
};
