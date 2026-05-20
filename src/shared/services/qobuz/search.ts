import { fetch } from "~/shared/utils/fetch";

import type { SearchFunction } from "../types";

export const search: SearchFunction = async ({ artist, title }) => {
	const response = await fetch({
		url: `https://www.qobuz.com/us-en/search/albums/${artist} ${title}`,
		method: "GET",
	});

	const html = new DOMParser().parseFromString(response, "text/html");
	const firstLink = html.querySelector(
		'#release-card-list a[href*="/us-en/album/"]',
	) as HTMLAnchorElement | null;
	if (!firstLink) return undefined;

	const href = firstLink.getAttribute("href") ?? "";
	const album_id = href.substring(href.lastIndexOf("/"));
	const streaming_url = `https://open.qobuz.com/album${album_id}`;

	return streaming_url;
};
