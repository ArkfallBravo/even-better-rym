// ----------------------------------------------------------------------- //
//
// MODULE  : messaging.ts
//
// PURPOSE : Message types and helpers for talking to the background script
//
// CREATED : 2/25/2021
//
// ----------------------------------------------------------------------- //

import { nanoid } from "nanoid";
import browser from "webextension-polyfill";
import type { SearchDiagnostic } from "~/modules/spotify-search/messages";
import type { PageKey } from "~/shared/pages";
import type {
	TidalCreditsInput,
	TidalCreditsResult,
} from "~/shared/services/tidal/credits-page";

export type FetchRequest = {
	id: string;
	type: "fetch";
	data: {
		url: string;
		method?: "GET" | "POST";
		urlParameters?: Record<string, string | null | undefined>;
		body?: string;
		headers?: Record<string, string>;
		credentials?: RequestCredentials;
	};
};

export type FetchResponse = {
	id: string;
	type: "fetch";
	data: {
		body: string;
		status: number;
		statusText: string;
		retryAfter?: string;
		error?: string;
	};
};

export type DownloadRequest = {
	id: string;
	type: "download";
	data: {
		url: string;
		filename: string;
	}[];
};

export type DownloadResponse = {
	id: string;
	type: "download";
	data: {
		id: number;
	};
};

export type ScriptRequest = {
	id: string;
	type: "script";
	data: {
		script: string;
	};
};

export type ScriptResponse = {
	id: string;
	type: "script";
};

export type SpotifySearchRequest = {
	id: string;
	type: "spotifySearch";
	data: {
		artist: string;
		artistAlias?: string;
		title: string;
		releaseType?: "single" | "music video";
	};
};

export type SpotifySearchResponse = {
	id: string;
	type: "spotifySearch";
	data: { url?: string; error?: string; diagnostics?: SearchDiagnostic[] };
};

export type WikipediaSearchRequest = {
	id: string;
	type: "wikipediaSearch";
	data: {
		artistName: string;
		albumTitle: string;
	};
};

export type WikipediaSearchResponse = {
	id: string;
	type: "wikipediaSearch";
	data: { url?: string; error?: string };
};

export type TidalCreditsRequest = {
	id: string;
	type: "tidalCredits";
	data: TidalCreditsInput;
};

export type TidalCreditsResponse = {
	id: string;
	type: "tidalCredits";
	data: TidalCreditsResult;
};

export type StorageSetRequest = {
	id: string;
	type: "storageSet";
	data: {
		key: string;
		value: unknown;
	};
};

export type StorageSetResponse = {
	id: string;
	type: "storageSet";
};

export type SettingsGetAllRequest = {
	id: string;
	type: "settingsGetAll";
};

export type SettingsGetAllResponse = {
	id: string;
	type: "settingsGetAll";
	data: Partial<Record<PageKey, boolean>>;
};

export type SettingsSetRequest = {
	id: string;
	type: "settingsSet";
	data: {
		key: PageKey;
		value: boolean;
	};
};

export type SettingsSetResponse = {
	id: string;
	type: "settingsSet";
};

export type JsonSettingGetRequest = {
	id: string;
	type: "jsonSettingGet";
	data: {
		key: string;
	};
};

export type JsonSettingGetResponse = {
	id: string;
	type: "jsonSettingGet";
	data: string | null;
	error?: string;
};

export type JsonSettingSetRequest = {
	id: string;
	type: "jsonSettingSet";
	data: {
		key: string;
		value: string;
	};
};

export type JsonSettingSetResponse = {
	id: string;
	type: "jsonSettingSet";
	error?: string;
};

// Background -> tab broadcast (not a request/response pair, no `id`): tells
// an already-open page's content script about a setting change made
// elsewhere without a refresh. Needed because browser.storage.onChanged
// doesn't reliably reach a content script's context from a popup write on
// Safari, unlike Chrome/Firefox.
export type JsonSettingUpdatedMessage = {
	type: "jsonSettingUpdated";
	data: {
		key: string;
		value: string;
	};
};

export const isJsonSettingUpdatedMessage = (
	o: unknown,
): o is JsonSettingUpdatedMessage =>
	typeof o === "object" &&
	o !== null &&
	"type" in o &&
	o.type === "jsonSettingUpdated";

export type BackgroundRequest =
	| FetchRequest
	| DownloadRequest
	| ScriptRequest
	| StorageSetRequest
	| SettingsGetAllRequest
	| SettingsSetRequest
	| JsonSettingGetRequest
	| JsonSettingSetRequest
	| SpotifySearchRequest
	| TidalCreditsRequest
	| WikipediaSearchRequest;
export type BackgroundResponse =
	| FetchResponse
	| DownloadResponse
	| ScriptResponse
	| StorageSetResponse
	| SettingsGetAllResponse
	| SettingsSetResponse
	| JsonSettingGetResponse
	| JsonSettingSetResponse
	| SpotifySearchResponse
	| TidalCreditsResponse
	| WikipediaSearchResponse;

export const isBackgroundRequest = (o: unknown): o is BackgroundRequest =>
	typeof o === "object" && o !== null && "id" in o && "type" in o;

export const sendBackgroundMessage = <
	Request extends BackgroundRequest,
	Response extends BackgroundResponse,
>(
	request: Omit<Request, "id">,
): Promise<Response> => {
	const requestId = nanoid();
	return browser.runtime.sendMessage({
		id: requestId,
		...request,
	}) as Promise<Response>;
};
