// ----------------------------------------------------------------------- //
//
// MODULE  : tracklist-history.ts
//
// PURPOSE : Hook keeping the tracklist picker's state, its undo history and
//           RYM's tracklist in step
//
// CREATED : 10/7/2026
//
// ----------------------------------------------------------------------- //

import { useCallback, useEffect, useRef } from "preact/hooks";

import {
	canRedo,
	canUndo,
	createEditHistory,
	recordEdit,
	redoEdit,
	replaceCurrent,
	undoEdit,
} from "../utils/edit-history";
import type { ReleaseArtistLabels } from "../utils/release-artist-links";
import {
	readTracklistText,
	watchTracklistEdits,
	writeTracklistText,
} from "../utils/simple-tracklist";
import { getInitialTrackChoices } from "../utils/track-artist-choices";
import type { ArtistLabels } from "../utils/track-artist-links";
import type {
	PickerHistory,
	PickerSession,
	TracklistPickerState,
} from "../utils/tracklist-picker-state";
import {
	applyChoices,
	createPickerState,
	reapplyReleaseLabels,
	recordUserChange,
} from "../utils/tracklist-picker-state";
import { useLatestState } from "./use-latest-state";

type StateChange = (state: TracklistPickerState) => TracklistPickerState;

export type TracklistHistory = {
	state: TracklistPickerState;
	canUndo: boolean;
	canRedo: boolean;
	editState: (change: StateChange) => void;
	reapply: () => void;
	undo: () => void;
	redo: () => void;
};

// Returns the history with any tracklist edit made outside the picker
// recorded as an undo step.
function recordOutsideEdits(history: PickerHistory): PickerHistory {
	const text = readTracklistText();
	if (text === history.current.text) {
		return history;
	}
	return recordEdit(history, { ...history.current, text });
}

// Writes the current snapshot's tracklist to the page, and returns the
// history with that snapshot holding the text as RYM shows it, since RYM
// trims each field when it rebuilds the rows.
function showCurrent(history: PickerHistory): PickerHistory {
	writeTracklistText(history.current.text);
	return replaceCurrent(history, {
		...history.current,
		text: readTracklistText(),
	});
}

// Returns the tracklist picker's state and the functions for changing it,
// undoing and redoing. Only the user's changes are undo steps; changes to
// the release labels are applied without adding one, and restoring a step
// applies the current release labels to it.
export function useTracklistHistory(
	session: PickerSession,
	release: ReleaseArtistLabels,
): TracklistHistory {
	const {
		state: history,
		latest: latestHistory,
		commit,
	} = useLatestState(() =>
		createEditHistory(
			createPickerState(
				readTracklistText(),
				getInitialTrackChoices(session.names, release.names),
			),
		),
	);
	// Read by the DOM callbacks and the functions below, which outlive renders.
	const latestReleaseLabels = useRef<ArtistLabels>(release.labels);
	latestReleaseLabels.current = release.labels;

	useEffect(
		() =>
			watchTracklistEdits(() => {
				const next = recordOutsideEdits(latestHistory.current);
				if (next !== latestHistory.current) {
					commit(next);
				}
			}),
		[commit],
	);

	useEffect(() => {
		const before = recordOutsideEdits(latestHistory.current);
		commit(showCurrent(reapplyReleaseLabels(before, session, release.labels)));
	}, [session, release.labels, commit]);

	const editState = useCallback(
		(change: StateChange) => {
			const before = recordOutsideEdits(latestHistory.current);
			const next = applyChoices(
				change(before.current),
				session,
				latestReleaseLabels.current,
			);
			commit(showCurrent(recordUserChange(before, next)));
		},
		[session, commit],
	);

	// Moves through the history and applies the current release labels to the
	// restored step.
	const restore = useCallback(
		(step: (history: PickerHistory) => PickerHistory) => {
			const restored = step(recordOutsideEdits(latestHistory.current));
			commit(
				showCurrent(
					reapplyReleaseLabels(restored, session, latestReleaseLabels.current),
				),
			);
		},
		[session, commit],
	);

	return {
		state: history.current,
		canUndo: canUndo(history),
		canRedo: canRedo(history),
		editState,
		reapply: useCallback(() => editState((state) => state), [editState]),
		undo: useCallback(() => restore(undoEdit), [restore]),
		redo: useCallback(() => restore(redoEdit), [restore]),
	};
}
