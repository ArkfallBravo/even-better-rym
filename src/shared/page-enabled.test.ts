// ----------------------------------------------------------------------- //
//
// MODULE  : page-enabled.test.ts
//
// PURPOSE : Tests for resolving a feature's enabled state from stored settings
//
// CREATED : 10/2/2026
//
// ----------------------------------------------------------------------- //

import { describe, expect, test } from "vitest";

import { resolvePageEnabled } from "./page-enabled";

describe("resolvePageEnabled", () => {
	test("uses the stored value when there is one", () => {
		expect(resolvePageEnabled({ hideReviews: true }, "hideReviews")).toBe(true);
		expect(resolvePageEnabled({ streamLinks: false }, "streamLinks")).toBe(
			false,
		);
	});

	test("falls back to the feature's default", () => {
		expect(resolvePageEnabled({}, "hideReviews")).toBe(false);
		expect(resolvePageEnabled({}, "streamLinks")).toBe(true);
	});

	test("carries a disabled legacy genre chart toggle over", () => {
		expect(
			resolvePageEnabled({ filmChartGenreLinks: false }, "genreChartControls"),
		).toBe(false);
		expect(resolvePageEnabled({}, "genreChartControls")).toBe(true);
	});

	test("prefers the new genre chart key over legacy ones", () => {
		expect(
			resolvePageEnabled(
				{ genreChartControls: true, filmGenreChartButton: false },
				"genreChartControls",
			),
		).toBe(true);
	});
});
