import {
	getStoredSetting,
	setStoredSetting,
} from "~/shared/utils/stored-settings";

import type { DisplayType } from "./types";

const displayTypeKey = "brym.missingLinksDisplayType";
export const defaultDisplayType = "available";

export const getDisplayType = async (): Promise<DisplayType> =>
	(await getStoredSetting<DisplayType>(displayTypeKey)) ?? defaultDisplayType;

export const setDisplayType = async (value: DisplayType): Promise<void> =>
	setStoredSetting(displayTypeKey, value);
