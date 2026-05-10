import { withCache } from "~/shared/utils/cache";
import { fetch } from "~/shared/utils/fetch";
import { isDefined } from "~/shared/utils/types";

// Service workers send a minimal UA that SoundCloud's bot detection flags.
const BROWSER_UA =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";

const getScriptUrls = async () => {
	const response = await fetch({
		url: "https://soundcloud.com",
		headers: { "User-Agent": BROWSER_UA },
	});
	return [
		...response.matchAll(
			/<script crossorigin src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[\da-z-]+\.js)"><\/script>/gm,
		),
	]
		.map((match) => match[1])
		.filter(isDefined);
};

const fetchClientId = async (url: string) => {
	const response = await fetch({ url, headers: { "User-Agent": BROWSER_UA } });
	return [...(/client_id:"([\dA-Za-z]+)"/.exec(response) ?? [])][1];
};

const scrapeClientId = async (urls: string[]) => {
	const maybeClientIds = await Promise.all(
		urls.map((url) => fetchClientId(url)),
	);
	return maybeClientIds.find(isDefined);
};

const scrapeToken = async (): Promise<string | undefined> => {
	const scriptUrls = await getScriptUrls();
	return scrapeClientId(scriptUrls);
};

// Cache for 24 hours — the client ID rarely changes.
export const requestToken = withCache(
	"soundcloud-client-id",
	scrapeToken,
	86_400_000,
);
