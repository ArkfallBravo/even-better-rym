// ----------------------------------------------------------------------- //
//
// MODULE  : track-artists.ts
//
// PURPOSE : Per-track artist extraction from Apple Music's track-lockup script
//
// CREATED : 7/7/2026
//
// ----------------------------------------------------------------------- //

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
	typeof value === "object" && value !== null && !Array.isArray(value);

function readArtists(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((link: unknown) =>
		isObject(link) && typeof link.title === "string" ? [link.title] : [],
	);
}

export const findTrackLockupScriptText = (
	document_: Document,
): string | undefined =>
	[...document_.querySelectorAll("script")].find((script) =>
		script.text.includes("track-lockup"),
	)?.text;

// Parses the track-lockup script, or returns undefined if it's missing or
// isn't valid JSON.
function parseLockupScript(scriptText: string | undefined): unknown {
	if (scriptText === undefined) {
		return undefined;
	}
	try {
		return JSON.parse(scriptText);
	} catch (error) {
		if (!(error instanceof SyntaxError)) {
			throw error;
		}
		console.warn(
			"EvenBetterRYM: could not read Apple Music track artists",
			error,
		);
		return undefined;
	}
}

// Returns the elements of an array or the values of an object, in order.
function getChildValues(value: unknown): unknown[] {
	if (Array.isArray(value)) {
		return value;
	}
	if (isObject(value)) {
		return Object.values(value);
	}
	return [];
}

// Returns the artists in the first subtitleLinks array within value, in
// document order, or undefined if there is none.
function findFirstSubtitleArtists(value: unknown): string[] | undefined {
	if (isObject(value) && Array.isArray(value.subtitleLinks)) {
		return readArtists(value.subtitleLinks);
	}
	for (const child of getChildValues(value)) {
		const names = findFirstSubtitleArtists(child);
		if (names !== undefined) {
			return names;
		}
	}
	return undefined;
}

// Returns the artist names in the album header, the script's first
// subtitleLinks array. Recommended albums further down carry their own.
export const getAlbumHeaderArtists = (
	scriptText: string | undefined,
): string[] => findFirstSubtitleArtists(parseLockupScript(scriptText)) ?? [];

// Lockups are in album order; trackNumber alone is not unique across discs.
export const getTrackArtists = (
	scriptText: string | undefined,
): Map<number, string[]> => {
	const artists = new Map<number, string[]>();
	const data = parseLockupScript(scriptText);
	if (data === undefined) {
		return artists;
	}
	let position = 0;
	const visit = (value: unknown): void => {
		if (Array.isArray(value)) {
			value.forEach(visit);
		} else if (isObject(value)) {
			if (typeof value.trackNumber === "number") {
				position += 1;
				const names = readArtists(value.subtitleLinks);
				if (names.length > 0) artists.set(position, names);
				return;
			}
			Object.values(value).forEach(visit);
		}
	};
	visit(data);
	return artists;
};
