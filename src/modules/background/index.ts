// ----------------------------------------------------------------------- //
//
// MODULE  : index.ts
//
// PURPOSE : Background script that routes messages and owns native settings
//
// CREATED : 2/14/2021
//
// ----------------------------------------------------------------------- //

import browser from "webextension-polyfill";
import { hasDebugTools, importCheckPagePath } from "~/shared/debug-tools";
import { resolvePageEnabled } from "~/shared/page-enabled";
import type { PageKey } from "~/shared/pages";
import { globalPageKeys, pages } from "~/shared/pages";
import type {
	BackgroundResponse,
	JsonSettingGetRequest,
	JsonSettingGetResponse,
	JsonSettingSetRequest,
	JsonSettingSetResponse,
	JsonSettingUpdatedMessage,
	SettingsGetAllRequest,
	SettingsGetAllResponse,
	SettingsSetRequest,
	SettingsSetResponse,
	StorageSetRequest,
	StorageSetResponse,
} from "~/shared/utils/messaging";
import { isBackgroundRequest } from "~/shared/utils/messaging";
import type { SettingsDict } from "~/shared/utils/native-settings";
import {
	nativeGetAllSettings,
	nativeGetJsonSetting,
	nativeSetJsonSetting,
	nativeSetOneSetting,
} from "~/shared/utils/native-settings";
import * as storage from "~/shared/utils/storage";

import { download } from "./download";
import { backgroundFetch } from "./fetch";
import { script } from "./script";
import { spotifySearch } from "./spotify-search";
import { tidalCredits } from "./tidal-credits";
import { wikipediaSearch } from "./wikipedia-search";

if (hasDebugTools()) {
	console.log(
		"[debug tools] import-check page:",
		browser.runtime.getURL(importCheckPagePath),
	);
}

const setStorageFromMessage = async (
	message: StorageSetRequest,
): Promise<StorageSetResponse> => {
	await storage.set(message.data.key, message.data.value);
	return { id: message.id, type: "storageSet" };
};

let settingsCache: SettingsDict = {};
let hydrationPromise: Promise<void> | undefined;

// Best-effort, non-blocking: any pre-existing `pages.*` values still sitting
// in browser.storage.local (from a live session predating this change) are
// seeded into native settings once, so upgrading users don't see their
// customized toggles silently reset to all-enabled.
const migratedFlagKey = "pages.migratedToNativeSettings";

const migrateLegacyStorageSettings = async (): Promise<void> => {
	const alreadyMigrated = await storage.get<boolean>(migratedFlagKey);
	if (alreadyMigrated) return;

	const legacyEntries = Object.entries(await storage.getAll()).filter(
		(entry): entry is [string, boolean] =>
			entry[0].startsWith("pages.") &&
			entry[0] !== migratedFlagKey &&
			typeof entry[1] === "boolean",
	);

	await Promise.all(
		legacyEntries.map(([key, value]) =>
			nativeSetOneSetting(key.slice("pages.".length) as PageKey, value),
		),
	);

	await storage.set(migratedFlagKey, true);
};

const ensureSettings = (): Promise<void> => {
	hydrationPromise ??= (async () => {
		try {
			await migrateLegacyStorageSettings();
			settingsCache = await nativeGetAllSettings();
		} catch (error) {
			console.error("[settings] failed to hydrate from native side", error);
			settingsCache = {};
		}
	})();
	return hydrationPromise;
};

const getSettingsSnapshot = async (): Promise<SettingsDict> => {
	await ensureSettings();
	return settingsCache;
};

const setSetting = async (key: PageKey, value: boolean): Promise<void> => {
	await nativeSetOneSetting(key, value);
	settingsCache = { ...settingsCache, [key]: value };
};

void ensureSettings();

const CHANGELOG_PATH = "changelog.html";

browser.runtime.onInstalled.addListener((details) => {
	if (details.reason !== "update") return;

	void browser.tabs.create({
		url: browser.runtime.getURL(CHANGELOG_PATH),
	});
});

const getResponse = (
	message: unknown,
	tabId: number,
): Promise<BackgroundResponse> => {
	if (isBackgroundRequest(message)) {
		if (message.type === "fetch") return backgroundFetch(message);
		if (message.type === "download") return download(message, tabId);
		if (message.type === "script") return script(message, tabId);
		if (message.type === "spotifySearch") return spotifySearch(message);
		if (message.type === "tidalCredits") return tidalCredits(message);
		if (message.type === "wikipediaSearch") return wikipediaSearch(message);
	}
	throw new Error(`Invalid message: ${JSON.stringify(message)}`);
};

const getSettingsGetAllResponse = async (
	message: SettingsGetAllRequest,
): Promise<SettingsGetAllResponse> => ({
	id: message.id,
	type: "settingsGetAll",
	data: await getSettingsSnapshot(),
});

const getSettingsSetResponse = async (
	message: SettingsSetRequest,
): Promise<SettingsSetResponse> => {
	await setSetting(message.data.key, message.data.value);
	return { id: message.id, type: "settingsSet" };
};

const getJsonSettingGetResponse = async (
	message: JsonSettingGetRequest,
): Promise<JsonSettingGetResponse> => ({
	id: message.id,
	type: "jsonSettingGet",
	data: await nativeGetJsonSetting(message.data.key),
});

const RYM_MATCH_PATTERN = "*://*.rateyourmusic.com/*";

// browser.storage.onChanged doesn't reliably reach a content script's
// context from a popup write on Safari, so open RYM pages need to be told
// about a setting change explicitly instead.
const broadcastJsonSettingChanged = async (
	data: JsonSettingUpdatedMessage["data"],
): Promise<void> => {
	const tabs = await browser.tabs.query({ url: RYM_MATCH_PATTERN });
	await Promise.all(
		tabs
			.map((tab) => tab.id)
			.filter((id): id is number => id !== undefined)
			.map((id) =>
				browser.tabs
					.sendMessage(id, {
						type: "jsonSettingUpdated",
						data,
					} satisfies JsonSettingUpdatedMessage)
					.catch(() => {
						// No content script listening in this tab (e.g. mid-navigation) - fine to drop.
					}),
			),
	);
};

const getJsonSettingSetResponse = async (
	message: JsonSettingSetRequest,
): Promise<JsonSettingSetResponse> => {
	await broadcastJsonSettingChanged(message.data);
	await nativeSetJsonSetting(message.data.key, message.data.value);
	return { id: message.id, type: "jsonSettingSet" };
};

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
	// storageSet/settingsGetAll/settingsSet/jsonSettingGet/jsonSettingSet have
	// no associated tab (e.g. sent from the popup), so they're handled before
	// the tab-scoped messages below. Each has a .catch fallback: without one,
	// a rejected native call means sendResponse is never called and the
	// caller's await hangs forever rather than failing (this bit
	// settingsSet on any build without a native host, i.e. non-Safari).
	if (isBackgroundRequest(message)) {
		const respond = sendResponse as (response: BackgroundResponse) => void;
		const respondFrom = <R extends BackgroundResponse>(
			promise: Promise<R>,
			fallback: R,
		): true => {
			void promise.then(respond).catch(() => respond(fallback));
			return true;
		};

		if (message.type === "storageSet") {
			return respondFrom(setStorageFromMessage(message), {
				id: message.id,
				type: "storageSet",
			});
		}

		if (message.type === "settingsGetAll") {
			return respondFrom(getSettingsGetAllResponse(message), {
				id: message.id,
				type: "settingsGetAll",
				data: {},
			});
		}

		if (message.type === "settingsSet") {
			return respondFrom(getSettingsSetResponse(message), {
				id: message.id,
				type: "settingsSet",
			});
		}

		if (message.type === "jsonSettingGet") {
			return respondFrom(getJsonSettingGetResponse(message), {
				id: message.id,
				type: "jsonSettingGet",
				data: null,
				error: "native settings call failed",
			});
		}

		if (message.type === "jsonSettingSet") {
			return respondFrom(getJsonSettingSetResponse(message), {
				id: message.id,
				type: "jsonSettingSet",
				error: "native settings call failed",
			});
		}
	}

	const tabId = sender.tab?.id;
	if (tabId === undefined) return;

	if (isBackgroundRequest(message)) {
		const respond = sendResponse as (response: BackgroundResponse) => void;
		getResponse(message, tabId)
			.then(respond)
			.catch((err: unknown) =>
				respond({
					id: "",
					type: "fetch",
					data: { body: "", status: 0, statusText: "", error: String(err) },
				}),
			);
		return true; // keep channel open until sendResponse is called
	}
});

// Returns the toolbar button API, which Manifest V2 builds name browserAction.
const toolbarAction =
	browser.runtime.getManifest().manifest_version === 2
		? browser.browserAction
		: browser.action;

const setTabIcon = (tabId: number, enabled: boolean) => {
	void toolbarAction.setIcon({
		tabId,
		path: enabled
			? {
					"19": browser.runtime.getURL("icons/extension-enabled-19.png"),
					"38": browser.runtime.getURL("icons/extension-enabled-38.png"),
				}
			: {
					"19": browser.runtime.getURL("icons/extension-disabled-19.png"),
					"38": browser.runtime.getURL("icons/extension-disabled-38.png"),
				},
	});
	void toolbarAction.setTitle({
		tabId,
		title: `EvenBetterRYM ${enabled ? "enabled" : "disabled"}`,
	});
};

browser.tabs.onUpdated.addListener((id, _changeInfo, tab) => {
	if (!tab.url) return;
	const url = new URL(tab.url);
	if (!url.hostname.endsWith("rateyourmusic.com")) return;

	const pageEntries = (
		Object.entries(pages) as [PageKey, string | readonly string[]][]
	).filter(([key]) => !globalPageKeys.has(key));

	const matchingKeys = pageEntries
		.filter(([, pageUrl]) =>
			typeof pageUrl === "string"
				? url.pathname.startsWith(pageUrl)
				: pageUrl.some((prefix) => url.pathname.startsWith(prefix)),
		)
		.map(([key]) => key);

	if (matchingKeys.length === 0) return;

	// Reads settingsCache directly rather than going through getModuleEnabled,
	// which would round-trip a sendMessage back to this same script.
	void ensureSettings().then(() => {
		const enabled = matchingKeys.some((key) =>
			resolvePageEnabled(settingsCache, key),
		);
		setTabIcon(id, enabled);
		void toolbarAction.enable(id);
	});
});
