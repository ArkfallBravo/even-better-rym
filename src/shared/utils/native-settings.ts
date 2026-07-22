import browser from "webextension-polyfill";

import type { PageKey } from "~/shared/pages";

export type SettingsDict = Partial<Record<PageKey, boolean>>;

// Safari ignores the `application` argument (there's no external host
// process - it always routes to our own SafariWebExtensionHandler), but
// @types/webextension-polyfill requires it regardless.
const nativeApplicationName = "com.EvenBetterRYM.Extension";

type NativeGetAllResponse =
	| { ok: true; settings: SettingsDict }
	| { ok: false; error: string };

type NativeSetOneResponse = { ok: true } | { ok: false; error: string };

export const nativeGetAllSettings = async (): Promise<SettingsDict> => {
	const response = (await browser.runtime.sendNativeMessage(
		nativeApplicationName,
		{ type: "settings.getAll" },
	)) as NativeGetAllResponse;

	if (!response.ok) {
		throw new Error(`settings.getAll failed: ${response.error}`);
	}

	return response.settings;
};

export const nativeSetOneSetting = async (
	key: PageKey,
	value: boolean,
): Promise<void> => {
	const response = (await browser.runtime.sendNativeMessage(
		nativeApplicationName,
		{ type: "settings.setOne", key, value },
	)) as NativeSetOneResponse;

	if (!response.ok) {
		throw new Error(`settings.setOne failed: ${response.error}`);
	}
};
