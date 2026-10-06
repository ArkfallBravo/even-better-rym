// ----------------------------------------------------------------------- //
//
// MODULE  : track-artist-links.test.ts
//
// PURPOSE : Tests for the artist-link picker's grouping and tracklist rewrite
//
// CREATED : 10/1/2026
//
// ----------------------------------------------------------------------- //

import { describe, expect, test } from "vitest";

import {
	buildRelinkPlan,
	getDistinctTrackArtists,
	hasDifferingTrackArtists,
	hasSameMembers,
	mergeArtistLabels,
	relinkTracklistLines,
	removeLinkedPrefix,
	unlinkTracklistLines,
	withReleaseArtistFallback,
} from "./track-artist-links";

describe("withReleaseArtistFallback", () => {
	test("gives tracks with no artists the release's artists", () => {
		const tracks = [{ position: "1" }, { position: "2", artists: [] }];

		expect(withReleaseArtistFallback(tracks, ["A", "B"])).toEqual([
			{ position: "1", artists: ["A", "B"] },
			{ position: "2", artists: ["A", "B"] },
		]);
	});

	test("keeps a track's own artists", () => {
		const tracks = [{ position: "1", artists: ["C"] }];

		expect(withReleaseArtistFallback(tracks, ["A"])).toEqual(tracks);
	});
});

describe("hasSameMembers", () => {
	test("ignores order and repeats", () => {
		expect(hasSameMembers(["A", "B", "A"], ["B", "A"])).toBe(true);
	});

	test("notices a missing or extra member", () => {
		expect(hasSameMembers(["A"], ["A", "B"])).toBe(false);
		expect(hasSameMembers(["A", "C"], ["A"])).toBe(false);
	});
});

describe("hasDifferingTrackArtists", () => {
	test("is false when every track has the release's artists or none", () => {
		const tracks = [
			{ artists: ["A", "B"] },
			{ artists: ["B", "A"] },
			{ artists: [] },
			{},
		];

		expect(hasDifferingTrackArtists(tracks, ["A", "B"])).toBe(false);
	});

	test("is true when a track has an artist not on the release", () => {
		const tracks = [{ artists: ["A"] }, { artists: ["A", "C"] }];

		expect(hasDifferingTrackArtists(tracks, ["A"])).toBe(true);
	});

	test("is true when a track lacks one of the release's artists", () => {
		const tracks = [{ artists: ["A"] }];

		expect(hasDifferingTrackArtists(tracks, ["A", "B"])).toBe(true);
	});

	test("compares names exactly", () => {
		const tracks = [{ artists: ["tom schley"] }];

		expect(hasDifferingTrackArtists(tracks, ["Tom Schley"])).toBe(true);
	});
});

describe("mergeArtistLabels", () => {
	test("lets the user's picks override the release labels", () => {
		const releaseLabels = new Map([
			["A", "[Artist1]"],
			["B", "B"],
		]);
		const pickedLabels = new Map([["A", "[Artist2]"]]);

		expect(mergeArtistLabels(releaseLabels, pickedLabels)).toEqual(
			new Map([
				["A", "[Artist2]"],
				["B", "B"],
			]),
		);
	});
});

describe("getDistinctTrackArtists", () => {
	test("lists each artist once, in first-appearance order", () => {
		const tracks = [
			{ artists: ["A"] },
			{ artists: ["A", "B"] },
			{ artists: ["B", "C"] },
		];

		expect(getDistinctTrackArtists(tracks)).toEqual(["A", "B", "C"]);
	});

	test("returns nothing when no track has artists", () => {
		expect(getDistinctTrackArtists([{}])).toEqual([]);
	});
});

describe("buildRelinkPlan", () => {
	test("maps each track's artists to their picked labels in track order", () => {
		const tracks = [
			{ position: "1", artists: ["A"] },
			{ position: "2", artists: ["B", "A"] },
		];
		const labels = new Map([
			["A", "[Artist1]"],
			["B", "[Artist2]"],
		]);

		expect(buildRelinkPlan(tracks, labels)).toEqual(
			new Map([
				["1", ["[Artist1]"]],
				["2", ["[Artist2]", "[Artist1]"]],
			]),
		);
	});

	test("falls back to the plain name for an artist with no label", () => {
		const tracks = [{ position: "1", artists: ["A", "B"] }];
		const labels = new Map([["A", "[Artist1]"]]);

		expect(buildRelinkPlan(tracks, labels)).toEqual(
			new Map([["1", ["[Artist1]", "B"]]]),
		);
	});

	test("skips tracks with no position", () => {
		expect(buildRelinkPlan([{ artists: ["A"] }], new Map())).toEqual(new Map());
	});
});

describe("relinkTracklistLines", () => {
	test("prefixes only the planned tracks' titles", () => {
		const text = "1|First|3:00\n2|Second|4:00\n3|Third|";
		const plan = new Map([
			["1", ["[Artist1]"]],
			["3", ["[Artist1]", "Plain"]],
		]);

		expect(relinkTracklistLines(text, plan)).toBe(
			"1|[Artist1] - First|3:00\n2|Second|4:00\n3|[Artist1] & Plain - Third|",
		);
	});

	test("leaves blank and malformed lines untouched", () => {
		const text = "1|First|3:00\n\nno separators\n";
		const plan = new Map([["1", ["[Artist1]"]]]);

		expect(relinkTracklistLines(text, plan)).toBe(
			"1|[Artist1] - First|3:00\n\nno separators\n",
		);
	});

	test("matches positions with surrounding whitespace", () => {
		const plan = new Map([["1", ["[Artist1]"]]]);

		expect(relinkTracklistLines(" 1 |First|3:00", plan)).toBe(
			" 1 |[Artist1] - First|3:00",
		);
	});
});

describe("removeLinkedPrefix", () => {
	test("removes the labels' exact prefix", () => {
		expect(
			removeLinkedPrefix("[Artist1] & Plain - Title", ["[Artist1]", "Plain"]),
		).toBe("Title");
	});

	test("leaves a title without that prefix untouched", () => {
		expect(removeLinkedPrefix("Edited - Title", ["[Artist1]"])).toBe(
			"Edited - Title",
		);
	});
});

describe("unlinkTracklistLines", () => {
	test("undoes relinkTracklistLines so a new plan can be applied", () => {
		const text = "1|First|3:00\n2|Second|4:00";
		const oldPlan = new Map([["1", ["Plain"]]]);
		const newPlan = new Map([["1", ["[Artist1]"]]]);
		const linked = relinkTracklistLines(text, oldPlan);

		expect(
			relinkTracklistLines(unlinkTracklistLines(linked, oldPlan), newPlan),
		).toBe("1|[Artist1] - First|3:00\n2|Second|4:00");
	});
});
