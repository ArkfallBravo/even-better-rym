// ----------------------------------------------------------------------- //
//
// MODULE  : stored-settings.ts
//
// PURPOSE : Non-boolean settings that survive Safari clearing its history
//
// CREATED : 10/2/2026
//
// ----------------------------------------------------------------------- //

import browser from "webextension-polyfill";

import type {
	JsonSettingGetRequest,
	JsonSettingGetResponse,
	JsonSettingSetRequest,
	JsonSettingSetResponse,
} from "./messaging";
import {
	isJsonSettingUpdatedMessage,
	sendBackgroundMessage,
} from "./messaging";
import { createMirroredSettings } from "./mirrored-setting";
import * as storage from "./storage";

const readNative = async (key: string): Promise<string | null> => {
	const response = await sendBackgroundMessage<
		JsonSettingGetRequest,
		JsonSettingGetResponse
	>({ type: "jsonSettingGet", data: { key } });
	if (response.error !== undefined) throw new Error(response.error);
	return response.data;
};

const writeNative = async (key: string, json: string): Promise<void> => {
	const response = await sendBackgroundMessage<
		JsonSettingSetRequest,
		JsonSettingSetResponse
	>({ type: "jsonSettingSet", data: { key, value: json } });
	if (response.error !== undefined) throw new Error(response.error);
};

const settings = createMirroredSettings({
	readNative,
	writeNative,
	readLocal: (key) => storage.get(key),
	writeLocal: (key, value) => storage.set(key, value),
});

export const getStoredSetting = async <T>(
	key: string,
): Promise<T | undefined> => (await settings.read(key)) as T | undefined;

export const setStoredSetting = <T>(key: string, value: T): Promise<void> =>
	settings.write(key, value);

// Calls onChange whenever another context saves this setting.
export const subscribeToStoredSetting = <T>(
	key: string,
	onChange: (value: T) => void,
): void => {
	browser.runtime.onMessage.addListener((message) => {
		if (!isJsonSettingUpdatedMessage(message)) return;
		if (message.data.key !== key) return;
		onChange(JSON.parse(message.data.value) as T);
	});
};
