// ----------------------------------------------------------------------- //
//
// MODULE  : spotify-api-search.test.ts
//
// PURPOSE : Tests for the Spotify Web API search and its rate-limit backoff
//
// CREATED : 11/10/2026
//
// ----------------------------------------------------------------------- //

import { beforeEach, describe, expect, test, vi } from "vitest";

import type { SearchItem } from "~/shared/services/spotify/codecs";
import type { FetchRequest, FetchResponse } from "~/shared/utils/messaging";
import * as storage from "~/shared/utils/storage";

import { backgroundFetch } from "./fetch";

vi.mock("./fetch", () => ({ backgroundFetch: vi.fn() }));
vi.mock("~/shared/utils/storage", () => ({ get: vi.fn(), set: vi.fn() }));
vi.mock("~/shared/services/spotify/auth", () => ({
	tokenRequest: { url: "https://accounts.spotify.com/api/token" },
}));

const NOW = 1_800_000_000_000;

function item(name: string, artists: string[], id: string): SearchItem {
	return {
		name,
		artists: artists.map((artist) => ({
			name: artist,
			external_urls: { spotify: "" },
			href: "",
			id: "",
			type: "artist",
			uri: "",
		})),
		external_urls: { spotify: `https://open.spotify.com/album/${id}` },
	};
}

function reply(status: number, body: unknown, retryAfter?: string) {
	return {
		id: "id",
		type: "fetch",
		data: {
			body: JSON.stringify(body),
			status,
			statusText: "",
			...(retryAfter ? { retryAfter } : {}),
			...(status === 200 ? {} : { error: `HTTP ${status}` }),
		},
	} satisfies FetchResponse;
}

// Answers token requests with a token and search requests with albumItems.
function serveSearch(albumItems: SearchItem[], trackItems: SearchItem[] = []) {
	vi.mocked(backgroundFetch).mockImplementation((request: FetchRequest) =>
		Promise.resolve(
			request.data.url.includes("accounts.spotify.com")
				? reply(200, { access_token: "token", expires_in: 3600 })
				: reply(
						200,
						request.data.urlParameters?.type === "track"
							? { tracks: { items: trackItems } }
							: { albums: { items: albumItems } },
					),
		),
	);
}

async function loadModule() {
	vi.resetModules();
	return await import("./spotify-api-search");
}

beforeEach(() => {
	vi.resetAllMocks();
	vi.spyOn(Date, "now").mockReturnValue(NOW);
	vi.mocked(storage.get).mockResolvedValue(undefined);
});

describe("pickSpotifyMatch", () => {
	test("prefers an exact title over an earlier edition", async () => {
		const { pickSpotifyMatch } = await loadModule();
		const items = [
			item("Death Rave (Deluxe Edition)", ["Violent Magic Orchestra"], "a"),
			item("Death Rave", ["Violent Magic Orchestra"], "b"),
		];
		expect(
			pickSpotifyMatch(items, {
				artist: "Violent Magic Orchestra",
				title: "Death Rave",
			}),
		).toBe("https://open.spotify.com/album/b");
	});

	test("falls back to the first edition when there's no exact title", async () => {
		const { pickSpotifyMatch } = await loadModule();
		const items = [
			item("Death Rave (2020 Remaster)", ["Violent Magic Orchestra"], "a"),
		];
		expect(
			pickSpotifyMatch(items, {
				artist: "violent magic orchestra",
				title: "Death Rave",
			}),
		).toBe("https://open.spotify.com/album/a");
	});

	test("matches the artist against each of the item's artists", async () => {
		const { pickSpotifyMatch } = await loadModule();
		const items = [item("Split", ["Someone Else", "Ryu☆"], "a")];
		expect(pickSpotifyMatch(items, { artist: "Ryu☆", title: "Split" })).toBe(
			"https://open.spotify.com/album/a",
		);
	});

	test("ignores a matching title by a different artist", async () => {
		const { pickSpotifyMatch } = await loadModule();
		const items = [item("Death Rave", ["Someone Else"], "a")];
		expect(
			pickSpotifyMatch(items, {
				artist: "Violent Magic Orchestra",
				title: "Death Rave",
			}),
		).toBeUndefined();
	});
});

describe("retryAtFrom", () => {
	test("waits for the Retry-After seconds", async () => {
		const { retryAtFrom } = await loadModule();
		expect(retryAtFrom("120", NOW)).toBe(NOW + 120_000);
	});

	test("waits a minute when Retry-After is missing or invalid", async () => {
		const { retryAtFrom } = await loadModule();
		expect(retryAtFrom(undefined, NOW)).toBe(NOW + 60_000);
		expect(retryAtFrom("soon", NOW)).toBe(NOW + 60_000);
		expect(retryAtFrom("0", NOW)).toBe(NOW + 60_000);
	});
});

describe("rateLimitedResult", () => {
	test("rounds the remaining wait up to whole minutes", async () => {
		const { rateLimitedResult } = await loadModule();
		expect(rateLimitedResult(NOW + 61_000, NOW)).toEqual({
			status: "error",
			message: "Spotify is rate-limiting searches; try again in 2 min",
		});
	});
});

describe("searchSpotifyApi", () => {
	test("finds an album by the searched artist", async () => {
		const { searchSpotifyApi } = await loadModule();
		serveSearch([item("Death Rave", ["Violent Magic Orchestra"], "a")]);
		await expect(
			searchSpotifyApi({
				artist: "Violent Magic Orchestra",
				title: "Death Rave",
			}),
		).resolves.toEqual({
			status: "found",
			url: "https://open.spotify.com/album/a",
		});
	});

	test("searches tracks after albums for a single", async () => {
		const { searchSpotifyApi } = await loadModule();
		serveSearch([], [item("Song", ["Ryu☆"], "t")]);
		await expect(
			searchSpotifyApi({
				artist: "Ryu☆",
				title: "Song",
				releaseType: "single",
			}),
		).resolves.toEqual({
			status: "found",
			url: "https://open.spotify.com/album/t",
		});
	});

	test("reports not-found when nothing matches", async () => {
		const { searchSpotifyApi } = await loadModule();
		serveSearch([item("Other", ["Someone Else"], "a")]);
		await expect(
			searchSpotifyApi({ artist: "Ryu☆", title: "Song" }),
		).resolves.toEqual({ status: "not-found" });
	});

	test("reuses one access token across searches", async () => {
		const { searchSpotifyApi } = await loadModule();
		serveSearch([]);
		await searchSpotifyApi({ artist: "A", title: "One" });
		await searchSpotifyApi({ artist: "A", title: "Two" });
		const tokenCalls = vi
			.mocked(backgroundFetch)
			.mock.calls.filter(([request]) =>
				request.data.url.includes("accounts.spotify.com"),
			);
		expect(tokenCalls).toHaveLength(1);
	});

	test("saves the retry time and reports the wait when Spotify answers 429", async () => {
		const { searchSpotifyApi } = await loadModule();
		vi.mocked(backgroundFetch).mockImplementation((request: FetchRequest) =>
			Promise.resolve(
				request.data.url.includes("accounts.spotify.com")
					? reply(200, { access_token: "token", expires_in: 3600 })
					: reply(429, {}, "300"),
			),
		);
		await expect(
			searchSpotifyApi({ artist: "A", title: "B" }),
		).resolves.toEqual({
			status: "error",
			message: "Spotify is rate-limiting searches; try again in 5 min",
		});
		expect(storage.set).toHaveBeenCalledWith(
			"spotifyApiRetryAt",
			NOW + 300_000,
		);
	});

	test("skips the request entirely while a saved backoff is running", async () => {
		const { searchSpotifyApi } = await loadModule();
		vi.mocked(storage.get).mockResolvedValue(NOW + 120_000);
		await expect(
			searchSpotifyApi({ artist: "A", title: "B" }),
		).resolves.toEqual({
			status: "error",
			message: "Spotify is rate-limiting searches; try again in 2 min",
		});
		expect(backgroundFetch).not.toHaveBeenCalled();
	});

	test("searches again once a saved backoff has passed", async () => {
		const { searchSpotifyApi } = await loadModule();
		vi.mocked(storage.get).mockResolvedValue(NOW - 1);
		serveSearch([item("B", ["A"], "a")]);
		await expect(
			searchSpotifyApi({ artist: "A", title: "B" }),
		).resolves.toEqual({
			status: "found",
			url: "https://open.spotify.com/album/a",
		});
	});

	test("reports other HTTP failures as errors", async () => {
		const { searchSpotifyApi } = await loadModule();
		vi.mocked(backgroundFetch).mockResolvedValue(reply(500, {}));
		await expect(
			searchSpotifyApi({ artist: "A", title: "B" }),
		).resolves.toEqual({
			status: "error",
			message: "Spotify API request failed: HTTP 500",
		});
	});
});
