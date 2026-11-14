import type { ReleaseType } from "~/shared/release-types";
import {
	getStoredSetting,
	setStoredSetting,
	subscribeToStoredSetting,
} from "~/shared/utils/stored-settings";
import {
	defaultSectionOrder,
	parseSectionOrder,
	sectionOrderKey,
} from "./order";

export {
	defaultSectionOrder,
	isDefaultSectionOrder,
	parseSectionOrder,
} from "./order";

const key = sectionOrderKey;

export async function getSectionOrder(): Promise<ReleaseType[]> {
	return parseSectionOrder(await getStoredSetting<unknown>(key));
}

export function setSectionOrder(order: readonly ReleaseType[]): Promise<void> {
	return setStoredSetting(key, [...order]);
}

export function resetSectionOrder(): Promise<void> {
	return setStoredSetting(key, [...defaultSectionOrder]);
}

export function watchSectionOrder(
	callback: (order: ReleaseType[]) => void,
): () => void {
	return subscribeToStoredSetting<unknown>(key, (value) =>
		callback(parseSectionOrder(value)),
	);
}
