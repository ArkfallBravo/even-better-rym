// ----------------------------------------------------------------------- //
//
// MODULE  : release-artist-links.ts
//
// PURPOSE : Pairing imported release artists with RYM "filed under" entries
//           and turning the release-artist picker's choices into labels
//
// CREATED : 10/6/2026
//
// ----------------------------------------------------------------------- //

import { buildArtistToken } from "./artist-shortcuts";
import type { ArtistLabels } from "./track-artist-links";

const ARTIST_TOKEN_ID_PATTERN = /^\[Artist(\d+)]$/;
const DIACRITIC_PATTERN = /\p{M}/gu;
const NON_ALPHANUMERIC_PATTERN = /[^\p{L}\p{N}]/gu;

// One artist in RYM's "filed under performer" list.
export type FiledUnderEntry = {
	id: string;
	name: string;
};

// What the user chose for one imported release artist.
export type ReleaseArtistChoice =
	| { kind: "linked"; entry: FiledUnderEntry }
	| { kind: "inherited"; entry: FiledUnderEntry }
	| { kind: "skipped" };

// Maps an imported release artist name to the user's choice for it.
export type ReleaseArtistChoices = Map<string, ReleaseArtistChoice>;

// Filed-under entries to remove (by id) and to add.
export type FiledUnderChanges = {
	remove: string[];
	add: FiledUnderEntry[];
};

// Returns the artist id in an [ArtistNNNN] token, if it is one.
export const parseArtistTokenId = (token: string): string | undefined =>
	ARTIST_TOKEN_ID_PATTERN.exec(token.trim())?.[1];

// Returns the name with case, accents, punctuation and spacing removed, or
// just lowercased if that would leave nothing (e.g. "!!!").
export const normalizeArtistName = (name: string): string => {
	const lowercased = name.toLowerCase();
	const normalized = lowercased
		.normalize("NFD")
		.replace(DIACRITIC_PATTERN, "")
		.replace(NON_ALPHANUMERIC_PATTERN, "");
	return normalized.length > 0 ? normalized : lowercased;
};

// Pairs each imported name with the first unpaired parent entry whose name
// matches it once normalized, returning those names as inherited choices.
export const pairInheritedArtists = (
	names: string[],
	parentEntries: FiledUnderEntry[],
): ReleaseArtistChoices => {
	const choices: ReleaseArtistChoices = new Map();
	const unpaired = [...parentEntries];
	for (const name of names) {
		const key = normalizeArtistName(name);
		const index = unpaired.findIndex(
			(entry) => normalizeArtistName(entry.name) === key,
		);
		if (index === -1) {
			continue;
		}
		const [entry] = unpaired.splice(index, 1);
		choices.set(name, { kind: "inherited", entry });
	}
	return choices;
};

// Returns the parent entries no row other than name inherits.
export const getInheritableEntries = (
	parentEntries: FiledUnderEntry[],
	choices: ReleaseArtistChoices,
	name: string,
): FiledUnderEntry[] => {
	const takenIds = new Set<string>();
	for (const [otherName, choice] of choices) {
		if (otherName !== name && choice.kind === "inherited") {
			takenIds.add(choice.entry.id);
		}
	}
	return parentEntries.filter((entry) => !takenIds.has(entry.id));
};

// Returns the linked and inherited entries in row order, each id once.
export const getChosenEntries = (
	names: string[],
	choices: ReleaseArtistChoices,
): FiledUnderEntry[] => {
	const entries = new Map<string, FiledUnderEntry>();
	for (const name of names) {
		const choice = choices.get(name);
		if (choice !== undefined && choice.kind !== "skipped") {
			entries.set(choice.entry.id, choice.entry);
		}
	}
	return [...entries.values()];
};

// Checks whether both lists hold the same artists, in any order.
export const hasSameEntries = (
	entries: FiledUnderEntry[],
	otherEntries: FiledUnderEntry[],
): boolean => {
	const ids = new Set(entries.map((entry) => entry.id));
	const otherIds = new Set(otherEntries.map((entry) => entry.id));
	return ids.size === otherIds.size && [...ids].every((id) => otherIds.has(id));
};

// Returns the changes that make the filed-under list hold the chosen
// entries, removing only entries whose ids are in managedIds.
export const planFiledUnderChanges = (
	current: FiledUnderEntry[],
	chosen: { entries: FiledUnderEntry[]; managedIds: Set<string> },
): FiledUnderChanges => {
	const chosenIds = new Set(chosen.entries.map((entry) => entry.id));
	const currentIds = new Set(current.map((entry) => entry.id));
	return {
		remove: current
			.map((entry) => entry.id)
			.filter((id) => chosen.managedIds.has(id) && !chosenIds.has(id)),
		add: chosen.entries.filter((entry) => !currentIds.has(entry.id)),
	};
};

// Returns the current ids reordered so the chosen ones come first, in their
// chosen order, followed by the rest as they were.
export const orderFiledUnderIds = (
	currentIds: string[],
	chosenIds: string[],
): string[] => {
	const present = new Set(currentIds);
	const chosen = new Set(chosenIds);
	return [
		...chosenIds.filter((id) => present.has(id)),
		...currentIds.filter((id) => !chosen.has(id)),
	];
};

// Returns each chosen artist's tracklist label: its [ArtistNNNN] token when
// linked or inherited, or its plain name when skipped.
export const getReleaseArtistLabels = (
	choices: ReleaseArtistChoices,
): ArtistLabels => {
	const labels: ArtistLabels = new Map();
	for (const [name, choice] of choices) {
		labels.set(
			name,
			choice.kind === "skipped" ? name : buildArtistToken(choice.entry.id),
		);
	}
	return labels;
};
