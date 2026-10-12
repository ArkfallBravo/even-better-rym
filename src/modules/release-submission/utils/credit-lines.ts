// ----------------------------------------------------------------------- //
//
// MODULE  : credit-lines.ts
//
// PURPOSE : Adding and removing lines in RYM's credits list
//
// CREATED : 10/12/2026
//
// ----------------------------------------------------------------------- //

import type { ArtistCredit } from "./page-functions";
import { addArtistCredit, deleteCreditLine } from "./page-functions";

const CREDIT_LINE_SELECTOR = "#creditsx li.sortable_credit";
const CREDIT_LINE_ID_PREFIX = "credits_";

// Returns the number of the last line in the credits list, if any.
const getLastCreditLine = (): string | undefined => {
	const lines = document.querySelectorAll(CREDIT_LINE_SELECTOR);
	return lines[lines.length - 1]?.id.slice(CREDIT_LINE_ID_PREFIX.length);
};

// Adds a credit line and returns its number.
export const addCreditLine = (credit: ArtistCredit): string | undefined => {
	addArtistCredit(credit);
	return getLastCreditLine();
};

// Removes the numbered credit line, if there is one.
export const removeCreditLine = (line: string | undefined): void => {
	if (line !== undefined) {
		deleteCreditLine(line);
	}
};
