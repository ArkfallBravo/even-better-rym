// ----------------------------------------------------------------------- //
//
// MODULE  : simple-tracklist.ts
//
// PURPOSE : Reading, writing and watching RYM's tracklist editor
//
// CREATED : 10/7/2026
//
// ----------------------------------------------------------------------- //

import { forceQuerySelector } from "~/shared/utils/dom";

import { showAdvancedTracklist, showSimpleTracklist } from "./page-functions";
import type { TrackKey } from "./track-artist-links";
import { getChangedTitles, getTrackKeys } from "./track-artist-links";

const SIMPLE_SELECTOR = "#tracks_simp";
const ADVANCED_SELECTOR = "#tracks_adv";
const ADVANCED_INPUT_SELECTOR = "#track_advanced";
const ROW_TEMPLATE_SELECTOR = "#track_base";
const ROW_SELECTOR = 'tr[id^="track_"]:not(#track_base)';
const NUMBER_INPUT_SELECTOR = 'input[id^="track_track_number"]';
const TITLE_INPUT_SELECTOR = 'input[id^="track_track_title"]';
const LENGTH_INPUT_SELECTOR = 'input[id^="track_track_length"]';
const RESET_SLOT_CLASS = "ebr-track-reset";
// Places the reset slot just past the time cell's right edge, outside the
// table, centred on the row.
const RESET_SLOT_STYLE: Partial<CSSStyleDeclaration> = {
	position: "absolute",
	left: "100%",
	top: "50%",
	transform: "translateY(-50%)",
	marginLeft: "4px",
	whiteSpace: "nowrap",
};
const FIELD_SEPARATOR = "|";
const LINE_SEPARATOR = "\n";

const getRows = (): HTMLTableRowElement[] => [
	...document.querySelectorAll<HTMLTableRowElement>(
		`${SIMPLE_SELECTOR} ${ROW_SELECTOR}`,
	),
];

// Returns the value of the row's input matching selector.
const readRowInput = (row: Element, selector: string): string =>
	row.querySelector<HTMLInputElement>(selector)?.value ?? "";

// Returns each row's track key, from its position field.
const getRowKeys = (rows: Element[]): (TrackKey | undefined)[] =>
	getTrackKeys(
		rows.map((row) => readRowInput(row, NUMBER_INPUT_SELECTOR).trim()),
	);

// Checks whether the advanced (text) editor is the one showing.
const isAdvancedShowing = (): boolean =>
	forceQuerySelector<HTMLElement>(document)(ADVANCED_SELECTOR).style.display !==
	"none";

// Returns the rows' fields as advanced tracklist text, as RYM builds it.
const readSimpleText = (): string =>
	getRows()
		.map((row) =>
			[NUMBER_INPUT_SELECTOR, TITLE_INPUT_SELECTOR, LENGTH_INPUT_SELECTOR]
				.map((selector) => readRowInput(row, selector))
				.join(FIELD_SEPARATOR),
		)
		.join(LINE_SEPARATOR);

// Returns the tracklist as advanced text, from whichever editor is showing.
export const readTracklistText = (): string =>
	isAdvancedShowing()
		? forceQuerySelector<HTMLTextAreaElement>(document)(
				ADVANCED_INPUT_SELECTOR,
			).value.trimEnd()
		: readSimpleText();

// Writes each title into its row's title input.
const writeRowTitles = (titles: Map<TrackKey, string>): void => {
	const rows = getRows();
	const keys = getRowKeys(rows);
	rows.forEach((row, index) => {
		const key = keys[index];
		const title = key === undefined ? undefined : titles.get(key);
		const input = row.querySelector<HTMLInputElement>(TITLE_INPUT_SELECTOR);
		if (title !== undefined && input !== null) {
			input.value = title;
		}
	});
};

// Replaces the tracklist through the advanced editor, leaving the simple
// editor showing.
const writeThroughAdvanced = (text: string): void => {
	showAdvancedTracklist();
	forceQuerySelector<HTMLTextAreaElement>(document)(
		ADVANCED_INPUT_SELECTOR,
	).value = text;
	showSimpleTracklist();
};

// Makes the tracklist hold text. When only titles change in the simple
// editor, they are written into their inputs, so RYM doesn't rebuild the
// rows.
export const writeTracklistText = (text: string): void => {
	const currentText = readTracklistText();
	if (currentText === text) {
		return;
	}
	const changedTitles = isAdvancedShowing()
		? undefined
		: getChangedTitles(currentText, text);
	if (changedTitles === undefined) {
		writeThroughAdvanced(text);
		return;
	}
	writeRowTitles(changedTitles);
};

// Calls onEdit after the user changes a field or a row is added or removed,
// until the returned function is called.
export const watchTracklistEdits = (onEdit: () => void): (() => void) => {
	const editors = forceQuerySelector(document)(SIMPLE_SELECTOR).parentElement;
	const rowParent = forceQuerySelector(document)(
		ROW_TEMPLATE_SELECTOR,
	).parentElement;
	if (editors === null || rowParent === null) {
		return () => undefined;
	}
	editors.addEventListener("change", onEdit);
	// Only rows, not their contents, so adding reset slots doesn't call onEdit.
	const observer = new MutationObserver(onEdit);
	observer.observe(rowParent, { childList: true });
	return () => {
		editors.removeEventListener("change", onEdit);
		observer.disconnect();
	};
};

// Returns the row's reset slot, adding it beside the time cell if missing,
// or undefined if the row has no time cell.
const ensureResetSlot = (row: HTMLTableRowElement): HTMLElement | undefined => {
	const existing = row.querySelector<HTMLElement>(`.${RESET_SLOT_CLASS}`);
	if (existing !== null) {
		return existing;
	}
	const lengthCell = row
		.querySelector(LENGTH_INPUT_SELECTOR)
		?.closest<HTMLTableCellElement>("td");
	if (lengthCell === null || lengthCell === undefined) {
		return undefined;
	}
	// Positions the slot relative to the cell.
	lengthCell.style.position = "relative";
	const slot = document.createElement("span");
	slot.className = RESET_SLOT_CLASS;
	Object.assign(slot.style, RESET_SLOT_STYLE);
	lengthCell.append(slot);
	return slot;
};

// Returns each track's reset slot, adding the slots RYM's row rebuilds
// removed.
export const ensureResetSlots = (): Map<TrackKey, HTMLElement> => {
	const rows = getRows();
	const keys = getRowKeys(rows);
	const slots = new Map<TrackKey, HTMLElement>();
	rows.forEach((row, index) => {
		const key = keys[index];
		const slot = ensureResetSlot(row);
		if (key !== undefined && slot !== undefined) {
			slots.set(key, slot);
		}
	});
	return slots;
};
