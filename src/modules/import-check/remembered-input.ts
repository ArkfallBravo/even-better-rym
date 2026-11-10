// ----------------------------------------------------------------------- //
//
// MODULE  : remembered-input.ts
//
// PURPOSE : Saves the debug panels' last-run inputs between page loads
//
// CREATED : 11/10/2026
//
// ----------------------------------------------------------------------- //

const KEY_PREFIX = "ebr-import-check.";

// Returns the input last saved under key, or fallback if none was saved.
export function recallInput(key: string, fallback: string): string {
	return localStorage.getItem(KEY_PREFIX + key) ?? fallback;
}

// Saves an input value under key for the next page load.
export function rememberInput(key: string, value: string): void {
	localStorage.setItem(KEY_PREFIX + key, value);
}
