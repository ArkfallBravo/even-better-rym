// ----------------------------------------------------------------------- //
//
// MODULE  : page-settings.ts
//
// PURPOSE : Reading and setting each feature's enabled state
//
// CREATED : 3/14/2026
//
// ----------------------------------------------------------------------- //

import {
	getSectionOrder,
	isDefaultSectionOrder,
} from "./discography-order/settings";
import { resolvePageEnabled } from "./page-enabled";
import { type PageKey, pages } from "./pages";
import type {
	SettingsGetAllRequest,
	SettingsGetAllResponse,
	SettingsSetRequest,
	SettingsSetResponse,
} from "./utils/messaging";
import { sendBackgroundMessage } from "./utils/messaging";

const getAllSettings = async (): Promise<Partial<Record<string, boolean>>> => {
	const response = await sendBackgroundMessage<
		SettingsGetAllRequest,
		SettingsGetAllResponse
	>({ type: "settingsGetAll" });
	return response.data;
};

// Checks whether the user has saved a discography section order other than RYM's.
const hasCustomSectionOrder = async (): Promise<boolean> =>
	!isDefaultSectionOrder(await getSectionOrder());

export const getModuleEnabled = async (key: PageKey): Promise<boolean> =>
	key === "discographyOrder"
		? hasCustomSectionOrder()
		: resolvePageEnabled(await getAllSettings(), key);

export const getAllModulesEnabled = async (): Promise<
	Record<PageKey, boolean>
> => {
	const [settings, sectionOrderIsCustom] = await Promise.all([
		getAllSettings(),
		hasCustomSectionOrder(),
	]);

	return Object.fromEntries(
		(Object.keys(pages) as PageKey[]).map((key) => [
			key,
			key === "discographyOrder"
				? sectionOrderIsCustom
				: resolvePageEnabled(settings, key),
		]),
	) as Record<PageKey, boolean>;
};

export const setModuleEnabled = async (
	key: PageKey,
	enabled: boolean,
): Promise<void> => {
	await sendBackgroundMessage<SettingsSetRequest, SettingsSetResponse>({
		type: "settingsSet",
		data: { key, value: enabled },
	});
};

export const runModule = async (key: PageKey, callback: () => unknown) => {
	const enabled = await getModuleEnabled(key);
	if (!enabled) return;

	try {
		await (callback() as Promise<unknown>);
	} catch {
		// Module failed to initialize (e.g. element not found on this layout)
	}
};
