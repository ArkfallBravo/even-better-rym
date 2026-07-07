import { describe, expect, test } from "vitest";

import { convertAppleMusicDuration } from "./convert";
import { extractTrackArtist, TRACK_NUMBER_REGEX } from "./track-artists";

describe("convertAppleMusicDuration", () => {
	const cases = [
		["PT3M14S", "3:14"],
		["PT3M", "3:00"],
		["PT14S", "0:14"],
	];

	test.each(cases)("converts %s to %s", (input, output) => {
		expect(convertAppleMusicDuration(input)).toEqual(output);
	});
});

describe("extractTrackArtist", () => {
	test("extracts the artist within the track's own object", () => {
		const scriptText =
			'{"trackNumber":1,"subtitleLinks":[{"title":"Artist A"}],"other":"x"},' +
			'{"trackNumber":2,"subtitleLinks":[{"title":"Artist B"}],"other":"y"}';
		const matches = [...scriptText.matchAll(TRACK_NUMBER_REGEX)];

		expect(extractTrackArtist(scriptText, matches[0])).toBe("Artist A");
		expect(extractTrackArtist(scriptText, matches[1])).toBe("Artist B");
	});

	test("handles nested objects between trackNumber and subtitleLinks", () => {
		const scriptText =
			'{"trackNumber":1,"contentDescriptor":{"kind":"song","identifiers":' +
			'{"storeAdamID":"1"}},"subtitleLinks":[{"title":"Artist A"}]}';
		const [match] = scriptText.matchAll(TRACK_NUMBER_REGEX);

		expect(extractTrackArtist(scriptText, match)).toBe("Artist A");
	});

	test("does not leak into unrelated content when a track has no subtitleLinks", () => {
		// Regression: the final track had "subtitleLinks":null with no next
		// trackNumber to bound the search, so the old lazy-match regex matched an
		// unrelated "subtitleLinks" entry from a later section of the script
		// instead of correctly finding nothing.
		const scriptText =
			'{"trackNumber":1,"subtitleLinks":[{"title":"Artist A"}]},' +
			'{"trackNumber":2,"subtitleLinks":null},' +
			'"recommendations":{"subtitleLinks":[{"title":"2020"}]}';
		const matches = [...scriptText.matchAll(TRACK_NUMBER_REGEX)];

		expect(extractTrackArtist(scriptText, matches[0])).toBe("Artist A");
		expect(extractTrackArtist(scriptText, matches[1])).toBeUndefined();
	});
});
