import type { PageKey } from "./pages";
import type {
	SettingsGetAllRequest,
	SettingsGetAllResponse,
	SettingsSetRequest,
	SettingsSetResponse,
} from "./utils/messaging";
import { sendBackgroundMessage } from "./utils/messaging";

export const getPageEnabled = async (key: PageKey): Promise<boolean> => {
	const response = await sendBackgroundMessage<
		SettingsGetAllRequest,
		SettingsGetAllResponse
	>({ type: "settingsGetAll" });
	return response.data[key] ?? true;
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
