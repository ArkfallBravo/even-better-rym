import { beforeEach, describe, expect, test, vi } from "vitest";

import * as storedSettings from "../utils/stored-settings";
import {
	defaultReferenceLinkSettings,
	getReferenceLinkSettings,
	setReferenceLinkSettings,
} from "./settings";

vi.mock("../utils/stored-settings", () => ({
	getStoredSetting: vi.fn(),
	setStoredSetting: vi.fn(),
}));

describe("reference link settings", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	test("returns defaults when no settings are stored", async () => {
		vi.mocked(storedSettings.getStoredSetting).mockResolvedValue(undefined);

		await expect(getReferenceLinkSettings()).resolves.toEqual(
			defaultReferenceLinkSettings,
		);
	});

	test("uses defaults for invalid stored colors and preserves valid colors", async () => {
		vi.mocked(storedSettings.getStoredSetting).mockResolvedValue({
			buttonColor: "blue",
		});

		await expect(getReferenceLinkSettings()).resolves.toEqual({
			buttonColor: defaultReferenceLinkSettings.buttonColor,
		});
	});

	test("stores the selected colors", async () => {
		const settings = {
			buttonColor: "#445566",
		};
		vi.mocked(storedSettings.setStoredSetting).mockResolvedValue(undefined);

		await expect(setReferenceLinkSettings(settings)).resolves.toBeUndefined();
		expect(storedSettings.setStoredSetting).toHaveBeenCalledWith(
			"referenceLinks.settings",
			settings,
		);
	});
});
