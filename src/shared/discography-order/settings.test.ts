import { beforeEach, expect, test, vi } from "vitest";
import * as storedSettings from "~/shared/utils/stored-settings";
import {
	defaultSectionOrder,
	getSectionOrder,
	parseSectionOrder,
	resetSectionOrder,
	setSectionOrder,
	watchSectionOrder,
} from "./settings";

vi.mock("~/shared/utils/stored-settings", () => ({
	getStoredSetting: vi.fn(),
	setStoredSetting: vi.fn(),
	subscribeToStoredSetting: vi.fn(),
}));

beforeEach(() => vi.resetAllMocks());

test("uses RYM's section order by default", async () => {
	expect(await getSectionOrder()).toEqual([
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
		"x",
	]);
});

test("restores a saved order", async () => {
	const saved = ["x", ...defaultSectionOrder.filter((type) => type !== "x")];
	vi.mocked(storedSettings.getStoredSetting).mockResolvedValue(saved);
	expect(await getSectionOrder()).toEqual(saved);
});

test("drops invalid and duplicate entries and inserts missing types after their default predecessor", () => {
	expect(
		parseSectionOrder(["x", "s", "s", "unknown", 3, "i", "l", "e", "m"]),
	).toEqual(["x", "s", "i", "o", "j", "a", "c", "v", "b", "d", "l", "e", "m"]);
	expect(parseSectionOrder("x")).toEqual(defaultSectionOrder);
});

test("persists and resets the order", async () => {
	await setSectionOrder(["x", "i"]);
	expect(storedSettings.setStoredSetting).toHaveBeenCalledExactlyOnceWith(
		"discography-order.types",
		["x", "i"],
	);
	await resetSectionOrder();
	expect(storedSettings.setStoredSetting).toHaveBeenLastCalledWith(
		"discography-order.types",
		defaultSectionOrder,
	);
});

test("notifies about saved order changes and restored defaults", () => {
	const unsubscribe = vi.fn();
	vi.mocked(storedSettings.subscribeToStoredSetting).mockReturnValue(
		unsubscribe,
	);
	const changed = vi.fn();
	const stop = watchSectionOrder(changed);
	const [key, onChange] = vi.mocked(storedSettings.subscribeToStoredSetting)
		.mock.calls[0];
	expect(key).toBe("discography-order.types");
	const saved = ["x", ...defaultSectionOrder.filter((type) => type !== "x")];
	onChange(saved);
	expect(changed).toHaveBeenLastCalledWith(saved);
	onChange(undefined);
	expect(changed).toHaveBeenLastCalledWith(defaultSectionOrder);
	stop();
	expect(unsubscribe).toHaveBeenCalledOnce();
});
