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

import { render } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";

import type { ResolveData, Track } from "~/shared/services/types";
import { forceQuerySelector, waitForElement } from "~/shared/utils/dom";

import { buildArtistToken } from "../utils/artist-shortcuts";
import {
	closeShortcutPopup,
	openArtistLinkPopup,
	showAdvancedTracklist,
	showSimpleTracklist,
} from "../utils/page-functions";
import {
	prefillArtistSearch,
	watchArtistResultClicks,
} from "../utils/shortcut-popup";
import type { ArtistLabels, RelinkPlan } from "../utils/track-artist-links";
import {
	buildRelinkPlan,
	getDistinctTrackArtists,
	hasDifferingTrackArtists,
	mergeArtistLabels,
	relinkTracklistLines,
	unlinkTracklistLines,
	withReleaseArtistFallback,
} from "../utils/track-artist-links";
import { PickerButton, PickerRow } from "./picker-row";

const PICKER_ID = "ebr-artist-link-picker";

type PickerSession = {
	tracks: Track[];
	names: string[];
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
	if (!hasDifferingTrackArtists(data.tracks ?? [], releaseArtists)) {
		return undefined;
	}
	const tracks = withReleaseArtistFallback(data.tracks ?? [], releaseArtists);
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

// Replaces the previously applied prefixes in the tracklist's titles with
// plan's.
function applyArtistLinks(appliedPlan: RelinkPlan, plan: RelinkPlan): void {
	showAdvancedTracklist();
	const advancedInput =
		forceQuerySelector<HTMLTextAreaElement>(document)("#track_advanced");
	const unlinkedText = unlinkTracklistLines(advancedInput.value, appliedPlan);
	advancedInput.value = relinkTracklistLines(unlinkedText, plan);
	showSimpleTracklist();
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

// Tracks the labels the release-artist picker most recently published.
function useReleaseArtistLabels(): ArtistLabels {
	const [releaseLabels, setReleaseLabels] = useState<ArtistLabels>(new Map());

	useEffect(() => {
		const listener = (event: CustomEvent<ArtistLabels>) =>
			setReleaseLabels(event.detail);
		document.addEventListener("releaseArtistLabelsEvent", listener);
		return () =>
			document.removeEventListener("releaseArtistLabelsEvent", listener);
	}, []);

	return releaseLabels;
}

// Returns a function applying labels to the tracklist in place of the ones
// it applied last.
function useTracklistApplier(tracks: Track[]): (labels: ArtistLabels) => void {
	const appliedPlan = useRef<RelinkPlan>(new Map());
	return useCallback(
		(labels: ArtistLabels) => {
			const plan = buildRelinkPlan(tracks, labels);
			applyArtistLinks(appliedPlan.current, plan);
			appliedPlan.current = plan;
		},
		[tracks],
	);
}

// Checks whether every artist in the session has a label.
function hasAllLabels(session: PickerSession, labels: ArtistLabels): boolean {
	return session.names.every((name) => labels.has(name));
}

function ArtistLinkPicker() {
	const { count, session } = usePickerImport();
	const releaseLabels = useReleaseArtistLabels();
	if (session === undefined) {
		return null;
	}
	return (
		<PickerPanel key={count} session={session} releaseLabels={releaseLabels} />
	);
}

type PickerPanelProps = {
	session: PickerSession;
	releaseLabels: ArtistLabels;
};

function PickerPanel({ session, releaseLabels }: Readonly<PickerPanelProps>) {
	// The user's own picks in this panel, which win over the release's.
	const [pickedLabels, setPickedLabels] = useState<ArtistLabels>(new Map());
	const [activeName, setActiveName] = useState<string | undefined>();
	const labels = mergeArtistLabels(releaseLabels, pickedLabels);
	const applyLabels = useTracklistApplier(session.tracks);
	// Read by the auto-apply effect, which reruns only on release changes.
	const latestPickedLabels = useRef(pickedLabels);
	latestPickedLabels.current = pickedLabels;

	// Auto-applies whenever the release's labels leave every artist labelled.
	useEffect(() => {
		const nextLabels = mergeArtistLabels(
			releaseLabels,
			latestPickedLabels.current,
		);
		if (hasAllLabels(session, nextLabels)) {
			applyLabels(nextLabels);
		}
	}, [session, releaseLabels, applyLabels]);

	useEffect(() => {
		if (activeName === undefined) {
			return undefined;
		}
		return watchArtistResultClicks((assocId) => {
			const nextPicked = new Map(pickedLabels);
			nextPicked.set(activeName, buildArtistToken(assocId));
			const nextLabels = mergeArtistLabels(releaseLabels, nextPicked);
			const nextName = session.names.find((name) => !nextLabels.has(name));
			setPickedLabels(nextPicked);
			setActiveName(nextName);
			continueArtistSearch(nextName);
		});
	}, [session, releaseLabels, pickedLabels, activeName]);

	const handleLink = (name: string) => {
		setActiveName(name);
		startArtistSearch(name);
	};
	const handleSkip = (name: string) => {
		setPickedLabels(new Map(pickedLabels).set(name, name));
		if (name === activeName) {
			setActiveName(undefined);
		}
	};
	const handleApply = () => {
		applyLabels(labels);
		closeShortcutPopup();
	};

	return (
		<div id={PICKER_ID} style={{ marginTop: "1em" }}>
			<b>Track artist links</b>
			{session.names.map((name) => (
				<PickerRow
					key={name}
					name={name}
					status={describeLabel(name, labels.get(name))}
					active={name === activeName}
				>
					<PickerButton value="Link" onClick={() => handleLink(name)} />
					<PickerButton value="Skip" onClick={() => handleSkip(name)} />
				</PickerRow>
			))}
			<input
				type="button"
				className="btn"
				value="Apply to tracklist"
				disabled={!hasAllLabels(session, labels)}
				onClick={handleApply}
			/>
		</div>
	);
}

// Returns the status text for an artist's picked label.
function describeLabel(name: string, label: string | undefined): string {
	if (label === undefined) {
		return "not picked";
	}
	return label === name ? "left unlinked" : label;
}
