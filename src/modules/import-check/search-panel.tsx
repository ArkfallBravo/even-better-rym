import type { ComponentChild } from "preact";
import { useState } from "preact/hooks";

import { SEARCHABLES } from "~/shared/services";
import type { Searchable, Service } from "~/shared/services/types";
import { fold } from "~/shared/utils/one-shot";

import { type CheckResults, runChecks } from "./check-runner";

const DEFAULT_ARTIST = "Violent Magic Orchestra";
const DEFAULT_TITLE = "Death Rave";

type SearchResult = { url: string } | { notFound: true };

export function SearchPanel() {
	const [artist, setArtist] = useState(DEFAULT_ARTIST);
	const [title, setTitle] = useState(DEFAULT_TITLE);
	const [results, setResults] = useState<CheckResults<SearchResult>>({});

	const run = async () => {
		await runChecks(
			SEARCHABLES,
			(service) => service.name,
			(service) => searchOne(service, { artist, title }),
			setResults,
		);
	};

	return (
		<section>
			<h3>Search (autofind) check</h3>
			<p>
				Fill in an artist and title, then Run. This calls each service&apos;s{" "}
				<code>search()</code> directly — the same lookup the stream-links
				autofind icons use — without navigating to rateyourmusic.com or anywhere
				else. A successful match is cached for an hour per artist/title pair, so
				re-running the same pair right after a fix may still show the old
				result.
			</p>
			<label style={{ display: "block", marginTop: 8 }}>
				Artist
				<input
					value={artist}
					onInput={(event) =>
						setArtist((event.target as HTMLInputElement).value)
					}
					style={{ width: "100%" }}
				/>
			</label>
			<label style={{ display: "block", marginTop: 8 }}>
				Title
				<input
					value={title}
					onInput={(event) =>
						setTitle((event.target as HTMLInputElement).value)
					}
					style={{ width: "100%" }}
				/>
			</label>
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

async function searchOne(
	service: Service & Searchable,
	metadata: { artist: string; title: string },
): Promise<SearchResult> {
	const url = await service.search(metadata);
	return url === undefined ? { notFound: true } : { url };
}

const renderStatus = fold<Error, SearchResult, ComponentChild>(
	() => "…",
	() => "…",
	(error) => `FAIL — ${error.message}`,
	(result) =>
		"notFound" in result ? (
			"NOT FOUND"
		) : (
			<>
				PASS —{" "}
				<a href={result.url} target="_blank" rel="noreferrer">
					{result.url}
				</a>
			</>
		),
);
