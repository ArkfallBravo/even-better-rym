import browser from "webextension-polyfill";

import { isKeybindingsUpdatedMessage } from "~/shared/utils/messaging";
import * as storage from "~/shared/utils/storage";

import type { ChartShortcutActionId } from "./actions";
import { CHART_SHORTCUT_ACTIONS } from "./actions";
import type { ChartShortcutBindings } from "./binding";
import { resolveDefaultBindings } from "./binding";

const BINDINGS_STORAGE_KEY = "brym.chartShortcutBindings";

type BindingOverrides = Partial<Record<ChartShortcutActionId, string[]>>;

export function defaultBindings(): ChartShortcutBindings {
	const result = {} as ChartShortcutBindings;
	for (const action of CHART_SHORTCUT_ACTIONS) {
		result[action.id] = resolveDefaultBindings(action.defaultBindings);
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
		const isDefault =
			JSON.stringify(bindings[action.id]) ===
			JSON.stringify(defaults[action.id]);
		if (!isDefault) overrides[action.id] = bindings[action.id];
	}
	return overrides;
}

export async function getChartShortcutBindings(): Promise<ChartShortcutBindings> {
	const overrides =
		(await storage.get<BindingOverrides>(BINDINGS_STORAGE_KEY)) ?? {};
	return mergeOverrides(overrides);
}

export async function setChartShortcutBindings(
	next: ChartShortcutBindings,
): Promise<void> {
	const overrides = overridesFrom(next);
	await storage.set(BINDINGS_STORAGE_KEY, overrides);

	// Tells any already-open chart page to pick up the change immediately -
	// see the background script's "keybindingsChanged" listener. storage.local
	// above is already the source of truth, so this is a best-effort nudge.
	void browser.runtime.sendMessage({
		type: "keybindingsChanged",
		data: { value: JSON.stringify(overrides) },
	});
}

export function subscribeToChartShortcutBindings(
	onChange: (bindings: ChartShortcutBindings) => void,
): void {
	browser.runtime.onMessage.addListener((message) => {
		if (!isKeybindingsUpdatedMessage(message)) return;
		const overrides = JSON.parse(message.data.value) as BindingOverrides;
		onChange(mergeOverrides(overrides));
	});
}
