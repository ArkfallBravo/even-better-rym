// ----------------------------------------------------------------------- //
//
// MODULE  : title-match.ts
//
// PURPOSE : Rules for whether a Spotify result's title matches a search
//
// CREATED : 11/10/2026
//
// ----------------------------------------------------------------------- //

import {
	isReissueTitle,
	normalizeSearchText,
} from "~/shared/services/search-matching";

import type { SearchInput } from "./messages";

const EDITION_SUFFIX =
	/^(?:(?:\s*(?:\(|\[)|\s+[-–—]\s+)\s*(?:(?:\d{4}\s+)?remaster(?:ed)?(?:\s+(?:version|\d{4}))?|deluxe(?:\s+(?:edition|version))?)(?:\)|\])?)+$/;
const VIDEO_SUFFIX =
	/^(?:\s*(?:\(|\[|-\s+)\s*(?:official\s+)?(?:music\s+)?video(?:\)|\])?)$/;

export type TitleMatch = "exact" | "edition";
export type TitleQuery = Pick<SearchInput, "title"> & {
	releaseType?: SearchInput["releaseType"] | null;
};

// Returns how spotifyTitle matches the searched title, or undefined if it doesn't.
export function matchTitle(
	spotifyTitle: string,
	query: TitleQuery,
): TitleMatch | undefined {
	const candidate = normalizeSearchText(spotifyTitle);
	const searched = normalizeSearchText(query.title);
	if (candidate === searched) {
		return "exact";
	}
	if (!candidate.startsWith(searched)) {
		return undefined;
	}
	const suffix = candidate.slice(searched.length);
	const isVideoSuffix =
		query.releaseType === "music video" && VIDEO_SUFFIX.test(suffix);
	const isEdition =
		EDITION_SUFFIX.test(suffix) ||
		isReissueTitle(candidate, searched) ||
		isVideoSuffix;
	return isEdition ? "edition" : undefined;
}
