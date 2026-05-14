import type { BrowseResult } from "./browse-api";
import { findExactMatch } from "./browse-api";

export type TokenizeOutput = {
	matched: BrowseResult[];
	unmatched: string[];
};

const splitWords = (text: string): string[] =>
	text
		.replace(/,/g, " ")
		.split(/\s+/u)
		.filter((w) => w.length > 0);

// Greedy left-to-right: at each position, try the longest substring (in words)
// that matches a known genre/descriptor; advance past it. If no substring
// starting at this word matches, drop the word into `unmatched` and advance.
export const tokenize = async (
	text: string,
	type: "genre" | "descriptor",
): Promise<TokenizeOutput> => {
	const words = splitWords(text);
	const matched: BrowseResult[] = [];
	const unmatched: string[] = [];

	let i = 0;
	while (i < words.length) {
		let found: BrowseResult | undefined;
		let foundEnd = i + 1;
		for (let j = words.length; j > i; j--) {
			const sub = words.slice(i, j).join(" ");
			// eslint-disable-next-line no-await-in-loop
			const m = await findExactMatch(sub, type);
			if (m) {
				found = m;
				foundEnd = j;
				break;
			}
		}
		if (found) {
			matched.push(found);
			i = foundEnd;
		} else {
			unmatched.push(words[i] ?? "");
			i++;
		}
	}

	return { matched, unmatched };
};
