import { beforeEach, describe, expect, test, vi } from "vitest";

import * as storedSettings from "../utils/stored-settings";
import {
	defaultStreamLinkColors,
	defaultStreamLinkSettings,
	getStreamLinkSettings,
	setStreamLinkSettings,
} from "./settings";

vi.mock("../utils/stored-settings", () => ({
	getStoredSetting: vi.fn(),
	setStoredSetting: vi.fn(),
}));

beforeEach(() => {
	vi.resetAllMocks();
});

describe("stream link settings", () => {
	test("defaults to grey icons with branding colors ready to enable", async () => {
		vi.mocked(storedSettings.getStoredSetting).mockResolvedValue(undefined);
		await expect(getStreamLinkSettings()).resolves.toEqual(
			defaultStreamLinkSettings,
		);
		expect(defaultStreamLinkColors.spotify).toBe("#1db954");
		expect(defaultStreamLinkColors.soundcloud).toBe("#ff5500");
	});

	test("merges partial settings with new defaults and rejects invalid colors", async () => {
		vi.mocked(storedSettings.getStoredSetting).mockResolvedValue({
			useServiceColors: true,
			colors: { spotify: "#123ABC", soundcloud: "orange", youtube: null },
		});
		await expect(getStreamLinkSettings()).resolves.toEqual({
			useServiceColors: true,
			colors: { ...defaultStreamLinkColors, spotify: "#123ABC" },
		});
	});

	test("does not enable colors for an invalid stored flag", async () => {
		vi.mocked(storedSettings.getStoredSetting).mockResolvedValue({
			useServiceColors: "true",
		});
		await expect(getStreamLinkSettings()).resolves.toEqual(
			defaultStreamLinkSettings,
		);
	});

	test("persists custom colors even when disabled", async () => {
		const settings = {
			useServiceColors: false,
			colors: { ...defaultStreamLinkColors, spotify: "#445566" },
		};
		vi.mocked(storedSettings.setStoredSetting).mockResolvedValue(undefined);
		await setStreamLinkSettings(settings);
		expect(storedSettings.setStoredSetting).toHaveBeenCalledWith(
			"streamLinks.settings",
			settings,
		);
	});
});
