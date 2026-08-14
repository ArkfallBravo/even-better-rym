import type { Dispatch, StateUpdater } from "preact/hooks";
import { parseError } from "~/shared/utils/error";
import {
	complete,
	failed,
	loading,
	type OneShot,
} from "~/shared/utils/one-shot";

export type CheckResults<T> = Record<string, OneShot<Error, T>>;

// Runs `check` for every item in parallel, tracking each result as a OneShot keyed by `getKey(item)`.
export async function runChecks<Item, T>(
	items: Item[],
	getKey: (item: Item) => string,
	check: (item: Item) => Promise<T>,
	setResults: Dispatch<StateUpdater<CheckResults<T>>>,
): Promise<void> {
	setResults(Object.fromEntries(items.map((item) => [getKey(item), loading])));

	await Promise.all(
		items.map(async (item) => {
			const key = getKey(item);
			try {
				const data = await check(item);
				setResults((previous) => ({ ...previous, [key]: complete(data) }));
			} catch (error) {
				setResults((previous) => ({
					...previous,
					[key]: failed(parseError(error)),
				}));
			}
		}),
	);
}
