// ----------------------------------------------------------------------- //
//
// MODULE  : settings.ts
//
// PURPOSE : Loading and saving chart shortcut key bindings
//
// CREATED : 8/22/2026
//
// ----------------------------------------------------------------------- //

import { equals } from "~/shared/utils/array";
import {
	getStoredSetting,
	setStoredSetting,
	subscribeToStoredSetting,
} from "~/shared/utils/stored-settings";

import type { ChartShortcutActionId } from "./actions";
import { CHART_SHORTCUT_ACTIONS } from "./actions";
import type { ChartShortcutBindings } from "./binding";

const BINDINGS_STORAGE_KEY = "brym.chartShortcutBindings";

type BindingOverrides = Partial<Record<ChartShortcutActionId, string[]>>;

export function defaultBindings(): ChartShortcutBindings {
	const result = {} as ChartShortcutBindings;
	for (const action of CHART_SHORTCUT_ACTIONS) {
		result[action.id] = [...action.defaultBindings];
	}
	return result;
}

function mergeOverrides(overrides: BindingOverrides): ChartShortcutBindings {
	const bindings = defaultBindings();
	for (const action of CHART_SHORTCUT_ACTIONS) {
		const override = overrides[action.id];
		if (override) bindings[action.id] = override;
	}
	return bindings;
}

function overridesFrom(bindings: ChartShortcutBindings): BindingOverrides {
	const defaults = defaultBindings();
	const overrides: BindingOverrides = {};
	for (const action of CHART_SHORTCUT_ACTIONS) {
		const isDefault = equals(bindings[action.id], defaults[action.id]);
		if (!isDefault) overrides[action.id] = bindings[action.id];
	}
	return overrides;
}

export async function getChartShortcutBindings(): Promise<ChartShortcutBindings> {
	return mergeOverrides(
		(await getStoredSetting<BindingOverrides>(BINDINGS_STORAGE_KEY)) ?? {},
	);
}

export async function setChartShortcutBindings(
	next: ChartShortcutBindings,
): Promise<void> {
	await setStoredSetting(BINDINGS_STORAGE_KEY, overridesFrom(next));
}

export function subscribeToChartShortcutBindings(
	onChange: (bindings: ChartShortcutBindings) => void,
): void {
	subscribeToStoredSetting<BindingOverrides>(
		BINDINGS_STORAGE_KEY,
		(overrides) => onChange(mergeOverrides(overrides)),
	);
}
