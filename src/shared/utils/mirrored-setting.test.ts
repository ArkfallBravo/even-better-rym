// ----------------------------------------------------------------------- //
//
// MODULE  : mirrored-setting.test.ts
//
// PURPOSE : Tests for the storage.local/native settings mirror
//
// CREATED : 10/2/2026
//
// ----------------------------------------------------------------------- //

import { describe, expect, it } from "vitest";

import type { SettingStores } from "./mirrored-setting";
import { createMirroredSettings } from "./mirrored-setting";

const KEY = "brym.example";

type FakeStores = SettingStores & {
	native: Map<string, string>;
	local: Map<string, unknown>;
	nativeWriteAttempts: () => number;
};

const createFakeStores = (hasNativeHost = true): FakeStores => {
	const native = new Map<string, string>();
	const local = new Map<string, unknown>();
	let nativeWriteAttempts = 0;
	const requireHost = () => {
		if (!hasNativeHost) throw new Error("no native host");
	};
	return {
		native,
		local,
		nativeWriteAttempts: () => nativeWriteAttempts,
		readNative: (key) => {
			requireHost();
			return Promise.resolve(native.get(key) ?? null);
		},
		writeNative: (key, json) => {
			nativeWriteAttempts += 1;
			requireHost();
			native.set(key, json);
			return Promise.resolve();
		},
		readLocal: (key) => Promise.resolve(local.get(key)),
		writeLocal: (key, value) => {
			local.set(key, value);
			return Promise.resolve();
		},
	};
};

describe("createMirroredSettings", () => {
	it("returns undefined when neither store has the key", async () => {
		const settings = createMirroredSettings(createFakeStores());
		expect(await settings.read(KEY)).toBeUndefined();
	});

	it("writes to both stores", async () => {
		const stores = createFakeStores();
		await createMirroredSettings(stores).write(KEY, { a: true });
		expect(stores.local.get(KEY)).toEqual({ a: true });
		expect(stores.native.get(KEY)).toBe('{"a":true}');
	});

	it("restores storage.local from native after it was cleared", async () => {
		const stores = createFakeStores();
		stores.native.set(KEY, '{"a":false}');
		expect(await createMirroredSettings(stores).read(KEY)).toEqual({
			a: false,
		});
		expect(stores.local.get(KEY)).toEqual({ a: false });
	});

	it("prefers the native copy when the two differ", async () => {
		const stores = createFakeStores();
		stores.native.set(KEY, '"native"');
		stores.local.set(KEY, "local");
		expect(await createMirroredSettings(stores).read(KEY)).toBe("native");
		expect(stores.local.get(KEY)).toBe("native");
	});

	it("copies a local-only value to native", async () => {
		const stores = createFakeStores();
		stores.local.set(KEY, { a: true });
		expect(await createMirroredSettings(stores).read(KEY)).toEqual({
			a: true,
		});
		expect(stores.native.get(KEY)).toBe('{"a":true}');
	});

	it("falls back to storage.local without a native host", async () => {
		const stores = createFakeStores(false);
		const settings = createMirroredSettings(stores);
		await settings.write(KEY, 3);
		expect(await settings.read(KEY)).toBe(3);
		expect(stores.native.size).toBe(0);
	});

	it("doesn't try to copy to native when there's no native host", async () => {
		const stores = createFakeStores(false);
		stores.local.set(KEY, 3);
		await createMirroredSettings(stores).read(KEY);
		expect(stores.nativeWriteAttempts()).toBe(0);
	});
});
