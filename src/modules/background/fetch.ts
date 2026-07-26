import type { FetchRequest, FetchResponse } from "~/shared/utils/messaging";

export const backgroundFetch = async ({
	id,
	data: { url, method = "GET", urlParameters = {}, body, headers, credentials },
}: FetchRequest): Promise<FetchResponse> => {
	const urlObject = new URL(url);
	if (urlParameters) {
		for (const [key, value] of Object.entries(urlParameters))
			urlObject.searchParams.append(key, value);
	}

	const response = await fetch(urlObject.toString(), {
		method,
		headers,
		credentials,
		body,
	});
	const responseBody = await response.text();
	if (!response.ok)
		return {
			id,
			type: "fetch",
			data: {
				body: responseBody,
				error: `HTTP ${response.status}: ${responseBody}`,
			},
		};

	return { id, type: "fetch", data: { body: responseBody } };
};
