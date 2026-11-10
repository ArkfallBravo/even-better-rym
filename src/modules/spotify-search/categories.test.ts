// ----------------------------------------------------------------------- //
//
// MODULE  : categories.test.ts
//
// PURPOSE : Tests for choosing Spotify search categories
//
// CREATED : 11/10/2026
//
// ----------------------------------------------------------------------- //

import { expect, test } from "vitest";

import { searchCategories } from "./categories";

test("searches albums for ordinary releases", () => {
	expect(searchCategories(undefined)).toEqual(["albums"]);
});

test("searches albums, then tracks, for singles", () => {
	expect(searchCategories("single")).toEqual(["albums", "tracks"]);
});

test("searches only tracks for music videos", () => {
	expect(searchCategories("music video")).toEqual(["tracks"]);
});
