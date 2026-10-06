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

export const getPageEnabled = async (key: PageKey): Promise<boolean> =>
	resolvePageEnabled(await getAllSettings(), key);

export const getAllPageEnabled = async (): Promise<
	Record<PageKey, boolean>
> => {
	const settings = await getAllSettings();

	return Object.fromEntries(
		(Object.keys(pages) as PageKey[]).map((key) => [
			key,
			resolvePageEnabled(settings, key),
		]),
	) as Record<PageKey, boolean>;
};

export const setPageEnabled = async (
	key: PageKey,
	enabled: boolean,
): Promise<void> => {
	await sendBackgroundMessage<SettingsSetRequest, SettingsSetResponse>({
		type: "settingsSet",
		data: { key, value: enabled },
	});
};

export const runPage = async (key: PageKey, callback: () => unknown) => {
	const enabled = await getPageEnabled(key);
	if (!enabled) return;

	try {
		await (callback() as Promise<unknown>);
	} catch {
		// Module failed to initialize (e.g. element not found on this layout)
	}
};
