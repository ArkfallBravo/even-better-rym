// ----------------------------------------------------------------------- //
//
// MODULE  : mirrored-setting.ts
//
// PURPOSE : Settings kept in storage.local and mirrored to native storage
//
// CREATED : 10/2/2026
//
// ----------------------------------------------------------------------- //

const NATIVE_UNAVAILABLE = Symbol("native settings unavailable");

// readNative rejects when there's no native host (Chrome/Firefox).
export type SettingStores = {
	readNative: (key: string) => Promise<string | null>;
	writeNative: (key: string, json: string) => Promise<void>;
	readLocal: (key: string) => Promise<unknown>;
	writeLocal: (key: string, value: unknown) => Promise<void>;
};

export type MirroredSettings = {
	read: (key: string) => Promise<unknown>;
	write: (key: string, value: unknown) => Promise<void>;
};

const writeNativeBestEffort = async (
	stores: SettingStores,
	key: string,
	value: unknown,
): Promise<void> => {
	try {
		await stores.writeNative(key, JSON.stringify(value));
	} catch {
		// No native host on this build - storage.local alone holds the value.
	}
};

const readNativeIfAvailable = async (
	stores: SettingStores,
	key: string,
): Promise<string | null | typeof NATIVE_UNAVAILABLE> => {
	try {
		return await stores.readNative(key);
	} catch {
		return NATIVE_UNAVAILABLE;
	}
};

// Returns the native copy when there is one, healing whichever side is
// missing it: Safari's "clear history" wipes storage.local but not native
// storage, and settings saved before the mirror existed are only local.
const read = async (stores: SettingStores, key: string): Promise<unknown> => {
	const [local, native] = await Promise.all([
		stores.readLocal(key),
		readNativeIfAvailable(stores, key),
	]);

	if (native === NATIVE_UNAVAILABLE) return local;
	if (native === null) {
		if (local !== undefined) await writeNativeBestEffort(stores, key, local);
		return local;
	}

	const value = JSON.parse(native) as unknown;
	if (native !== JSON.stringify(local)) await stores.writeLocal(key, value);
	return value;
};

// Writes storage.local first, the source of truth on every browser, then
// mirrors to native storage.
const write = async (
	stores: SettingStores,
	key: string,
	value: unknown,
): Promise<void> => {
	await stores.writeLocal(key, value);
	await writeNativeBestEffort(stores, key, value);
};

// Returns read/write functions bound to the given stores.
export const createMirroredSettings = (
	stores: SettingStores,
): MirroredSettings => ({
	read: (key) => read(stores, key),
	write: (key, value) => write(stores, key, value),
});
