// ----------------------------------------------------------------------- //
//
// MODULE  : categories.ts
//
// PURPOSE : Which Spotify search categories to try for a release type
//
// CREATED : 11/10/2026
//
// ----------------------------------------------------------------------- //

import type { SearchCategory, SearchInput } from "./messages";

// Returns the Spotify categories to search, in order, for a release type.
export function searchCategories(
	releaseType: SearchInput["releaseType"],
): SearchCategory[] {
	if (releaseType === "music video") {
		return ["tracks"];
	}
	if (releaseType === "single") {
		return ["albums", "tracks"];
	}
	return ["albums"];
}
