// ----------------------------------------------------------------------- //
//
// MODULE  : debug-tools.ts
//
// PURPOSE : Build flag and page path for the debug-only extension pages
//
// CREATED : 11/10/2026
//
// ----------------------------------------------------------------------- //

export const importCheckPagePath = "src/modules/import-check/index.html";

// Checks whether this build was made with VITE_DEBUG_TOOLS enabled.
export function hasDebugTools(): boolean {
	return import.meta.env.VITE_DEBUG_TOOLS === "true";
}
