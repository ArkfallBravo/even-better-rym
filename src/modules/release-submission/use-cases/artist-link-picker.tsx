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
import { useEffect, useState } from "preact/hooks";

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
	relinkTracklistLines,
	unlinkTracklistLines,
	withReleaseArtistFallback,
} from "../utils/track-artist-links";

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

// Returns the picker session for an import, or undefined if it has no
// artists to link.
function getPickerSession(data: ResolveData): PickerSession | undefined {
	const tracks = withReleaseArtistFallback(
		data.tracks ?? [],
		data.artists ?? [],
	);
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

function ArtistLinkPicker() {
	const { count, session } = usePickerImport();
	if (session === undefined) {
		return null;
	}
	return <PickerPanel key={count} session={session} />;
}

function PickerPanel({ session }: Readonly<{ session: PickerSession }>) {
	const [labels, setLabels] = useState<ArtistLabels>(new Map());
	const [activeName, setActiveName] = useState<string | undefined>();
	const [appliedPlan, setAppliedPlan] = useState<RelinkPlan>(new Map());

	useEffect(() => {
		if (activeName === undefined) {
			return undefined;
		}
		return watchArtistResultClicks((assocId) => {
			const nextLabels = new Map(labels);
			nextLabels.set(activeName, buildArtistToken(assocId));
			const nextName = session.names.find((name) => !nextLabels.has(name));
			setLabels(nextLabels);
			setActiveName(nextName);
			continueArtistSearch(nextName);
		});
	}, [session, labels, activeName]);

	const handleLink = (name: string) => {
		setActiveName(name);
		startArtistSearch(name);
	};
	const handleSkip = (name: string) => {
		setLabels(new Map(labels).set(name, name));
		if (name === activeName) {
			setActiveName(undefined);
		}
	};
	const handleApply = () => {
		const plan = buildRelinkPlan(session.tracks, labels);
		applyArtistLinks(appliedPlan, plan);
		closeShortcutPopup();
		setAppliedPlan(plan);
	};
	const allResolved = session.names.every((name) => labels.has(name));

	return (
		<div id={PICKER_ID} style={{ marginTop: "1em" }}>
			<b>Track artist links</b>
			{session.names.map((name) => (
				<ArtistRow
					key={name}
					name={name}
					label={labels.get(name)}
					active={name === activeName}
					onLink={handleLink}
					onSkip={handleSkip}
				/>
			))}
			<input
				type="button"
				className="btn"
				value="Apply to tracklist"
				disabled={!allResolved}
				onClick={handleApply}
			/>
		</div>
	);
}

type ArtistRowProps = {
	name: string;
	label: string | undefined;
	active: boolean;
	onLink: (name: string) => void;
	onSkip: (name: string) => void;
};

// Returns the status text for an artist's picked label.
function describeLabel(name: string, label: string | undefined): string {
	if (label === undefined) {
		return "not picked";
	}
	return label === name ? "left unlinked" : label;
}

function ArtistRow({
	name,
	label,
	active,
	onLink,
	onSkip,
}: Readonly<ArtistRowProps>) {
	return (
		<div style={{ fontWeight: active ? 700 : "normal" }}>
			{name}: {describeLabel(name, label)}{" "}
			<input
				type="button"
				className="btn btn_small"
				value="Link"
				onClick={() => onLink(name)}
			/>
			<input
				type="button"
				className="btn btn_small"
				value="Skip"
				onClick={() => onSkip(name)}
			/>
		</div>
	);
}
