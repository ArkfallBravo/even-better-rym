export const TRACK_NUMBER_REGEX = /"trackNumber":(\d+)/g;
const SUBTITLE_TITLE_REGEX = /"subtitleLinks":\[\{"title":"([^"]*)"/;

const findEnclosingObjectEnd = (text: string, startIndex: number): number => {
	let depth = 0;
	for (let i = startIndex; i < text.length; i++) {
		if (text[i] === "{") depth += 1;
		else if (text[i] === "}") {
			depth -= 1;
			if (depth < 0) return i;
		}
	}
	return text.length;
};

export const extractTrackArtist = (
	scriptText: string,
	trackNumberMatch: RegExpMatchArray,
): string | undefined => {
	if (trackNumberMatch.index === undefined) return undefined;

	const objectStart = trackNumberMatch.index + trackNumberMatch[0].length;
	const objectEnd = findEnclosingObjectEnd(scriptText, objectStart);
	const trackObjectText = scriptText.slice(objectStart, objectEnd);
	return SUBTITLE_TITLE_REGEX.exec(trackObjectText)?.[1];
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
): Map<number, string> => {
	const map = new Map<number, string>();
	if (scriptText === undefined) return map;
	for (const match of scriptText.matchAll(TRACK_NUMBER_REGEX)) {
		const trackNum = Number.parseInt(match[1], 10);
		if (map.has(trackNum)) continue;
		const artist = extractTrackArtist(scriptText, match);
		if (artist !== undefined) map.set(trackNum, artist);
	}
	return map;
};
