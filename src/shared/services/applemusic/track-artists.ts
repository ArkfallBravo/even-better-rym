// ----------------------------------------------------------------------- //
//
// MODULE  : track-artists.ts
//
// PURPOSE : Per-track artist extraction from Apple Music's track-lockup script
//
// CREATED : 7/7/2026
//
// ----------------------------------------------------------------------- //

export const TRACK_NUMBER_REGEX = /"trackNumber":(\d+)/g;
const SUBTITLE_LINKS_KEY = '"subtitleLinks":[';

type SubtitleLink = { title?: string };

// Returns the index of the first bracket closing one opened before
// startIndex, skipping brackets inside JSON strings, or -1 if there is none.
const findUnmatchedCloseIndex = (text: string, startIndex: number): number => {
	let depth = 0;
	let inString = false;
	for (let i = startIndex; i < text.length; i++) {
		const char = text[i];
		if (inString) {
			if (char === "\\") {
				i += 1;
			} else if (char === '"') {
				inString = false;
			}
			continue;
		}
		if (char === '"') {
			inString = true;
		} else if (char === "[" || char === "{") {
			depth += 1;
		} else if (char === "]" || char === "}") {
			depth -= 1;
			if (depth < 0) return i;
		}
	}
	return -1;
};

// Returns the index of the brace closing the object startIndex is inside, or
// the text's length if it's never closed.
const findEnclosingObjectEnd = (text: string, startIndex: number): number => {
	const closeIndex = findUnmatchedCloseIndex(text, startIndex);
	return closeIndex === -1 ? text.length : closeIndex;
};

// Returns the index just past the bracket closing the one at openIndex, or
// -1 if it's never closed.
const findMatchingBracketEnd = (text: string, openIndex: number): number => {
	const closeIndex = findUnmatchedCloseIndex(text, openIndex + 1);
	return closeIndex === -1 ? -1 : closeIndex + 1;
};

// Returns every artist name in the text's first subtitleLinks array.
const parseSubtitleLinkTitles = (trackObjectText: string): string[] => {
	const keyIndex = trackObjectText.indexOf(SUBTITLE_LINKS_KEY);
	if (keyIndex === -1) return [];

	const arrayStart = keyIndex + SUBTITLE_LINKS_KEY.length - 1;
	const arrayEnd = findMatchingBracketEnd(trackObjectText, arrayStart);
	if (arrayEnd === -1) return [];

	const links = JSON.parse(
		trackObjectText.slice(arrayStart, arrayEnd),
	) as SubtitleLink[];
	return links
		.map((link) => link.title)
		.filter((title): title is string => title !== undefined);
};

// Returns the artist names in the album header, the script's first
// subtitleLinks array.
export const getAlbumHeaderArtists = (scriptText: string): string[] =>
	parseSubtitleLinkTitles(scriptText);

export const extractTrackArtists = (
	scriptText: string,
	trackNumberMatch: RegExpMatchArray,
): string[] => {
	if (trackNumberMatch.index === undefined) return [];

	const objectStart = trackNumberMatch.index + trackNumberMatch[0].length;
	const objectEnd = findEnclosingObjectEnd(scriptText, objectStart);
	const trackObjectText = scriptText.slice(objectStart, objectEnd);
	return parseSubtitleLinkTitles(trackObjectText);
};

export const findTrackLockupScriptText = (
	document_: Document,
): string | undefined => {
	for (const script of document_.querySelectorAll("script")) {
		if (script.text.includes("track-lockup")) return script.text;
	}
	return undefined;
};

export const getTrackArtists = (
	scriptText: string | undefined,
): Map<number, string[]> => {
	const map = new Map<number, string[]>();
	if (scriptText === undefined) return map;
	for (const match of scriptText.matchAll(TRACK_NUMBER_REGEX)) {
		const trackNum = Number.parseInt(match[1], 10);
		if (map.has(trackNum)) continue;
		const artists = extractTrackArtists(scriptText, match);
		if (artists.length > 0) map.set(trackNum, artists);
	}
	return map;
};
