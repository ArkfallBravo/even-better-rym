// ----------------------------------------------------------------------- //
//
// MODULE  : artist-shortcuts.ts
//
// PURPOSE : [ArtistNNNN] token building and track-title artist list joining
//
// CREATED : 8/23/2026
//
// ----------------------------------------------------------------------- //

import { arrayToArtists } from "~/shared/utils/string";

const TRACK_TITLE_ID_PATTERN = /^track_track_title\d+$/;
const ARTIST_SEPARATOR = " - ";
const ARTIST_LIST_DELIMITER = /\s*&\s*|\s*,\s*/;
const ARTIST_LINK_PATTERN = /\[Artist\d+]/;

export const isTrackTitleFieldId = (id: string): boolean =>
	TRACK_TITLE_ID_PATTERN.test(id);

export const buildArtistToken = (assocId: string, text?: string): string =>
	text ? `[Artist${assocId},${text}]` : `[Artist${assocId}]`;

// Returns the title prefixed with its artist labels, joined RYM-style.
export const buildLinkedTitle = (title: string, labels: string[]): string =>
	`${arrayToArtists([...labels])}${ARTIST_SEPARATOR}${title}`;

// Appends artistToken to the field's existing linked artist list (if any),
// leaving the track name and any unlinked artist text untouched.
export const insertArtistShortcut = (
	currentValue: string,
	artistToken: string,
): string => {
	const separatorIndex = currentValue.indexOf(ARTIST_SEPARATOR);
	const artistListPart =
		separatorIndex === -1
			? currentValue
			: currentValue.slice(0, separatorIndex);

	// No existing [ArtistXXXX] link before the separator: nothing to parse or
	// join, so the whole field is treated as the track name.
	if (!ARTIST_LINK_PATTERN.test(artistListPart)) {
		return buildLinkedTitle(currentValue, [artistToken]);
	}

	const trackNamePart = currentValue.slice(
		separatorIndex + ARTIST_SEPARATOR.length,
	);
	const artists = artistListPart
		.split(ARTIST_LIST_DELIMITER)
		.filter((artist) => artist.length > 0);
	artists.push(artistToken);

	return buildLinkedTitle(trackNamePart, artists);
};
