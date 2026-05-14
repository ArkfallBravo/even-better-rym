export type BrowseResult = {
	name?: string;
	display_name?: string;
	path?: string;
	type?: string;
	[key: string]: unknown;
};

export type BrowseResponse = {
	results: BrowseResult[];
};

const cache = new Map<string, Promise<BrowseResponse>>();

export const browseSearch = (q: string): Promise<BrowseResponse> => {
	const key = q.toLowerCase().trim();
	const cached = cache.get(key);
	if (cached) return cached;

	const promise = (async () => {
		const url = new URL("/api/1/browse/music/", window.location.origin);
		url.searchParams.set("q", q);
		url.searchParams.set("component", "");
		const res = await fetch(url.toString(), { credentials: "include" });
		if (!res.ok) throw new Error(`Browse API failed: ${res.status}`);
		return res.json() as Promise<BrowseResponse>;
	})();

	cache.set(key, promise);
	return promise;
};

export const resultName = (r: BrowseResult): string =>
	(r.display_name ?? r.name ?? "") as string;

const normalize = (s: string) =>
	s.toLowerCase().replace(/[^\da-z]+/g, " ").trim();

export const matchesType = (
	result: BrowseResult,
	type: "genre" | "descriptor",
): boolean => {
	if (typeof result.type === "string") return result.type === type;
	// Fallback: descriptors have paths starting with "d:", genres with "g:"
	if (typeof result.path === "string") {
		if (type === "descriptor") return result.path.startsWith("d:");
		if (type === "genre")
			return result.path.startsWith("g:") || !result.path.includes(":");
	}
	return false;
};

export const findExactMatch = async (
	q: string,
	type: "genre" | "descriptor",
): Promise<BrowseResult | undefined> => {
	const cleaned = q.trim();
	if (!cleaned) return undefined;
	const res = await browseSearch(cleaned);
	const target = normalize(cleaned);
	return res.results.find(
		(r) => matchesType(r, type) && normalize(resultName(r)) === target,
	);
};
