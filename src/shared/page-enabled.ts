// ----------------------------------------------------------------------- //
//
// MODULE  : page-enabled.ts
//
// PURPOSE : Resolving a feature's enabled state from stored settings
//
// CREATED : 10/2/2026
//
// ----------------------------------------------------------------------- //

import type { PageKey } from "./pages";

const defaultPageEnabled: Partial<Record<PageKey, boolean>> = {
	hideReviews: false,
	hideCommentBoxes: false,
	discogsCarousel: true,
};

const legacyGenreChartControlKeys = [
	"filmChartGenreLinks",
	"filmGenreChartButton",
	"genrePageChartControls",
] as const;

const getLegacyGenreChartControlsEnabled = (
	settings: Partial<Record<string, boolean>>,
): boolean =>
	legacyGenreChartControlKeys.every((key) => settings[key] !== false);

// Returns whether key is enabled in the stored settings, falling back to its
// default when it has never been set.
export const resolvePageEnabled = (
	settings: Partial<Record<string, boolean>>,
	key: PageKey,
): boolean => {
	const enabled = settings[key];
	if (enabled !== undefined) return enabled;

	if (key === "genreChartControls") {
		return getLegacyGenreChartControlsEnabled(settings);
	}

	return defaultPageEnabled[key] ?? true;
};
