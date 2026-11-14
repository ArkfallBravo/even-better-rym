// ----------------------------------------------------------------------- //
//
// MODULE  : title-match.test.ts
//
// PURPOSE : Tests for the Spotify title-matching rules
//
// CREATED : 11/10/2026
//
// ----------------------------------------------------------------------- //

import { describe, expect, test } from "vitest";

import { normalizeSearchText } from "~/shared/services/search-matching";

import { matchTitle } from "./title-match";

describe("normalizeSearchText", () => {
	test("folds case, repeated whitespace and compatibility characters", () => {
		expect(normalizeSearchText("  Ｄｅａｔｈ   RAVE ")).toBe("death rave");
	});
});

describe("matchTitle", () => {
	test("matches the same title exactly, ignoring case and spacing", () => {
		expect(matchTitle("Death  Rave", { title: "death rave" })).toBe("exact");
	});

	test("matches reissues as editions", () => {
		expect(matchTitle("Death Rave (Reissue)", { title: "Death Rave" })).toBe(
			"edition",
		);
	});

	test("matches remastered and deluxe editions as editions", () => {
		expect(
			matchTitle("Death Rave (2020 Remaster)", { title: "Death Rave" }),
		).toBe("edition");
		expect(
			matchTitle("Death Rave - Deluxe Edition", { title: "Death Rave" }),
		).toBe("edition");
	});

	test("rejects titles that only start with the searched title", () => {
		expect(
			matchTitle("Death Rave II", { title: "Death Rave" }),
		).toBeUndefined();
	});

	test("accepts a video suffix only for music videos", () => {
		const title = "Death Rave (Official Music Video)";
		expect(matchTitle(title, { title: "Death Rave" })).toBeUndefined();
		expect(
			matchTitle(title, { title: "Death Rave", releaseType: "music video" }),
		).toBe("edition");
	});
});
