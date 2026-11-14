import { SERVICE_IDS, type ServiceId } from "../services/types";
import { getStoredSetting, setStoredSetting } from "../utils/stored-settings";

export type StreamLinkSettings = {
	useServiceColors: boolean;
	colors: Partial<Record<ServiceId, string>>;
};

export const defaultStreamLinkColors: Partial<Record<ServiceId, string>> = {
	applemusic: "#fa243c",
	bandcamp: "#629aa9",
	soundcloud: "#ff5500",
	spotify: "#1db954",
	youtube: "#ff0000",
	deezer: "#a238ff",
	qobuz: "#007fb0",
	tidal: "#000000",
};

export const defaultStreamLinkSettings: StreamLinkSettings = {
	useServiceColors: false,
	colors: defaultStreamLinkColors,
};

export const getStreamLinkSettings = async (): Promise<StreamLinkSettings> => {
	const settings = await getStoredSetting<Partial<StreamLinkSettings>>(
		"streamLinks.settings",
	);
	const colors = { ...defaultStreamLinkColors };
	for (const id of SERVICE_IDS) {
		const color = settings?.colors?.[id];
		if (typeof color === "string" && /^#[\da-f]{6}$/i.test(color)) {
			colors[id] = color;
		}
	}
	return {
		useServiceColors: settings?.useServiceColors === true,
		colors,
	};
};

export const setStreamLinkSettings = (
	settings: StreamLinkSettings,
): Promise<void> => setStoredSetting("streamLinks.settings", settings);
