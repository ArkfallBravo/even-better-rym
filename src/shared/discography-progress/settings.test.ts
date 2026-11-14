import { beforeEach, expect, test, vi } from "vitest";
import * as storedSettings from "~/shared/utils/stored-settings";
import {
	getHideZeroCoverage,
	getSelectedTypes,
	setHideZeroCoverage,
	setSelectedTypes,
	watchHideZeroCoverage,
	watchSelectedTypes,
} from "./settings";

vi.mock("~/shared/utils/stored-settings", () => ({
	getStoredSetting: vi.fn(),
	setStoredSetting: vi.fn(),
	subscribeToStoredSetting: vi.fn(),
}));

beforeEach(() => vi.resetAllMocks());

test("includes only albums, EPs and mixtapes by default", async () => {
	expect(await getSelectedTypes()).toEqual(new Set(["s", "e", "m"]));
});

test.each([
	undefined,
	null,
	false,
	"true",
	1,
])("shows zero coverage by default and ignores invalid stored values: %s", async (stored) => {
	vi.mocked(storedSettings.getStoredSetting).mockResolvedValue(stored);
	expect(await getHideZeroCoverage()).toBe(false);
});

test("persists and restores hiding zero coverage without changing selected types", async () => {
	await setHideZeroCoverage(true);
	expect(storedSettings.setStoredSetting).toHaveBeenCalledExactlyOnceWith(
		"discography-progress.hide-zero-coverage",
		true,
	);
	vi.mocked(storedSettings.getStoredSetting).mockResolvedValue(true);
	expect(await getHideZeroCoverage()).toBe(true);
	await setHideZeroCoverage(false);
	expect(storedSettings.setStoredSetting).toHaveBeenLastCalledWith(
		"discography-progress.hide-zero-coverage",
		false,
	);
});

// Starts a watcher and returns the change handler it subscribed with.
const subscribedHandler = (key: string) => {
	const calls = vi.mocked(storedSettings.subscribeToStoredSetting).mock.calls;
	const [subscribedKey, onChange] = calls[calls.length - 1];
	expect(subscribedKey).toBe(key);
	return onChange;
};

test("updates zero coverage visibility on saved changes and restores the default when cleared", () => {
	const unsubscribe = vi.fn();
	vi.mocked(storedSettings.subscribeToStoredSetting).mockReturnValue(
		unsubscribe,
	);
	const changed = vi.fn();
	const stop = watchHideZeroCoverage(changed);
	const onChange = subscribedHandler("discography-progress.hide-zero-coverage");
	onChange(true);
	expect(changed).toHaveBeenLastCalledWith(true);
	onChange(undefined);
	expect(changed).toHaveBeenLastCalledWith(false);
	stop();
	expect(unsubscribe).toHaveBeenCalledOnce();
});

test("notifies open pages about saved selection changes and restored defaults", () => {
	const unsubscribe = vi.fn();
	vi.mocked(storedSettings.subscribeToStoredSetting).mockReturnValue(
		unsubscribe,
	);
	const changed = vi.fn();
	const stop = watchSelectedTypes(changed);
	const onChange = subscribedHandler("discography-progress.types");
	onChange(["j"]);
	expect(changed).toHaveBeenLastCalledWith(new Set(["j"]));
	onChange(undefined);
	expect(changed).toHaveBeenLastCalledWith(new Set(["s", "e", "m"]));
	stop();
	expect(unsubscribe).toHaveBeenCalledOnce();
});

test("preserves empty choices and removes unknown release types", async () => {
	vi.mocked(storedSettings.getStoredSetting).mockResolvedValueOnce([]);
	expect(await getSelectedTypes()).toEqual(new Set());
	vi.mocked(storedSettings.getStoredSetting).mockResolvedValueOnce([
		"s",
		"e",
		"unknown",
	]);
	expect(await getSelectedTypes()).toEqual(new Set(["s", "e"]));
});

test("persists choices across artists", async () => {
	await setSelectedTypes(new Set(["s", "l"]));
	expect(storedSettings.setStoredSetting).toHaveBeenCalledWith(
		"discography-progress.types",
		["s", "l"],
	);
});

test("preserves saved mixtape and DJ mix choices", async () => {
	vi.mocked(storedSettings.getStoredSetting).mockResolvedValueOnce(["m", "j"]);
	const selected = await getSelectedTypes();
	expect(selected).toEqual(new Set(["m", "j"]));
	await setSelectedTypes(selected);
	expect(storedSettings.setStoredSetting).toHaveBeenCalledWith(
		"discography-progress.types",
		["m", "j"],
	);
});
