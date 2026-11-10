// ----------------------------------------------------------------------- //
//
// MODULE  : fetch.ts
//
// PURPOSE : Cross-origin fetches run from the background script
//
// CREATED : 2/28/2021
//
// ----------------------------------------------------------------------- //

import type { FetchRequest, FetchResponse } from "~/shared/utils/messaging";

export const backgroundFetch = async ({
	id,
	data: { url, method = "GET", urlParameters = {}, body, headers, credentials },
}: FetchRequest): Promise<FetchResponse> => {
	const urlObject = new URL(url);
	if (urlParameters) {
		for (const [key, value] of Object.entries(urlParameters)) {
			if (value != null) urlObject.searchParams.append(key, value);
		}
	}

	try {
		const response = await fetch(urlObject.toString(), {
			method,
			body,
			headers,
			credentials,
		});
		const responseBody = await response.text();
		const retryAfter = response.headers.get("retry-after");

		return {
			id,
			type: "fetch",
			data: {
				body: responseBody,
				status: response.status,
				statusText: response.statusText,
				...(retryAfter ? { retryAfter } : {}),
				...(response.ok
					? {}
					: {
							error: `HTTP ${response.status}${response.statusText ? `: ${response.statusText}` : ""}`,
						}),
			},
		};
	} catch (error) {
		return {
			id,
			type: "fetch",
			data: {
				body: "",
				status: 0,
				statusText: "Network error",
				error:
					error instanceof Error ? error.message : "The fetch request failed.",
			},
		};
	}
};
