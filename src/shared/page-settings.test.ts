import { beforeEach, expect, test, vi } from "vitest";

import {
	getAllModulesEnabled,
	getModuleEnabled,
	runModule,
	setModuleEnabled,
} from "./page-settings";

const toggles = vi.hoisted(() => new Map<string, boolean>());
const stored = vi.hoisted(() => new Map<string, unknown>());

vi.mock("./utils/messaging", () => ({
	sendBackgroundMessage: vi.fn(
		(message: { type: string; data?: { key: string; value: boolean } }) => {
			if (message.type === "settingsSet" && message.data) {
				toggles.set(message.data.key, message.data.value);
			}
			return Promise.resolve({ data: Object.fromEntries(toggles) });
		},
	),
}));
vi.mock("./utils/stored-settings", () => ({
	getStoredSetting: vi.fn((key: string) => Promise.resolve(stored.get(key))),
}));

beforeEach(() => {
	toggles.clear();
	stored.clear();
});

test("enables profile edits and follow status by default", async () => {
	expect(await getModuleEnabled("followStatus")).toBe(true);
	expect(await getModuleEnabled("userPage")).toBe(true);
	expect((await getAllModulesEnabled()).followStatus).toBe(true);
});

test("enables follow status independently of the old user-page module", async () => {
	toggles.set("userPage", false);
	const enabled = await getAllModulesEnabled();
	expect(enabled.followStatus).toBe(true);
	expect(enabled.userPage).toBe(false);
	expect(await getModuleEnabled("followStatus")).toBe(true);
});

test("can toggle follow status independently of profile editing", async () => {
	toggles.set("userPage", false);
	await setModuleEnabled("followStatus", true);
	expect(await getModuleEnabled("followStatus")).toBe(true);
	expect(await getModuleEnabled("userPage")).toBe(false);
	await setModuleEnabled("userPage", true);
	await setModuleEnabled("followStatus", false);
	expect(await getModuleEnabled("userPage")).toBe(true);
	expect(await getModuleEnabled("followStatus")).toBe(false);
});

test("the standalone switch gates the module callback", async () => {
	const callback = vi.fn();
	await setModuleEnabled("followStatus", false);
	await runModule("followStatus", callback);
	expect(callback).not.toHaveBeenCalled();
	await setModuleEnabled("followStatus", true);
	await runModule("followStatus", callback);
	expect(callback).toHaveBeenCalledOnce();
});

test("retains other module settings and defaults", async () => {
	toggles.set("searchFocus", false);
	const enabled = await getAllModulesEnabled();
	expect(enabled.searchFocus).toBe(false);
	expect(enabled.hideReviews).toBe(false);
	expect(enabled.hideRatings).toBe(true);
	expect(await getModuleEnabled("hideCommentBoxes")).toBe(false);
	expect(enabled.discographyOrder).toBe(false);
});

test("derives section ordering enablement from the order, ignoring the old switch", async () => {
	toggles.set("discographyOrder", true);
	expect(await getModuleEnabled("discographyOrder")).toBe(false);
	expect((await getAllModulesEnabled()).discographyOrder).toBe(false);
	toggles.set("discographyOrder", false);
	stored.set("discography-order.types", [
		"x",
		"s",
		"l",
		"m",
		"e",
		"i",
		"o",
		"j",
		"a",
		"c",
		"v",
		"b",
		"d",
	]);
	expect(await getModuleEnabled("discographyOrder")).toBe(true);
	expect((await getAllModulesEnabled()).discographyOrder).toBe(true);
	stored.delete("discography-order.types");
	expect(await getModuleEnabled("discographyOrder")).toBe(false);
});
