import { describe, expect, test } from "vitest";

import { CHART_SHORTCUT_ACTIONS } from "./actions";

describe("CHART_SHORTCUT_ACTIONS", () => {
	test("has 31 actions", () => {
		expect(CHART_SHORTCUT_ACTIONS).toHaveLength(31);
	});

	test("every action id is unique", () => {
		const ids = CHART_SHORTCUT_ACTIONS.map((action) => action.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	test("every action has at least one default binding", () => {
		for (const action of CHART_SHORTCUT_ACTIONS) {
			expect(action.defaultBindings.length).toBeGreaterThan(0);
		}
	});

	test("no two actions ship a colliding default binding", () => {
		const seen = new Map<string, string>();
		for (const action of CHART_SHORTCUT_ACTIONS) {
			for (const combo of action.defaultBindings) {
				const owner = seen.get(combo);
				expect(
					owner,
					`"${combo}" claimed by both ${owner} and ${action.id}`,
				).toBeUndefined();
				seen.set(combo, action.id);
			}
		}
	});
});
