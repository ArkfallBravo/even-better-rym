import { getStoredSetting, setStoredSetting } from "../utils/stored-settings";

export type ReferenceLinkSettings = {
	buttonColor: string;
};

export const defaultReferenceLinkSettings: ReferenceLinkSettings = {
	buttonColor: "#60758a",
};

const isHexColor = (value: unknown): value is string =>
	typeof value === "string" && /^#[\da-f]{6}$/i.test(value);

export const getReferenceLinkSettings =
	async (): Promise<ReferenceLinkSettings> => {
		const settings = await getStoredSetting<Partial<ReferenceLinkSettings>>(
			"referenceLinks.settings",
		);
		return {
			buttonColor: isHexColor(settings?.buttonColor)
				? settings.buttonColor
				: defaultReferenceLinkSettings.buttonColor,
		};
	};

export const setReferenceLinkSettings = (
	settings: ReferenceLinkSettings,
): Promise<void> => setStoredSetting("referenceLinks.settings", settings);
