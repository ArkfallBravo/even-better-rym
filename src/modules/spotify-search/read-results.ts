// ----------------------------------------------------------------------- //
//
// MODULE  : read-results.ts
//
// PURPOSE : Reads the best matching result from Spotify's search page
//
// CREATED : 10/5/2026
//
// ----------------------------------------------------------------------- //

import type { SearchCategory } from "./messages";
import { matchTitle, normalizeSearchText } from "./title-match";

export const readSpotifySearchPage = async (
	artist: string,
	title: string,
	category: SearchCategory = "albums",
	releaseType: "single" | "music video" | null = null,
): Promise<string | undefined> => {
	const RESULTS_TIMEOUT = 7_000;
	const artistName = normalizeSearchText(artist);
	const entity = category === "albums" ? "album" : "track";
	const resultSelector = `a[href^="/${entity}/"], a[href^="https://open.spotify.com/${entity}/"]`;

	const find = () => {
		if (
			location.hostname !== "open.spotify.com" ||
			!location.pathname.startsWith("/search/")
		) {
			throw new Error("Spotify search page was redirected");
		}
		const main = document.querySelector("main");
		const renderError =
			!main &&
			(document.body?.textContent?.includes("Something went wrong") ?? false) &&
			(document.body?.textContent?.includes("Reload page") ?? false);
		const links =
			main?.querySelectorAll<HTMLAnchorElement>(resultSelector) ?? [];
		let editionUrl: string | undefined;
		for (const link of links) {
			const titleMatch = matchTitle(link.textContent ?? "", {
				title,
				releaseType,
			});
			if (!titleMatch) continue;
			const exact = titleMatch === "exact";
			const match = /^\/(album|track)\/([a-zA-Z0-9]{22})(?:[/?#]|$)/.exec(
				new URL(link.href).pathname,
			);
			if (match?.[1] !== entity) continue;

			let card: Element | null = link;
			for (let level = 0; level < 6 && card; level++) {
				const resultIds = new Set(
					[...card.querySelectorAll<HTMLAnchorElement>(resultSelector)]
						.map(
							(anchor) =>
								/\/(?:album|track)\/([a-zA-Z0-9]{22})/.exec(anchor.href)?.[1],
						)
						.filter(Boolean),
				);
				if (resultIds.size > 1) break;
				if (normalizeSearchText(card.textContent ?? "").includes(artistName)) {
					const url = `https://open.spotify.com/${entity}/${match[2]}`;
					if (exact)
						return {
							exactUrl: url,
							editionUrl,
							hasPage: true,
						};
					editionUrl ??= url;
					break;
				}
				card = card.parentElement;
			}
		}
		return {
			exactUrl: undefined,
			editionUrl,
			hasPage: main !== null,
			renderError,
			noResults: main?.textContent?.includes("No results found") ?? false,
		};
	};

	return new Promise((resolve, reject) => {
		let settleTimeout: ReturnType<typeof setTimeout> | undefined;
		const finish = (url?: string, error?: Error) => {
			clearTimeout(timeout);
			clearTimeout(settleTimeout);
			observer.disconnect();
			if (error) reject(error);
			else resolve(url);
		};
		const check = () => {
			try {
				const result = find();
				if (result.exactUrl || result.noResults) finish(result.exactUrl);
				else if (result.editionUrl && !settleTimeout)
					settleTimeout = setTimeout(() => {
						settleTimeout = undefined;
						try {
							const settled = find();
							if (settled.exactUrl || settled.editionUrl || settled.noResults)
								finish(settled.exactUrl ?? settled.editionUrl);
						} catch (error) {
							finish(
								undefined,
								error instanceof Error ? error : new Error(String(error)),
							);
						}
					}, 1_500);
			} catch (error) {
				finish(
					undefined,
					error instanceof Error ? error : new Error(String(error)),
				);
			}
		};
		const observer = new MutationObserver(check);
		const timeout = setTimeout(() => {
			try {
				const result = find();
				if (result.renderError)
					finish(undefined, new Error("Spotify search page failed to render"));
				else if (result.hasPage) finish(result.exactUrl ?? result.editionUrl);
				else
					finish(undefined, new Error("Spotify search results did not load"));
			} catch (error) {
				finish(
					undefined,
					error instanceof Error ? error : new Error(String(error)),
				);
			}
		}, RESULTS_TIMEOUT);
		observer.observe(document, { childList: true, subtree: true });
		check();
	});
};
