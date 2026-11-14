// ----------------------------------------------------------------------- //
//
// MODULE  : index.test.ts
//
// PURPOSE : Tests for the background script's toolbar icon updates
//
// CREATED : 11/14/2026
//
// ----------------------------------------------------------------------- //

import { beforeEach, expect, test, vi } from "vitest";

type TabUpdatedListener = (
	id: number,
	changeInfo: object,
	tab: { url?: string },
) => void;

type BackgroundMocks = {
	browser: Record<string, unknown>;
	onTabUpdated?: TabUpdatedListener;
};

const mocks: BackgroundMocks = vi.hoisted(() => ({ browser: {} }));

vi.mock("webextension-polyfill", () => ({ default: mocks.browser }));
vi.mock("~/shared/utils/native-settings", () => ({
	nativeGetAllSettings: vi.fn(() => Promise.resolve({})),
	nativeSetOneSetting: vi.fn(() => Promise.resolve()),
	nativeGetJsonSetting: vi.fn(() => Promise.resolve(null)),
	nativeSetJsonSetting: vi.fn(() => Promise.resolve()),
}));

// Returns a mock toolbar button API whose calls all succeed.
function mockToolbarApi() {
	return {
		setIcon: vi.fn(() => Promise.resolve()),
		setTitle: vi.fn(() => Promise.resolve()),
		enable: vi.fn(() => Promise.resolve()),
	};
}

// Builds a mock browser exposing only the toolbar API its manifest version has.
function mockBrowser(manifestVersion: number) {
	const toolbarApi = mockToolbarApi();
	const listener = { addListener: vi.fn() };
	Object.keys(mocks.browser).forEach((key) => {
		delete mocks.browser[key];
	});
	Object.assign(mocks.browser, {
		[manifestVersion === 2 ? "browserAction" : "action"]: toolbarApi,
		runtime: {
			getManifest: () => ({ manifest_version: manifestVersion }),
			getURL: (path: string) => `extension://id/${path}`,
			onInstalled: listener,
			onMessage: listener,
		},
		storage: {
			local: {
				get: vi.fn(() =>
					Promise.resolve({ "pages.migratedToNativeSettings": true }),
				),
				set: vi.fn(() => Promise.resolve()),
			},
		},
		tabs: {
			onUpdated: {
				addListener: (callback: TabUpdatedListener) => {
					mocks.onTabUpdated = callback;
				},
			},
		},
	});
	return toolbarApi;
}

// Loads a fresh background script and reports a navigation to a release page.
async function visitReleasePage(): Promise<void> {
	await import("./index");
	mocks.onTabUpdated?.(
		7,
		{},
		{ url: "https://rateyourmusic.com/release/album/a/b/" },
	);
}

beforeEach(() => {
	vi.resetModules();
	mocks.onTabUpdated = undefined;
});

test("updates the toolbar button through browserAction in a Manifest V2 build", async () => {
	const toolbarApi = mockBrowser(2);
	await visitReleasePage();
	await vi.waitFor(() => {
		expect(toolbarApi.setIcon).toHaveBeenCalledWith(
			expect.objectContaining({ tabId: 7 }),
		);
	});
	expect(toolbarApi.setTitle).toHaveBeenCalledWith({
		tabId: 7,
		title: "EvenBetterRYM enabled",
	});
	expect(toolbarApi.enable).toHaveBeenCalledWith(7);
});

test("updates the toolbar button through action in a Manifest V3 build", async () => {
	const toolbarApi = mockBrowser(3);
	await visitReleasePage();
	await vi.waitFor(() => {
		expect(toolbarApi.setIcon).toHaveBeenCalledWith(
			expect.objectContaining({ tabId: 7 }),
		);
	});
	expect(toolbarApi.enable).toHaveBeenCalledWith(7);
});
