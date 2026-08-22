import browser from "webextension-polyfill";

import type {
	KeybindingsGetRequest,
	KeybindingsGetResponse,
	KeybindingsSetRequest,
	KeybindingsSetResponse,
} from "~/shared/utils/messaging";
import {
	isKeybindingsUpdatedMessage,
	sendBackgroundMessage,
} from "~/shared/utils/messaging";
import * as storage from "~/shared/utils/storage";

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
		const isDefault =
			JSON.stringify(bindings[action.id]) ===
			JSON.stringify(defaults[action.id]);
		if (!isDefault) overrides[action.id] = bindings[action.id];
	}
	return overrides;
}

async function readLocalOverrides(): Promise<BindingOverrides> {
	return (await storage.get<BindingOverrides>(BINDINGS_STORAGE_KEY)) ?? {};
}

async function writeLocalOverrides(overrides: BindingOverrides): Promise<void> {
	await storage.set(BINDINGS_STORAGE_KEY, overrides);
}

export async function getChartShortcutBindings(): Promise<ChartShortcutBindings> {
	try {
		const response = await sendBackgroundMessage<
			KeybindingsGetRequest,
			KeybindingsGetResponse
		>({ type: "keybindingsGet" });

		if (response.data != null) {
			const overrides = JSON.parse(response.data) as BindingOverrides;
			const current = await readLocalOverrides();
			if (JSON.stringify(overrides) !== JSON.stringify(current)) {
				await writeLocalOverrides(overrides);
			}
			return mergeOverrides(overrides);
		}
	} catch {
		// No native host on this build (Chrome/Firefox) - fall through to storage.local.
	}

	return mergeOverrides(await readLocalOverrides());
}

export async function setChartShortcutBindings(
	next: ChartShortcutBindings,
): Promise<void> {
	const overrides = overridesFrom(next);
	await writeLocalOverrides(overrides);

	try {
		await sendBackgroundMessage<KeybindingsSetRequest, KeybindingsSetResponse>({
			type: "keybindingsSet",
			data: { value: JSON.stringify(overrides) },
		});
	} catch {
		// Best-effort mirror only - storage.local above is already the source of truth.
	}
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
