import { nanoid } from "nanoid";
import browser from "webextension-polyfill";

import type { PageKey } from "~/shared/pages";

export type FetchRequest = {
	id: string;
	type: "fetch";
	data: {
		url: string;
		method?: "GET" | "POST";
		urlParameters?: Record<string, string>;
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

export type KeybindingsGetRequest = {
	id: string;
	type: "keybindingsGet";
};

export type KeybindingsGetResponse = {
	id: string;
	type: "keybindingsGet";
	data: string | null;
};

export type KeybindingsSetRequest = {
	id: string;
	type: "keybindingsSet";
	data: {
		value: string;
	};
};

export type KeybindingsSetResponse = {
	id: string;
	type: "keybindingsSet";
};

// Background -> tab broadcast (not a request/response pair, no `id`): tells
// an already-open chart page's content script to pick up a binding change
// made in the popup without a refresh. Needed because browser.storage.onChanged
// doesn't reliably reach a content script's context from a popup write on
// Safari, unlike Chrome/Firefox.
export type KeybindingsUpdatedMessage = {
	type: "keybindingsUpdated";
	data: {
		value: string;
	};
};

export const isKeybindingsUpdatedMessage = (
	o: unknown,
): o is KeybindingsUpdatedMessage =>
	typeof o === "object" &&
	o !== null &&
	"type" in o &&
	o.type === "keybindingsUpdated";

export type BackgroundRequest =
	| FetchRequest
	| DownloadRequest
	| ScriptRequest
	| StorageSetRequest
	| SettingsGetAllRequest
	| SettingsSetRequest
	| KeybindingsGetRequest
	| KeybindingsSetRequest;
export type BackgroundResponse =
	| FetchResponse
	| DownloadResponse
	| ScriptResponse
	| StorageSetResponse
	| SettingsGetAllResponse
	| SettingsSetResponse
	| KeybindingsGetResponse
	| KeybindingsSetResponse;

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
