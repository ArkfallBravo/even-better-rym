// ----------------------------------------------------------------------- //
//
// MODULE  : artist-link-picker.tsx
//
// PURPOSE : Panel for picking each imported track artist's RYM link once and
//           applying it to every track that artist appears on
//
// CREATED : 10/1/2026
//
// ----------------------------------------------------------------------- //

import { Fragment, render } from "preact";
import { createPortal } from "preact/compat";
import { useEffect, useState } from "preact/hooks";

import type { ResolveData } from "~/shared/services/types";
import { waitForElement } from "~/shared/utils/dom";

import { buildArtistToken } from "../utils/artist-shortcuts";
import {
	closeShortcutPopup,
	openArtistLinkPopup,
} from "../utils/page-functions";
import type { ReleaseArtistLabels } from "../utils/release-artist-links";
import {
	prefillArtistSearch,
	watchArtistResultClicks,
} from "../utils/shortcut-popup";
import {
	ensureResetSlots,
	watchTracklistEdits,
} from "../utils/simple-tracklist";
import type {
	TrackArtistChoice,
	TrackArtistChoices,
} from "../utils/track-artist-choices";
import {
	describeTrackChoice,
	resolveTrackArtistLabels,
	setTrackChoice,
} from "../utils/track-artist-choices";
import type { TrackKey } from "../utils/track-artist-links";
import {
	getDistinctTrackArtists,
	getUntetheredKeys,
	hasDifferingTrackArtists,
	withReleaseArtistFallback,
} from "../utils/track-artist-links";
import type { PickerSession } from "../utils/tracklist-picker-state";
import {
	getWrittenLabels,
	hasAllLabels,
	resetTrack,
} from "../utils/tracklist-picker-state";
import {
	InheritSelect,
	NOT_INHERITED,
	PickerButton,
	PickerRow,
} from "./picker-row";
import { useTracklistHistory } from "./tracklist-history";

const PICKER_ID = "ebr-artist-link-picker";
const NO_RELEASE_ARTISTS: ReleaseArtistLabels = {
	names: [],
	labels: new Map(),
};

export default async function injectArtistLinkPicker() {
	const tracklist = await waitForElement("#tracks_adv");
	const container = document.createElement("div");
	tracklist.after(container);
	render(<ArtistLinkPicker />, container);
}

// Returns the picker session for an import, or undefined if every track's
// artists are the release's, which RYM lists without track artists.
function getPickerSession(data: ResolveData): PickerSession | undefined {
	const releaseArtists = data.artists ?? [];
	const importedTracks = data.tracks ?? [];
	if (!hasDifferingTrackArtists(importedTracks, releaseArtists)) {
		return undefined;
	}
	const tracks = withReleaseArtistFallback(importedTracks, releaseArtists);
	const names = getDistinctTrackArtists(tracks);
	if (names.length === 0) {
		return undefined;
	}
	return { tracks, names };
}

// Opens the popup beside the picker, searching for name.
function startArtistSearch(name: string): void {
	openArtistLinkPopup(PICKER_ID);
	void prefillArtistSearch(name);
}

// Prefills the search for the next artist, or closes the popup when none
// are left.
function continueArtistSearch(nextName: string | undefined): void {
	if (nextName === undefined) {
		closeShortcutPopup();
		return;
	}
	startArtistSearch(nextName);
}

type PickerImport = {
	count: number;
	session: PickerSession | undefined;
};

// Tracks the picker session started by the most recent import, numbered so
// each import gets a fresh panel.
function usePickerImport(): PickerImport {
	const [pickerImport, setPickerImport] = useState<PickerImport>({
		count: 0,
		session: undefined,
	});

	useEffect(() => {
		const listener = (event: CustomEvent<ResolveData>) =>
			setPickerImport((previous) => ({
				count: previous.count + 1,
				session: getPickerSession(event.detail),
			}));
		document.addEventListener("importEvent", listener);
		return () => document.removeEventListener("importEvent", listener);
	}, []);

	return pickerImport;
}

// Tracks the release artists and labels the release-artist picker most
// recently published.
function useReleaseArtistLabels(): ReleaseArtistLabels {
	const [release, setRelease] =
		useState<ReleaseArtistLabels>(NO_RELEASE_ARTISTS);

	useEffect(() => {
		const listener = (event: CustomEvent<ReleaseArtistLabels>) =>
			setRelease(event.detail);
		document.addEventListener("releaseArtistLabelsEvent", listener);
		return () =>
			document.removeEventListener("releaseArtistLabelsEvent", listener);
	}, []);

	return release;
}

// Tracks each tracklist row's reset slot, re-adding the slots whenever RYM
// rebuilds the rows.
function useResetSlots(): Map<TrackKey, HTMLElement> {
	const [slots, setSlots] = useState(ensureResetSlots);

	useEffect(() => watchTracklistEdits(() => setSlots(ensureResetSlots())), []);

	return slots;
}

function ArtistLinkPicker() {
	const { count, session } = usePickerImport();
	const release = useReleaseArtistLabels();
	if (session === undefined) {
		return null;
	}
	return <PickerPanel key={count} session={session} release={release} />;
}

type PickerPanelProps = {
	session: PickerSession;
	release: ReleaseArtistLabels;
};

function PickerPanel({ session, release }: Readonly<PickerPanelProps>) {
	const [activeName, setActiveName] = useState<string | undefined>();
	const tracklist = useTracklistHistory(session, release);
	const resetSlots = useResetSlots();
	const { choices } = tracklist.state;
	const labels = resolveTrackArtistLabels(choices, release.labels);
	const { editState } = tracklist;

	useEffect(() => {
		if (activeName === undefined) {
			return undefined;
		}
		return watchArtistResultClicks((assocId) => {
			const nextChoices = setTrackChoice(choices, activeName, {
				kind: "linked",
				token: buildArtistToken(assocId),
			});
			const nextLabels = resolveTrackArtistLabels(nextChoices, release.labels);
			const nextName = session.names.find((name) => !nextLabels.has(name));
			editState((state) => ({ ...state, choices: nextChoices }));
			setActiveName(nextName);
			continueArtistSearch(nextName);
		});
	}, [session, release, choices, activeName, editState]);

	const setChoice = (name: string, choice: TrackArtistChoice | undefined) => {
		editState((state) => ({
			...state,
			choices: setTrackChoice(state.choices, name, choice),
		}));
		if (name === activeName) {
			setActiveName(undefined);
		}
	};
	const handleLink = (name: string) => {
		setActiveName(name);
		startArtistSearch(name);
	};
	const handleFollow = (name: string, releaseName: string) =>
		setChoice(
			name,
			releaseName === NOT_INHERITED
				? undefined
				: { kind: "following", releaseName },
		);
	const handleApply = () => {
		editState((state) => state);
		closeShortcutPopup();
	};
	const handleReset = (key: TrackKey) =>
		editState((state) => resetTrack(state, key));

	return (
		<div id={PICKER_ID} style={{ marginTop: "1em" }}>
			<b>Track artist links</b>
			{session.names.map((name) => (
				<PickerRow
					key={name}
					name={name}
					status={describeTrackChoice(choices.get(name), labels.get(name))}
					active={name === activeName}
				>
					<PickerButton value="Link" onClick={() => handleLink(name)} />
					<PickerButton
						value="Skip"
						onClick={() => setChoice(name, { kind: "skipped" })}
					/>
					{release.names.length > 0 && (
						<InheritSelect
							inherited={getFollowedName(choices, name)}
							options={release.names.map((releaseName) => ({
								value: releaseName,
								label: releaseName,
							}))}
							onSelect={(releaseName) => handleFollow(name, releaseName)}
						/>
					)}
				</PickerRow>
			))}
			<input
				type="button"
				className="btn"
				value="Apply to tracklist"
				disabled={
					!hasAllLabels(
						session.names,
						getWrittenLabels(tracklist.state, release.labels),
					)
				}
				onClick={handleApply}
			/>{" "}
			<PickerButton
				value="Undo"
				disabled={!tracklist.canUndo}
				onClick={tracklist.undo}
			/>
			<PickerButton
				value="Redo"
				disabled={!tracklist.canRedo}
				onClick={tracklist.redo}
			/>
			{getUntetheredKeys(tracklist.state.text, tracklist.state.tether).map(
				(key) => {
					const slot = resetSlots.get(key);
					return (
						slot !== undefined && (
							<Fragment key={key}>
								{createPortal(
									<PickerButton
										value="Reset"
										onClick={() => handleReset(key)}
									/>,
									slot,
								)}
							</Fragment>
						)
					);
				},
			)}
		</div>
	);
}

// Returns the release artist name's track artist follows, if any.
function getFollowedName(choices: TrackArtistChoices, name: string): string {
	const choice = choices.get(name);
	return choice?.kind === "following" ? choice.releaseName : NOT_INHERITED;
}
