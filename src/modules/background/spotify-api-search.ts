// ----------------------------------------------------------------------- //
//
// MODULE  : spotify-api-search.ts
//
// PURPOSE : Spotify search through the Web API, for browsers that block the hidden search page
//
// CREATED : 11/10/2026
//
// ----------------------------------------------------------------------- //

import { searchCategories } from "~/modules/spotify-search/categories";
import type {
	SearchCategory,
	SearchInput,
	SearchResult,
} from "~/modules/spotify-search/messages";
import { matchTitle } from "~/modules/spotify-search/title-match";
import {
	getSearchArtists,
	normalizeSearchText,
} from "~/shared/services/search-matching";
import { tokenRequest } from "~/shared/services/spotify/auth";
import type {
	SearchItem,
	SearchResponse,
	TokenResponse,
} from "~/shared/services/spotify/codecs";
import type { FetchRequest } from "~/shared/utils/messaging";
import * as storage from "~/shared/utils/storage";

import { backgroundFetch } from "./fetch";

const SEARCH_URL = "https://api.spotify.com/v1/search";
const RETRY_AT_KEY = "spotifyApiRetryAt";
const DEFAULT_RETRY_SECONDS = 60;
const TOKEN_EXPIRY_MARGIN_MS = 60_000;

class RateLimitError extends Error {
	constructor(readonly retryAt: number) {
		super("Spotify API rate limit reached");
	}
}

let cachedToken: { value: string; expiresAt: number } | undefined;

// Searches the Spotify Web API for a release, backing off while rate-limited.
export async function searchSpotifyApi(
	input: SearchInput,
): Promise<SearchResult> {
	const retryAt = await storage.get<number>(RETRY_AT_KEY);
	if (retryAt !== undefined && Date.now() < retryAt) {
		return rateLimitedResult(retryAt, Date.now());
	}
	try {
		for (const category of searchCategories(input.releaseType)) {
			const url = await searchCategory(input, category);
			if (url) {
				return { status: "found", url };
			}
		}
		return { status: "not-found" };
	} catch (error) {
		if (error instanceof RateLimitError) {
			await storage.set(RETRY_AT_KEY, error.retryAt);
			return rateLimitedResult(error.retryAt, Date.now());
		}
		const message = error instanceof Error ? error.message : String(error);
		return { status: "error", message };
	}
}

// Returns the URL of the best match in one Spotify search category.
async function searchCategory(
	input: SearchInput,
	category: SearchCategory,
): Promise<string | undefined> {
	const token = await getToken();
	const response = await fetchSpotifyJson<SearchResponse>({
		url: SEARCH_URL,
		urlParameters: {
			q: `${input.artist} ${input.title}`,
			type: category === "albums" ? "album" : "track",
		},
		headers: { Authorization: `Bearer ${token}` },
	});
	const results = category === "albums" ? response.albums : response.tracks;
	return pickSpotifyMatch(results?.items ?? [], input);
}

// Returns an access token, reusing the last one until shortly before it expires.
async function getToken(): Promise<string> {
	if (cachedToken && Date.now() < cachedToken.expiresAt) {
		return cachedToken.value;
	}
	const token = await fetchSpotifyJson<TokenResponse>(tokenRequest);
	cachedToken = {
		value: token.access_token,
		expiresAt: Date.now() + token.expires_in * 1000 - TOKEN_EXPIRY_MARGIN_MS,
	};
	return cachedToken.value;
}

// Sends a Spotify request and returns its parsed JSON body, throwing on HTTP errors.
async function fetchSpotifyJson<T>(data: FetchRequest["data"]): Promise<T> {
	const response = await backgroundFetch({
		id: crypto.randomUUID(),
		type: "fetch",
		data,
	});
	if (response.data.status === 429) {
		throw new RateLimitError(retryAtFrom(response.data.retryAfter, Date.now()));
	}
	if (response.data.error) {
		throw new Error(`Spotify API request failed: ${response.data.error}`);
	}
	return JSON.parse(response.data.body) as T;
}

// Returns the first exact title match's URL, else the first edition match's URL.
export function pickSpotifyMatch(
	items: SearchItem[],
	input: SearchInput,
): string | undefined {
	let editionUrl: string | undefined;
	for (const item of items) {
		if (!hasArtist(item, input)) {
			continue;
		}
		const titleMatch = matchTitle(item.name, input);
		if (titleMatch === "exact") {
			return item.external_urls.spotify;
		}
		if (titleMatch === "edition") {
			editionUrl ??= item.external_urls.spotify;
		}
	}
	return editionUrl;
}

// Checks whether one of the item's artists is the searched artist or its alias.
function hasArtist(item: SearchItem, input: SearchInput): boolean {
	const searchedArtists = getSearchArtists(input.artist, input.artistAlias).map(
		normalizeSearchText,
	);
	return item.artists.some((candidate) =>
		searchedArtists.includes(normalizeSearchText(candidate.name)),
	);
}

// Returns when to retry after a 429, from its Retry-After seconds or a default.
export function retryAtFrom(
	retryAfter: string | undefined,
	now: number,
): number {
	const seconds = Number(retryAfter);
	const waitSeconds =
		retryAfter !== undefined && Number.isFinite(seconds) && seconds > 0
			? seconds
			: DEFAULT_RETRY_SECONDS;
	return now + waitSeconds * 1000;
}

// Returns the error shown while Spotify is rate-limiting searches.
export function rateLimitedResult(retryAt: number, now: number): SearchResult {
	const minutes = Math.max(1, Math.ceil((retryAt - now) / 60_000));
	return {
		status: "error",
		message: `Spotify is rate-limiting searches; try again in ${minutes} min`,
	};
}
