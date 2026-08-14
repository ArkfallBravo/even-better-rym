import { useState } from "preact/hooks";

import { RESOLVABLES } from "~/shared/services";
import { fold } from "~/shared/utils/one-shot";

import { type CheckResults, runChecks } from "./check-runner";

const DEFAULT_URLS: Record<string, string> = {
	"Apple Music":
		"https://music.apple.com/ca/album/the-world-of-monnom-black/1445493902",
	Bandcamp: "https://monnomblack.bandcamp.com/album/the-world-of-monnom-black",
	Beatport:
		"https://www.beatport.com/release/isarnian-bloodlines-d_b-counterfuture-hi-shock/4255009",
	Discogs:
		"https://www.discogs.com/master/1537555-Various-Artists-The-World-Of-Monnom-Black?srsltid=AfmBOoqjtXH5Zo59uIDBc5UoNflH_FzUyXm4oE1Tgbv8H5-GbVh9yEcA",
	LiveMixtapes: "https://livemixtapes.com/mixtape/mgm-lett-uncursed",
	Melon: "https://www.melon.com/album/detail.htm?albumId=13968146",
	Qobuz: "https://open.qobuz.com/album/wz5fvooarvnaa",
	Soundcloud:
		"https://soundcloud.com/monnom-black/sets/the-world-of-monnom-black-iii",
	Spotify: "https://open.spotify.com/album/5Y7uhVhOPytsv5WxwzzUah",
	YouTube: "https://www.youtube.com/watch?v=uv4hl-Q6O9Q",
};

const DEFAULT_INPUT = JSON.stringify(
	Object.fromEntries(
		RESOLVABLES.map((service) => [
			service.name,
			DEFAULT_URLS[service.name] ?? "",
		]),
	),
	undefined,
	2,
);

export function ImportPanel() {
	const [input, setInput] = useState(DEFAULT_INPUT);
	const [results, setResults] = useState<CheckResults<void>>({});

	const run = async () => {
		let urls: Record<string, string>;
		try {
			urls = JSON.parse(input) as Record<string, string>;
		} catch {
			alert("Invalid JSON");
			return;
		}

		const names = Object.entries(urls)
			.filter(([, url]) => url.length > 0)
			.map(([name]) => name);

		await runChecks(
			names,
			(name) => name,
			(name) => resolveOne(name, urls[name]),
			setResults,
		);
	};

	return (
		<section>
			<h3>Import resolve() check</h3>
			<p>
				Fill in a release URL per service, then Run. This calls each
				service&apos;s <code>resolve()</code> directly — the same
				content-script-fetch / background-fetch fallback the real Import form
				uses — without navigating to rateyourmusic.com or anywhere else.
			</p>
			<textarea
				value={input}
				onInput={(event) =>
					setInput((event.target as HTMLTextAreaElement).value)
				}
				rows={14}
				style={{ width: "100%", fontFamily: "monospace" }}
			/>
			<button type="button" onClick={() => void run()} style={{ marginTop: 8 }}>
				Run
			</button>
			<ul>
				{Object.entries(results).map(([name, status]) => (
					<li key={name}>
						{name}: {renderStatus(status)}
					</li>
				))}
			</ul>
		</section>
	);
}

async function resolveOne(name: string, url: string): Promise<void> {
	const service = RESOLVABLES.find((service) => service.name === name);
	if (!service) throw new Error("Unknown service name");
	await service.resolve(url);
}

const renderStatus = fold<Error, void, string>(
	() => "…",
	() => "…",
	(error) => `FAIL — ${error.message}`,
	() => "PASS",
);
