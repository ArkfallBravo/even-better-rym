import browser from "webextension-polyfill";

import {
	findBestWikipediaResult,
	getWikipediaArticleUrl,
	type WikipediaSearchResult,
} from "~/modules/reference-links/helpers";
import type {
	WikipediaSearchRequest,
	WikipediaSearchResponse,
} from "~/shared/utils/messaging";
import { backgroundFetch } from "./fetch";

type SearchResponse = {
	query?: {
		search?: WikipediaSearchResult[];
	};
};

export const wikipediaSearch = async ({
	id,
	data: { artistName, albumTitle },
}: WikipediaSearchRequest): Promise<WikipediaSearchResponse> => {
	try {
		const response = await backgroundFetch({
			id,
			type: "fetch",
			data: {
				url: "https://en.wikipedia.org/w/api.php",
				urlParameters: {
					action: "query",
					format: "json",
					list: "search",
					origin: "*",
					srnamespace: "0",
					srlimit: "10",
					srsearch: `"${albumTitle}" OR "${albumTitle} album" OR "${albumTitle}" "${artistName}"`,
				},
				headers: { Accept: "application/json" },
			},
		});
		if (response.data.status < 200 || response.data.status >= 300) {
			throw new Error(response.data.error ?? "Wikipedia search failed.");
		}

		const results = response.data.body
			? ((JSON.parse(response.data.body) as SearchResponse).query?.search ?? [])
			: [];
		const result = findBestWikipediaResult(results, albumTitle);
		if (!result) return { id, type: "wikipediaSearch", data: {} };

		const url = getWikipediaArticleUrl(result.title);
		await browser.tabs.create({ url });
		return { id, type: "wikipediaSearch", data: { url } };
	} catch (error) {
		return {
			id,
			type: "wikipediaSearch",
			data: {
				error:
					error instanceof Error ? error.message : "Wikipedia search failed.",
			},
		};
	}
};
