// ----------------------------------------------------------------------- //
//
// MODULE  : remembered-input.test.ts
//
// PURPOSE : Tests for the debug panels' saved inputs
//
// CREATED : 11/10/2026
//
// ----------------------------------------------------------------------- //

// @vitest-environment jsdom

import { afterEach, describe, expect, test } from "vitest";

import { recallInput, rememberInput } from "./remembered-input";

afterEach(() => {
	localStorage.clear();
});

describe("recallInput", () => {
	test("returns the fallback when nothing was saved", () => {
		expect(recallInput("search.artist", "Default")).toBe("Default");
	});

	test("returns the last saved value instead of the fallback", () => {
		rememberInput("search.artist", "Ryu☆");
		rememberInput("search.artist", "Violent Magic Orchestra");
		expect(recallInput("search.artist", "Default")).toBe(
			"Violent Magic Orchestra",
		);
	});

	test("keeps a saved empty value rather than restoring the fallback", () => {
		rememberInput("search.title", "");
		expect(recallInput("search.title", "Default")).toBe("");
	});

	test("keeps each key separate", () => {
		rememberInput("search.artist", "Ryu☆");
		expect(recallInput("search.title", "Default")).toBe("Default");
	});
});
