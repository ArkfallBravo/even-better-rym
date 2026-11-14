import { type ReleaseType, releaseTypes } from "~/shared/release-types";
import {
	getStoredSetting,
	setStoredSetting,
	subscribeToStoredSetting,
} from "~/shared/utils/stored-settings";

const key = "discography-progress.types";
const hideZeroCoverageKey = "discography-progress.hide-zero-coverage";
export const defaultSelectedTypes: readonly ReleaseType[] = ["s", "e", "m"];

function parseSelectedTypes(stored: unknown): Set<ReleaseType> {
	return new Set(
		(Object.keys(releaseTypes) as ReleaseType[]).filter((type) =>
			Array.isArray(stored)
				? stored.includes(type)
				: defaultSelectedTypes.includes(type),
		),
	);
}

export async function getSelectedTypes(): Promise<Set<ReleaseType>> {
	return parseSelectedTypes(await getStoredSetting<unknown>(key));
}

export function setSelectedTypes(types: Set<ReleaseType>): Promise<void> {
	return setStoredSetting(key, [...types]);
}

export function watchSelectedTypes(
	callback: (selected: Set<ReleaseType>) => void,
): () => void {
	return watchSetting(key, parseSelectedTypes, callback);
}

export async function getHideZeroCoverage(): Promise<boolean> {
	return (await getStoredSetting<unknown>(hideZeroCoverageKey)) === true;
}

export function setHideZeroCoverage(hide: boolean): Promise<void> {
	return setStoredSetting(hideZeroCoverageKey, hide);
}

export function watchHideZeroCoverage(
	callback: (hide: boolean) => void,
): () => void {
	return watchSetting(hideZeroCoverageKey, (value) => value === true, callback);
}

function watchSetting<T>(
	settingKey: string,
	parse: (value: unknown) => T,
	callback: (value: T) => void,
): () => void {
	return subscribeToStoredSetting<unknown>(settingKey, (value) =>
		callback(parse(value)),
	);
}
