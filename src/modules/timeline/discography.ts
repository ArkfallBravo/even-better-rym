import {
	getDayOfYear,
	isLeapYear,
	MONTH_NAMES,
	parseDateFromText,
	parseFullDateFromText,
	parseDateLabelFromText,
	currentDecimalYear,
} from "./date-utils";
import { findAdjacentInfoContent } from "./dom-helpers";
import type { Bounds, DiscoMarker, DiscoType, MarkersByType } from "./types";

function extractDecimalYearFromSpan(span: Element | null): number | null {
	if (!span) return null;

	// Try full date string in title
	const title = span.getAttribute("title") ?? "";
	const fullMatch = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(title);
	if (fullMatch) {
		const day = Number.parseInt(fullMatch[1], 10);
		const month = MONTH_NAMES[fullMatch[2].toLowerCase()];
		const year = Number.parseInt(fullMatch[3], 10);
		if (month && Number.isFinite(year) && day >= 1 && day <= 31) {
			const doy = getDayOfYear(year, month, day);
			const daysInYear = isLeapYear(year) ? 366 : 365;
			return year + (doy - 1) / daysInYear;
		}
	}

	// Fall back to year from text content - place at mid-year
	const year = Number.parseInt((span.textContent ?? "").trim(), 10);
	return Number.isFinite(year) ? year + 0.5 : null;
}

function normalizeDiscoLabel(
	label: string | null | undefined,
): DiscoType | null {
	const type = String(label ?? "")
		.trim()
		.toLowerCase();
	if (type === "album" || type === "albums") return "album";
	if (type === "live album" || type === "live albums") return "live";
	if (type === "single" || type === "singles") return "single";
	if (type === "ep" || type === "eps") return "ep";
	if (
		type === "additional release" ||
		type === "additional releases" ||
		type === "additional"
	)
		return "additional";
	return null;
}

// Collect release markers (decimal year + title) from within a disco_type_* container
function collectReleases(
	container: Element | null,
	discoType: DiscoType,
	disbandedYear: number | null,
): DiscoMarker[] {
	if (!container) return [];
	const markers: DiscoMarker[] = [];
	const releases = container.querySelectorAll<Element>(".disco_release");
	for (const release of releases) {
		const yearSpan = release.querySelector(
			".disco_year_ymd, .disco_year_ym, .disco_year_y",
		);
		const decimalYear = extractDecimalYearFromSpan(yearSpan);
		if (decimalYear === null) continue;
		// disbandedYear is an integer; compare against the floor of the decimal year
		if (disbandedYear !== null && Math.floor(decimalYear) > disbandedYear)
			continue;

		const titleEl = release.querySelector<HTMLElement>(".disco_mainline a");
		const title =
			titleEl?.textContent?.trim() ?? String(Math.floor(decimalYear));

		markers.push({ year: decimalYear, title, type: discoType });
	}
	return markers;
}

export function extractDiscographyMarkersFromDOM(
	disbandedYear: number | null,
): MarkersByType {
	const markers: MarkersByType = {
		album: [],
		live: [],
		single: [],
		ep: [],
		additional: [],
		show: [],
	};

	const discographyRoot = document.getElementById("discography");
	if (!discographyRoot) return markers;

	const sectionHeaders = Array.from(
		discographyRoot.querySelectorAll<HTMLElement>(".disco_header_top"),
	);

	for (const header of sectionHeaders) {
		const labelEl = header.querySelector<HTMLElement>("h3.disco_header_label");
		const kind = normalizeDiscoLabel(labelEl?.textContent ?? "");
		if (!kind) continue;

		// Releases live inside the disco_type_* container that follows the header
		let node: Element | null = header.nextElementSibling;
		while (node && !node.classList.contains("disco_header_top")) {
			if (node.id.startsWith("disco_type_")) {
				markers[kind].push(...collectReleases(node, kind, disbandedYear));
				break;
			}
			node = node.nextElementSibling;
		}
	}

	// Deduplicate by (integer year, title) within each type, preserving order
	for (const type of Object.keys(markers) as (keyof MarkersByType)[]) {
		const seen = new Set<string>();
		markers[type] = markers[type].filter((m) => {
			const identifier = `${Math.floor(m.year)}|${m.title}`;
			if (seen.has(identifier)) return false;
			seen.add(identifier);
			return true;
		});
	}

	return markers;
}

function normalizeShowTitle(text: string): string {
	return text
		.replace(/[\u2013\u2014–—]+/g, " - ")
		.replace(/^[\s:\-–—]+/, "")
		.replace(/\s+/g, " ")
		.trim();
}

function parseDecimalYearFromDateString(text: string): number | null {
	const date = parseDateFromText(text);
	if (!date) return null;
	const year = date.getFullYear();
	const day = date.getDate();
	const month = date.getMonth() + 1;
	const doy = getDayOfYear(year, month, day);
	const daysInYear = isLeapYear(year) ? 366 : 365;
	return year + (doy - 1) / daysInYear;
}

function stripShowDateFromText(item: HTMLElement): string {
	const dateSpan = getShowDateSpan(item);
	const dateText = dateSpan?.textContent?.trim() ?? "";
	const rawText = item.textContent?.replace(/\s+/g, " ").trim() ?? "";
	if (!rawText) return "";
	if (!dateText) return rawText;
	return rawText.replace(dateText, "").replace(/^[\s:\-–—]+/, "").trim();
}

// Extract the date span from a show list item; prefers exact width match
function getShowDateSpan(item: HTMLElement): HTMLElement | null {
	// First try: look for the date span with width:10em (exact show date)
	const spans = Array.from(item.querySelectorAll<HTMLElement>("span"));
	for (const span of spans) {
		const style = span.getAttribute("style") || "";
		if (style.includes("width") && style.includes("10em")) {
			return span;
		}
	}
	// Fallback: first span that has a date-like text
	for (const span of spans) {
		const text = span.textContent?.trim() || "";
		// Check if it looks like a date (has a 4-digit year)
		if (/\b(19|20)\d{2}\b/.test(text)) {
			return span;
		}
	}
	return spans[0] ?? null;
}

function extractShowTitleFromListItem(item: HTMLElement): string | null {
	const rawText = stripShowDateFromText(item);
	if (!rawText) return null;

	const normalized = normalizeShowTitle(rawText);

	// Prefer explicit separators for show name and venue/city when available.
	const atMatch = normalized.match(/^(.*?)(?:\s+@\s+|\s+at\s+)(.*)$/i);
	if (atMatch) {
		return `${normalizeShowTitle(atMatch[1])} @ ${normalizeShowTitle(atMatch[2])}`;
	}

	return normalized;
}

function extractShowDateFromListItem(item: HTMLElement): number | null {
	const dateSpan = getShowDateSpan(item);
	const dateText = dateSpan?.textContent?.trim();
	if (!dateText) return null;
	return parseDecimalYearFromDateString(dateText);
}

function clickPastShowsButton(): void {
	const expandButton = document.getElementById("disco_expand_prev");
	if (!expandButton) return;

	// Only click if the button is still visible (past shows not yet loaded)
	if (expandButton.offsetParent === null) return;

	// Trigger the click via multiple methods to ensure it fires
	expandButton.click();
	expandButton.dispatchEvent(
		new MouseEvent("click", {
			bubbles: true,
			cancelable: true,
			view: window,
		}),
	);
}

async function waitForPastShowsLoaded(timeoutMs = 3000): Promise<void> {
	return new Promise((resolve) => {
		const start = performance.now();
		const showsContainer = document.querySelector<HTMLElement>(
			".section_artist_shows ul.shows",
		);
		const initialItemCount = showsContainer
			? showsContainer.querySelectorAll("li").length
			: 0;

		// If no shows container, just wait and return
		if (!showsContainer) {
			setTimeout(resolve, timeoutMs);
			return;
		}

		const expandButton = document.getElementById("disco_expand_prev");
		if (expandButton && expandButton.offsetParent === null) {
			// Past shows are already loaded or the button is hidden, so no need to wait.
			resolve();
			return;
		}

		const observer = new MutationObserver(() => {
			const expandButtonInner = document.getElementById("disco_expand_prev");
			const currentItemCount = showsContainer.querySelectorAll("li").length;

			// If the expand button disappeared, content likely loaded
			if (!expandButtonInner) {
				observer.disconnect();
				resolve();
				return;
			}

			// If number of items increased, check whether any newly added item
			// represents a past show (date <= now). If so, we're done.
			if (currentItemCount > initialItemCount) {
				const now = currentDecimalYear();
				const items = Array.from(showsContainer.querySelectorAll<HTMLElement>("li"));
				for (const it of items) {
					const d = extractShowDateFromListItem(it);
					if (d !== null && d <= now) {
						observer.disconnect();
						resolve();
						return;
					}
				}
			}

			if (performance.now() - start > timeoutMs) {
				observer.disconnect();
				resolve();
			}
		});
		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	});
}

export async function openPastShows(timeoutMs = 3000): Promise<void> {
	clickPastShowsButton();
	await waitForPastShowsLoaded(timeoutMs);
}

export async function extractShowMarkersFromDOM(
	disbandedYear: number | null,
): Promise<DiscoMarker[]> {
	clickPastShowsButton();
	await waitForPastShowsLoaded();
	const showsSection = document.querySelector<HTMLElement>(
		".section_artist_shows ul.shows",
	);
	if (!showsSection) return [];

	const markers: DiscoMarker[] = [];
	const seen = new Set<string>();

	for (const item of Array.from(showsSection.querySelectorAll<HTMLElement>("li"))) {
		const decimalYear = extractShowDateFromListItem(item);
		if (decimalYear === null) continue;
		if (disbandedYear !== null && Math.floor(decimalYear) > disbandedYear)
			continue;

		const title = extractShowTitleFromListItem(item);
		if (!title) continue;

		const identifier = `${decimalYear.toFixed(5)}|${title}`;
		if (seen.has(identifier)) continue;
		seen.add(identifier);
		markers.push({ year: decimalYear, title, type: "show" });
	}

	return markers;
}

// --------------------------
// Formed / Disbanded extraction
// --------------------------

function updateBoundsFromLabel(result: Bounds, label: string, date: Date): void {
	if (label === "formed") result.formedDate = date;
	if (label === "disbanded") result.disbandedDate = date;
	if (
		!result.disbandedDate &&
		(label.includes("disband") || label.includes("split"))
	) {
		result.disbandedDate = date;
	}
	if (!result.formedDate && label.includes("form")) {
		result.formedDate = date;
	}
}

export function readFormedAndDisbanded(
	containerRoot: ParentNode | null,
): Bounds {
	const root = containerRoot ?? document;
	const infoHeaders = Array.from(
		root.querySelectorAll<HTMLElement>(".info_hdr"),
	);
	const result: Bounds = { formedDate: null, disbandedDate: null };

	for (const header of infoHeaders) {
		const label = (header.textContent || "").trim().toLowerCase();
		if (!label) continue;

		const contentEl = findAdjacentInfoContent(header);
		if (!contentEl) continue;

		const labelText = parseDateLabelFromText(contentEl.textContent || "");
		const date = parseFullDateFromText(contentEl.textContent || "");
		if (labelText) {
			if (label === "formed") result.formedLabel = labelText;
			if (label === "disbanded") result.disbandedLabel = labelText;
		}
		if (date) updateBoundsFromLabel(result, label, date);
	}

	return result;
}
