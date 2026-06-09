import browser from "webextension-polyfill";

export const get = async <T>(key: string): Promise<T | undefined> => {
	const response = await browser.storage.sync.get(key);
	return response[key] as T;
};

export const getAll = (): Promise<Record<string, unknown>> =>
	browser.storage.sync.get();

export const set = <T>(key: string, value: T): Promise<void> =>
	browser.storage.sync.set({ [key]: value });

export const remove = (key: string): Promise<void> =>
	browser.storage.sync.remove(key);
