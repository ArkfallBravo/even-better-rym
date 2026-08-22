import browser from "webextension-polyfill";

import type { PageKey } from "~/shared/pages";
import { globalPageKeys, pages } from "~/shared/pages";
import type {
	BackgroundResponse,
	KeybindingsGetRequest,
	KeybindingsGetResponse,
	KeybindingsSetRequest,
	KeybindingsSetResponse,
	KeybindingsUpdatedMessage,
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
	nativeGetKeybindings,
	nativeSetKeybindings,
	nativeSetOneSetting,
} from "~/shared/utils/native-settings";
import * as storage from "~/shared/utils/storage";

import { download } from "./download";
import { backgroundFetch } from "./fetch";
import { script } from "./script";

if (import.meta.env.VITE_DEBUG_TOOLS === "true") {
	console.log(
		"[debug tools] import-check page:",
		browser.runtime.getURL("src/modules/import-check/index.html"),
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

const getResponse = (
	message: unknown,
	tabId: number,
): Promise<BackgroundResponse> => {
	if (isBackgroundRequest(message)) {
		if (message.type === "fetch") return backgroundFetch(message);
		if (message.type === "download") return download(message, tabId);
		if (message.type === "script") return script(message, tabId);
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

const getKeybindingsGetResponse = async (
	message: KeybindingsGetRequest,
): Promise<KeybindingsGetResponse> => ({
	id: message.id,
	type: "keybindingsGet",
	data: await nativeGetKeybindings(),
});

// Matches this content script's own manifest.ts content_scripts registration.
const CHART_SHORTCUTS_MATCH_PATTERN = "*://*.rateyourmusic.com/charts/*";

// browser.storage.onChanged doesn't reliably reach a content script's
// context from a popup write on Safari, so an already-open chart page needs
// to be told about a binding change explicitly instead.
const broadcastKeybindingsChanged = async (value: string): Promise<void> => {
	const tabs = await browser.tabs.query({ url: CHART_SHORTCUTS_MATCH_PATTERN });
	await Promise.all(
		tabs
			.map((tab) => tab.id)
			.filter((id): id is number => id !== undefined)
			.map((id) =>
				browser.tabs
					.sendMessage(id, {
						type: "keybindingsUpdated",
						data: { value },
					} satisfies KeybindingsUpdatedMessage)
					.catch(() => {
						// No content script listening in this tab (e.g. mid-navigation) - fine to drop.
					}),
			),
	);
};

const getKeybindingsSetResponse = async (
	message: KeybindingsSetRequest,
): Promise<KeybindingsSetResponse> => {
	await broadcastKeybindingsChanged(message.data.value);
	await nativeSetKeybindings(message.data.value);
	return { id: message.id, type: "keybindingsSet" };
};

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
	// storageSet/settingsGetAll/settingsSet/keybindingsGet/keybindingsSet have
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

		if (message.type === "keybindingsGet") {
			return respondFrom(getKeybindingsGetResponse(message), {
				id: message.id,
				type: "keybindingsGet",
				data: null,
			});
		}

		if (message.type === "keybindingsSet") {
			return respondFrom(getKeybindingsSetResponse(message), {
				id: message.id,
				type: "keybindingsSet",
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
					data: { body: "", error: String(err) },
				}),
			);
		return true; // keep channel open until sendResponse is called
	}
});

const setTabIcon = (tabId: number, enabled: boolean) => {
	void browser.action.setIcon({
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
	void browser.action.setTitle({
		tabId,
		title: `EvenBetterRYM ${enabled ? "enabled" : "disabled"}`,
	});
};

browser.tabs.onUpdated.addListener((id, _changeInfo, tab) => {
	if (!tab.url) return;
	const url = new URL(tab.url);
	if (!url.hostname.endsWith("rateyourmusic.com")) return;

	const pageEntries = (Object.entries(pages) as [PageKey, string][]).filter(
		([key]) => !globalPageKeys.has(key),
	);

	const matchingKeys = pageEntries
		.filter(([, pageUrl]) => url.pathname.startsWith(pageUrl))
		.map(([key]) => key);

	if (matchingKeys.length === 0) return;

	// Reads settingsCache directly rather than going through getPageEnabled,
	// which would round-trip a sendMessage back to this same script.
	void ensureSettings().then(() => {
		const enabled = matchingKeys.some((key) => settingsCache[key] ?? true);
		setTabIcon(id, enabled);
		void browser.action.enable(id);
	});
});
