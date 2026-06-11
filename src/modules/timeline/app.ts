import { waitForCallback } from "~/shared/utils/dom";

import { togglePanel } from "./panel";
import { isDarkPage } from "./theme";
import mountMap from "../map/main";
import { applySmallMapCoords, clearSmallMapOverlay } from "../map/overlay";
import { insertPanelAfterLastRenderedTextArtist } from "./dom-helpers";
import { openPastShows } from "./discography";

const LINK_CLASS = "rymmt-link";

export const main = async (): Promise<void> => {
	const membersHeaderEl = await waitForCallback<HTMLElement>(() => {
		const headers = document.querySelectorAll<HTMLElement>(".info_hdr");
		for (const header of headers) {
			if ((header.textContent || "").trim() === "Members") return header;
		}
		return undefined;
	});

	// Only add Timeline link if Members section exists
	if (membersHeaderEl) {
		// Rail-guard: do not inject if the link is already present
		if (membersHeaderEl.querySelector(`.${LINK_CLASS}`)) {
			// Timeline link already exists, but still check for Map link below
		} else {
			const link = document.createElement("span");
			link.className = LINK_CLASS;
			link.textContent = "[Timeline]";
			// Use a light blue in dark mode so the link is visible against the dark header
			if (isDarkPage(membersHeaderEl)) link.style.color = "#7eb8f7";
			link.addEventListener("click", () => {
				togglePanel(membersHeaderEl);
			});

			membersHeaderEl.appendChild(link);
		}
	}

	// Also add a Map link next to the Shows header (works for both bands and solo artists)
	const showsHeaderEl = await waitForCallback<HTMLElement>(() => {
		const hdr = document.querySelector<HTMLElement>(".section_artist_shows .artist_page_header h2");
		if (hdr && (hdr.textContent || "").trim() === "Shows") return hdr;
		return undefined;
	});
	if (showsHeaderEl && !showsHeaderEl.parentElement?.querySelector(`.${LINK_CLASS}.rymmt-map-link`)) {
		const mapLink = document.createElement("span");
		mapLink.className = `${LINK_CLASS} rymmt-map-link`;
		mapLink.textContent = "[Map]";
		if (isDarkPage(showsHeaderEl)) mapLink.style.color = "#7eb8f7";
		mapLink.addEventListener("click", async () => {
			try {
				const existing = document.getElementById("rymmt-map-root");
				if (existing) {
					// toggle hide
					existing.remove();
	                    // also clear any applied small-map overlay
	                    try { clearSmallMapOverlay(); } catch (e) { /* ignore */ }
					return;
				}

				// Open past shows and wait up to 3 seconds for them to load
				await openPastShows(3000);

				const root = document.createElement("div");
				root.id = "rymmt-map-root";
				root.style.marginTop = "10px";
				// Try to insert in the same shared area the timeline panel uses
				const inserted = insertPanelAfterLastRenderedTextArtist(root, showsHeaderEl);
				if (!inserted) {
					(showsHeaderEl.parentElement ?? document.body).appendChild(root);
				}
				// Mount the map (map module handles extracting cities)
				mountMap(root);
				// Also attempt to apply coordinates to any small built-in SVG map on the page
				try { applySmallMapCoords(); } catch (e) { /* best-effort */ }
			} catch (e) {
				console.error("[map] mount error", e);
			}
		});

		showsHeaderEl.appendChild(mapLink);
	}
};
