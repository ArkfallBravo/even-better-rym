import browser from "webextension-polyfill";

// `getBytesInUse` exists in Chrome/Firefox but isn't in webextension-polyfill's
// types, and Safari's support for it is unconfirmed - typed as optional so we
// can probe for it safely rather than assuming it exists.
type LocalStorageAreaWithBytesInUse = typeof browser.storage.local & {
	getBytesInUse?: (keys?: string | string[] | null) => Promise<number>;
};

export const get = async <T>(key: string): Promise<T | undefined> => {
	const response = await browser.storage.local.get(key);
	console.log(
		"[storage debug] get",
		key,
		"->",
		response[key],
		new Date().toISOString(),
	);
	return response[key] as T;
};

export const getAll = (): Promise<Record<string, unknown>> =>
	browser.storage.local.get();

export const set = async <T>(key: string, value: T): Promise<void> => {
	console.log(
		"[storage debug] set start",
		key,
		"=",
		value,
		new Date().toISOString(),
	);
	await browser.storage.local.set({ [key]: value });
	console.log(
		"[storage debug] set done",
		key,
		"=",
		value,
		new Date().toISOString(),
	);
	try {
		const storageLocal = browser.storage
			.local as LocalStorageAreaWithBytesInUse;
		const bytes = await storageLocal.getBytesInUse?.(null);
		console.log("[storage debug] bytes in use", bytes ?? "unsupported");
	} catch (error) {
		console.log("[storage debug] getBytesInUse failed", error);
	}
};

export const remove = (key: string): Promise<void> =>
	browser.storage.local.remove(key);
