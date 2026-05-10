import { fetch } from "~/shared/utils/fetch";

import type { SearchFunction } from "../types";
import { YOUTUBE_KEY } from "./auth";

type SearchResponse = {
	items?: { id: { videoId?: string } }[];
};

export const search: SearchFunction = async ({ artist, title }) => {
	const response = JSON.parse(
		await fetch({
			url: "https://www.googleapis.com/youtube/v3/search",
			urlParameters: {
				part: "id",
				q: `${artist} ${title}`,
				type: "video",
				maxResults: "1",
				key: YOUTUBE_KEY,
			},
		}),
	) as SearchResponse;

	const videoId = response.items?.[0]?.id?.videoId;
	return videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined;
};
