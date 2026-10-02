// ----------------------------------------------------------------------- //
//
// MODULE  : track-artist-links.ts
//
// PURPOSE : Collecting track artists for the artist-link picker and writing
//           the picked links into the advanced tracklist text
//
// CREATED : 10/1/2026
//
// ----------------------------------------------------------------------- //

import type { Track } from "~/shared/services/types";

import { buildLinkedTitle } from "./artist-shortcuts";

const TRACKLIST_LINE_SEPARATOR = "\n";
const TRACKLIST_FIELD_SEPARATOR = "|";

// Maps an artist name to the label written for it: an [ArtistNNNN] token,
// or the plain name when the user skipped it.
export type ArtistLabels = Map<string, string>;

// Maps a track position to the artist labels to prefix onto its title.
export type RelinkPlan = Map<string, string[]>;

// Returns the tracks with the release's artists filled in on any track that
// lists none of its own.
export const withReleaseArtistFallback = (
	tracks: Track[],
	releaseArtists: string[],
): Track[] =>
	tracks.map((track) =>
		track.artists === undefined || track.artists.length === 0
			? { ...track, artists: releaseArtists }
			: track,
	);

// Returns each track artist name once, in order of first appearance.
export const getDistinctTrackArtists = (tracks: Track[]): string[] => [
	...new Set(tracks.flatMap((track) => track.artists ?? [])),
];

// Builds each track's position-to-labels entry from the picked labels.
export const buildRelinkPlan = (
	tracks: Track[],
	labels: ArtistLabels,
): RelinkPlan => {
	const plan: RelinkPlan = new Map();
	for (const track of tracks) {
		if (track.position === undefined || track.artists === undefined) {
			continue;
		}
		const trackLabels = track.artists.map((name) => labels.get(name) ?? name);
		plan.set(track.position, trackLabels);
	}
	return plan;
};

// Returns the title with its artist-label prefix removed, if it has that
// exact prefix.
export const removeLinkedPrefix = (title: string, labels: string[]): string => {
	const prefix = buildLinkedTitle("", labels);
	return title.startsWith(prefix) ? title.slice(prefix.length) : title;
};

type TitleRewrite = (title: string, labels: string[]) => string;

// Returns a function rewriting one advanced-tracklist line's title, if
// planned.
const rewriteTracklistLine =
	(rewrite: TitleRewrite) =>
	(line: string, plan: RelinkPlan): string => {
		const fields = line.split(TRACKLIST_FIELD_SEPARATOR);
		if (fields.length < 2) {
			return line;
		}
		const labels = plan.get(fields[0].trim());
		if (labels === undefined) {
			return line;
		}
		fields[1] = rewrite(fields[1], labels);
		return fields.join(TRACKLIST_FIELD_SEPARATOR);
	};

// Returns a function rewriting each planned track's title in advanced
// tracklist text.
const rewriteTracklistTitles = (rewrite: TitleRewrite) => {
	const rewriteLine = rewriteTracklistLine(rewrite);
	return (advancedText: string, plan: RelinkPlan): string =>
		advancedText
			.split(TRACKLIST_LINE_SEPARATOR)
			.map((line) => rewriteLine(line, plan))
			.join(TRACKLIST_LINE_SEPARATOR);
};

// Returns the advanced tracklist text with each planned track's title
// prefixed by its artist labels.
export const relinkTracklistLines = rewriteTracklistTitles(buildLinkedTitle);

// Returns the advanced tracklist text with each planned track's artist-label
// prefix removed.
export const unlinkTracklistLines = rewriteTracklistTitles(removeLinkedPrefix);
