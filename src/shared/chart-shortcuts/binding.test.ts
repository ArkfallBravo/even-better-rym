import { describe, expect, test } from "vitest";

import type { ChartShortcutBindings } from "./binding";
import {
	comboFromEvent,
	findComboConflict,
	formatCombo,
	hasRequiredModifier,
	isModifierOnlyCode,
} from "./binding";

function keyCombo(overrides: Partial<Parameters<typeof comboFromEvent>[0]>) {
	return {
		code: "KeyA",
		ctrlKey: false,
		altKey: false,
		shiftKey: false,
		metaKey: false,
		...overrides,
	};
}

describe("comboFromEvent", () => {
	test("orders modifiers as ctrl, alt, shift, meta", () => {
		expect(
			comboFromEvent(
				keyCombo({
					code: "KeyZ",
					ctrlKey: true,
					altKey: true,
					shiftKey: true,
					metaKey: true,
				}),
			),
		).toBe("ctrl+alt+shift+meta+KeyZ");
	});

	test("includes only the held modifiers", () => {
		expect(comboFromEvent(keyCombo({ code: "KeyD", ctrlKey: true }))).toBe(
			"ctrl+KeyD",
		);
	});

	test("uses the physical code, not the shifted character, for a digit", () => {
		// On a US layout, shift+1 reports event.key === "!" - comboFromEvent must
		// stay layout/shift independent by keying off event.code instead.
		expect(
			comboFromEvent(
				keyCombo({ code: "Digit1", ctrlKey: true, shiftKey: true }),
			),
		).toBe("ctrl+shift+Digit1");
	});

	test("has no modifiers when none are held", () => {
		expect(comboFromEvent(keyCombo({ code: "Enter" }))).toBe("Enter");
	});
});

describe("formatCombo", () => {
	test("formats a digit combo", () => {
		expect(formatCombo("ctrl+shift+Digit1", false)).toBe("Ctrl + Shift + 1");
	});

	test("formats a letter combo", () => {
		expect(formatCombo("ctrl+KeyZ", false)).toBe("Ctrl + Z");
	});

	test("formats named keys as-is", () => {
		expect(formatCombo("ctrl+Enter", false)).toBe("Ctrl + Enter");
		expect(formatCombo("ctrl+Space", false)).toBe("Ctrl + Space");
	});

	test("formats meta as Command", () => {
		expect(formatCombo("meta+KeyA", false)).toBe("Command + A");
	});

	test("formats ctrl and alt as Ctrl/Alt off Mac", () => {
		expect(formatCombo("ctrl+alt+KeyA", false)).toBe("Ctrl + Alt + A");
	});

	test("formats modifiers as glyphs, space-separated, on Mac", () => {
		expect(formatCombo("ctrl+alt+shift+meta+KeyA", true)).toBe("⌃ ⌥ ⇧ ⌘ A");
	});
});

describe("isModifierOnlyCode", () => {
	test("recognizes modifier codes", () => {
		expect(isModifierOnlyCode("ControlLeft")).toBe(true);
		expect(isModifierOnlyCode("ShiftRight")).toBe(true);
		expect(isModifierOnlyCode("MetaLeft")).toBe(true);
		expect(isModifierOnlyCode("AltRight")).toBe(true);
	});

	test("does not flag a real key", () => {
		expect(isModifierOnlyCode("KeyZ")).toBe(false);
		expect(isModifierOnlyCode("Digit1")).toBe(false);
	});
});

describe("hasRequiredModifier", () => {
	test("rejects a bare key", () => {
		expect(hasRequiredModifier("KeyZ")).toBe(false);
	});

	test("rejects shift-only", () => {
		expect(hasRequiredModifier("shift+KeyD")).toBe(false);
	});

	test("accepts ctrl", () => {
		expect(hasRequiredModifier("ctrl+KeyZ")).toBe(true);
	});

	test("accepts alt", () => {
		expect(hasRequiredModifier("alt+KeyZ")).toBe(true);
	});

	test("accepts meta", () => {
		expect(hasRequiredModifier("meta+KeyZ")).toBe(true);
	});

	test("accepts ctrl combined with shift", () => {
		expect(hasRequiredModifier("ctrl+shift+Digit1")).toBe(true);
	});
});

describe("findComboConflict", () => {
	const bindings = {
		includeGenre: ["ctrl+Digit1"],
		includeInfluence: ["ctrl+Digit2"],
		updateChart: ["ctrl+Enter", "ctrl+Space"],
	} as unknown as ChartShortcutBindings;

	test("finds the action already using a combo", () => {
		expect(findComboConflict(bindings, "ctrl+Digit2", "includeGenre")).toBe(
			"includeInfluence",
		);
	});

	test("finds a conflict against either of an action's multiple combos", () => {
		expect(findComboConflict(bindings, "ctrl+Space", "includeGenre")).toBe(
			"updateChart",
		);
	});

	test("returns null when the combo is unused", () => {
		expect(findComboConflict(bindings, "ctrl+KeyZ", "includeGenre")).toBeNull();
	});

	test("ignores the excluded action's own combo", () => {
		expect(
			findComboConflict(bindings, "ctrl+Digit1", "includeGenre"),
		).toBeNull();
	});
});
