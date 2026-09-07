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

type NativeKeybindingsGetResponse =
	| { ok: true; value: string | null }
	| { ok: false; error: string };

type NativeKeybindingsSetResponse = { ok: true } | { ok: false; error: string };

function assertNativeOk<T extends { ok: boolean; error?: string }>(
	response: T,
	opName: string,
): asserts response is T & { ok: true } {
	if (!response.ok) {
		throw new Error(`${opName} failed: ${response.error}`);
	}
}

export const nativeGetAllSettings = async (): Promise<SettingsDict> => {
	const response = (await browser.runtime.sendNativeMessage(
		nativeApplicationName,
		{ type: "settings.getAll" },
	)) as NativeGetAllResponse;

	assertNativeOk(response, "settings.getAll");
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

	assertNativeOk(response, "settings.setOne");
};

export const nativeGetKeybindings = async (): Promise<string | null> => {
	const response = (await browser.runtime.sendNativeMessage(
		nativeApplicationName,
		{ type: "keybindings.get" },
	)) as NativeKeybindingsGetResponse;

	assertNativeOk(response, "keybindings.get");
	return response.value;
};

export const nativeSetKeybindings = async (value: string): Promise<void> => {
	const response = (await browser.runtime.sendNativeMessage(
		nativeApplicationName,
		{ type: "keybindings.setAll", value },
	)) as NativeKeybindingsSetResponse;

	assertNativeOk(response, "keybindings.setAll");
};
