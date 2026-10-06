// ----------------------------------------------------------------------- //
//
// MODULE  : release-artist-links.test.ts
//
// PURPOSE : Tests for the release-artist picker's pairing and filed-under
//           list changes
//
// CREATED : 10/6/2026
//
// ----------------------------------------------------------------------- //

import { describe, expect, test } from "vitest";

import type { ReleaseArtistChoices } from "./release-artist-links";
import {
	getChosenEntries,
	getInheritableEntries,
	getReleaseArtistLabels,
	hasSameEntries,
	normalizeArtistName,
	orderFiledUnderIds,
	pairInheritedArtists,
	parseArtistTokenId,
	planFiledUnderChanges,
} from "./release-artist-links";

const ENTRY_A = { id: "1", name: "Beyoncé" };
const ENTRY_B = { id: "2", name: "AC/DC" };
const ENTRY_C = { id: "3", name: "Tom Schley" };

describe("parseArtistTokenId", () => {
	test("reads the id from an artist token", () => {
		expect(parseArtistTokenId(" [Artist67636] ")).toBe("67636");
	});

	test("ignores anything else", () => {
		expect(parseArtistTokenId("[Label12]")).toBeUndefined();
		expect(parseArtistTokenId("[Artist12,Name]")).toBeUndefined();
	});
});

describe("normalizeArtistName", () => {
	test("ignores case, accents, punctuation and spacing", () => {
		expect(normalizeArtistName("Beyoncé")).toBe(normalizeArtistName("beyonce"));
		expect(normalizeArtistName("AC/DC")).toBe(normalizeArtistName("ac dc"));
	});

	test("keeps letters from other scripts", () => {
		expect(normalizeArtistName("坂本 龍一")).toBe("坂本龍一");
	});

	test("falls back to lowercase for punctuation-only names", () => {
		expect(normalizeArtistName("!!!")).toBe("!!!");
	});
});

describe("pairInheritedArtists", () => {
	test("pairs loosely matching names with parent entries", () => {
		expect(
			pairInheritedArtists(["beyonce", "Someone"], [ENTRY_A, ENTRY_B]),
		).toEqual(new Map([["beyonce", { kind: "inherited", entry: ENTRY_A }]]));
	});

	test("uses each parent entry at most once", () => {
		const choices = pairInheritedArtists(["AC/DC", "ACDC"], [ENTRY_B]);

		expect([...choices.keys()]).toEqual(["AC/DC"]);
	});

	test("doesn't pair different names", () => {
		expect(pairInheritedArtists(["Thom Schley"], [ENTRY_C]).size).toBe(0);
	});
});

describe("getInheritableEntries", () => {
	test("leaves out entries inherited by other rows", () => {
		const choices: ReleaseArtistChoices = new Map([
			["A", { kind: "inherited", entry: ENTRY_A }],
			["B", { kind: "inherited", entry: ENTRY_B }],
		]);

		expect(
			getInheritableEntries([ENTRY_A, ENTRY_B, ENTRY_C], choices, "A"),
		).toEqual([ENTRY_A, ENTRY_C]);
	});
});

describe("getChosenEntries", () => {
	test("lists linked and inherited entries in row order, once each", () => {
		const choices: ReleaseArtistChoices = new Map([
			["C", { kind: "linked", entry: ENTRY_C }],
			["A", { kind: "inherited", entry: ENTRY_A }],
			["B", { kind: "skipped" }],
			["D", { kind: "linked", entry: ENTRY_A }],
		]);

		expect(getChosenEntries(["A", "B", "C", "D"], choices)).toEqual([
			ENTRY_A,
			ENTRY_C,
		]);
	});
});

describe("hasSameEntries", () => {
	test("ignores order", () => {
		expect(hasSameEntries([ENTRY_A, ENTRY_B], [ENTRY_B, ENTRY_A])).toBe(true);
	});

	test("notices a missing or extra artist", () => {
		expect(hasSameEntries([ENTRY_A], [ENTRY_A, ENTRY_B])).toBe(false);
		expect(hasSameEntries([ENTRY_A, ENTRY_C], [ENTRY_A])).toBe(false);
	});
});

describe("planFiledUnderChanges", () => {
	test("removes unchosen managed entries and adds missing chosen ones", () => {
		const changes = planFiledUnderChanges([ENTRY_A, ENTRY_B], {
			entries: [ENTRY_A, ENTRY_C],
			managedIds: new Set(["1", "2", "3"]),
		});

		expect(changes).toEqual({ remove: ["2"], add: [ENTRY_C] });
	});

	test("leaves entries it doesn't manage", () => {
		const changes = planFiledUnderChanges([ENTRY_B], {
			entries: [],
			managedIds: new Set(),
		});

		expect(changes).toEqual({ remove: [], add: [] });
	});
});

describe("orderFiledUnderIds", () => {
	test("puts chosen ids first in chosen order, then the rest", () => {
		expect(orderFiledUnderIds(["9", "2", "1", "3"], ["1", "2", "5"])).toEqual([
			"1",
			"2",
			"9",
			"3",
		]);
	});
});

describe("getReleaseArtistLabels", () => {
	test("labels linked and inherited artists with tokens, skipped by name", () => {
		const choices: ReleaseArtistChoices = new Map([
			["A", { kind: "linked", entry: ENTRY_A }],
			["B", { kind: "inherited", entry: ENTRY_B }],
			["C", { kind: "skipped" }],
		]);

		expect(getReleaseArtistLabels(choices)).toEqual(
			new Map([
				["A", "[Artist1]"],
				["B", "[Artist2]"],
				["C", "C"],
			]),
		);
	});
});
