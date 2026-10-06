// ----------------------------------------------------------------------- //
//
// MODULE  : release-artist-picker.tsx
//
// PURPOSE : Panel for linking, skipping or inheriting each imported release
//           artist in RYM's "filed under" list
//
// CREATED : 10/6/2026
//
// ----------------------------------------------------------------------- //

import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

import { waitForElement } from "~/shared/utils/dom";

import {
	readFiledUnderEntries,
	searchFiledUnder,
	switchAwayFromSameAsParent,
	syncFiledUnderEntries,
	watchFiledUnderAdditions,
} from "../utils/filed-under";
import type {
	FiledUnderEntry,
	ReleaseArtistChoice,
	ReleaseArtistChoices,
} from "../utils/release-artist-links";
import {
	getChosenEntries,
	getInheritableEntries,
	getReleaseArtistLabels,
	hasSameEntries,
	pairInheritedArtists,
} from "../utils/release-artist-links";
import type { ArtistLabels } from "../utils/track-artist-links";
import { PickerButton, PickerRow } from "./picker-row";

const NOT_INHERITED = "";

type ReleasePickerSession = {
	names: string[];
	parentEntries: FiledUnderEntry[];
	initialChoices: ReleaseArtistChoices;
};

type ReleasePickerImport = {
	count: number;
	session: ReleasePickerSession | undefined;
};

export default async function injectReleaseArtistPicker() {
	// Placed before the section, which RYM hides while an issue is "credited
	// in the same manner as the parent issue".
	const section = await waitForElement("#section_filed_under");
	const container = document.createElement("div");
	section.before(container);
	render(<ReleaseArtistPicker />, container);
}

// Tells the tracklist picker each release artist's current label.
function publishReleaseArtistLabels(labels: ArtistLabels): void {
	document.dispatchEvent(
		new CustomEvent<ArtistLabels>("releaseArtistLabelsEvent", {
			detail: labels,
		}),
	);
}

// Returns the picker session for the imported release artists, or undefined
// if there are none to pick.
function getReleasePickerSession(
	names: string[],
): ReleasePickerSession | undefined {
	if (names.length === 0) {
		return undefined;
	}
	const parentEntries = readFiledUnderEntries();
	const initialChoices = pairInheritedArtists(names, parentEntries);
	return { names, parentEntries, initialChoices };
}

// Tracks the picker session started by the most recent import, numbered so
// each import gets a fresh panel. Publishes the session's starting labels
// straight away, so the tracklist picker never sees the previous import's.
function useReleasePickerImport(): ReleasePickerImport {
	const [pickerImport, setPickerImport] = useState<ReleasePickerImport>({
		count: 0,
		session: undefined,
	});

	useEffect(() => {
		const listener = (event: CustomEvent<string[]>) => {
			const session = getReleasePickerSession(event.detail);
			publishReleaseArtistLabels(
				getReleaseArtistLabels(
					session?.initialChoices ?? new Map<string, ReleaseArtistChoice>(),
				),
			);
			setPickerImport((previous) => ({
				count: previous.count + 1,
				session,
			}));
		};
		document.addEventListener("releaseArtistsEvent", listener);
		return () => document.removeEventListener("releaseArtistsEvent", listener);
	}, []);

	return pickerImport;
}

function ReleaseArtistPicker() {
	const { count, session } = useReleasePickerImport();
	if (session === undefined) {
		return null;
	}
	return <ReleasePickerPanel key={count} session={session} />;
}

function ReleasePickerPanel({
	session,
}: Readonly<{ session: ReleasePickerSession }>) {
	const [choices, setChoices] = useState(session.initialChoices);
	const [activeName, setActiveName] = useState<string | undefined>();
	// Ids of the entries this picker may remove: the parent's and any it
	// linked.
	const managedIds = useRef(
		new Set(session.parentEntries.map((entry) => entry.id)),
	);

	useEffect(() => {
		const chosenEntries = getChosenEntries(session.names, choices);
		if (!hasSameEntries(chosenEntries, session.parentEntries)) {
			switchAwayFromSameAsParent();
		}
		syncFiledUnderEntries(chosenEntries, managedIds.current);
		// The import listener already published the starting choices.
		if (choices !== session.initialChoices) {
			publishReleaseArtistLabels(getReleaseArtistLabels(choices));
		}
	}, [session, choices]);

	useEffect(() => {
		if (activeName === undefined) {
			return undefined;
		}
		return watchFiledUnderAdditions((entry) => {
			if (managedIds.current.has(entry.id)) {
				return;
			}
			managedIds.current.add(entry.id);
			const nextChoices = new Map(choices).set(activeName, {
				kind: "linked",
				entry,
			});
			const nextName = session.names.find((name) => !nextChoices.has(name));
			setChoices(nextChoices);
			setActiveName(nextName);
			if (nextName !== undefined) {
				searchFiledUnder(nextName);
			}
		});
	}, [session, choices, activeName]);

	const setChoice = (name: string, choice: ReleaseArtistChoice | undefined) => {
		const nextChoices = new Map(choices);
		if (choice === undefined) {
			nextChoices.delete(name);
		} else {
			nextChoices.set(name, choice);
		}
		setChoices(nextChoices);
		if (name === activeName) {
			setActiveName(undefined);
		}
	};
	const handleLink = (name: string) => {
		setActiveName(name);
		searchFiledUnder(name);
	};
	const handleInherit = (name: string, id: string) => {
		const entry = session.parentEntries.find(
			(candidate) => candidate.id === id,
		);
		setChoice(
			name,
			entry === undefined ? undefined : { kind: "inherited", entry },
		);
	};

	return (
		<div style={{ marginTop: "1em" }}>
			<b>Release artist links</b>
			{session.names.map((name) => (
				<PickerRow
					key={name}
					name={name}
					status={describeChoice(choices.get(name))}
					active={name === activeName}
				>
					<PickerButton value="Link" onClick={() => handleLink(name)} />
					<PickerButton
						value="Skip"
						onClick={() => setChoice(name, { kind: "skipped" })}
					/>
					{session.parentEntries.length > 0 && (
						<InheritSelect
							choice={choices.get(name)}
							entries={getInheritableEntries(
								session.parentEntries,
								choices,
								name,
							)}
							onSelect={(id) => handleInherit(name, id)}
						/>
					)}
				</PickerRow>
			))}
		</div>
	);
}

// Returns the status text for a release artist's choice.
function describeChoice(choice: ReleaseArtistChoice | undefined): string {
	if (choice === undefined) {
		return "not picked";
	}
	if (choice.kind === "skipped") {
		return "left unlinked";
	}
	const verb =
		choice.kind === "linked" ? "linked to" : "inherited from parent:";
	return `${verb} ${choice.entry.name}`;
}

type InheritSelectProps = {
	choice: ReleaseArtistChoice | undefined;
	entries: FiledUnderEntry[];
	onSelect: (id: string) => void;
};

// Renders the dropdown for inheriting one of the parent's artists, or for
// turning inheriting off again.
function InheritSelect({
	choice,
	entries,
	onSelect,
}: Readonly<InheritSelectProps>) {
	const inheritedId =
		choice?.kind === "inherited" ? choice.entry.id : NOT_INHERITED;
	return (
		<select
			value={inheritedId}
			onChange={(event) => onSelect((event.target as HTMLSelectElement).value)}
		>
			<option value={NOT_INHERITED}>
				{inheritedId === NOT_INHERITED
					? "Inherit from parent…"
					: "Don't inherit"}
			</option>
			{entries.map((entry) => (
				<option key={entry.id} value={entry.id}>
					{entry.name}
				</option>
			))}
		</select>
	);
}
