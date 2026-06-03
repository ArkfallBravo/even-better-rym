import { waitForCallback } from "~/shared/utils/dom";

import { togglePanel } from "./panel";
import { isDarkPage } from "./theme";
import mountMap from "../map/main";
import { applySmallMapCoords, clearSmallMapOverlay } from "../map/overlay";
import { insertPanelAfterLastRenderedTextArtist } from "./dom-helpers";

const LINK_CLASS = "rymmt-link";
const MAP_PANEL_ID = "rymmt-map-panel";

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
		if (membersHeaderEl.querySelector(`.${LINK_CLASS}`)) return;

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
		mapLink.addEventListener("click", () => {
			toggleMapPanel(showsHeaderEl);
		});

		showsHeaderEl.appendChild(mapLink);
	}
};

function toggleMapPanel(headerEl: HTMLElement): void {
	try {
		let panel = document.getElementById(MAP_PANEL_ID);

		if (!panel) {
			panel = document.createElement("div");
			panel.id = MAP_PANEL_ID;
			panel.className = "rymmt-panel rymmt-hidden";
		}

		if (!document.body.contains(panel)) {
			const inserted = insertPanelAfterLastRenderedTextArtist(panel, headerEl);
			if (!inserted) {
				(document.querySelector("#content") ?? document.body).appendChild(panel);
			}
		}

		const isHidden = panel.classList.contains("rymmt-hidden");
		if (isHidden) {
			panel.classList.remove("rymmt-hidden");
			// Mount the map (map module handles extracting cities)
			mountMap(panel);
			// Also attempt to apply coordinates to any small built-in SVG map on the page
			try { applySmallMapCoords(); } catch (e) { /* best-effort */ }
		} else {
			panel.classList.add("rymmt-hidden");
			panel.innerHTML = "";
			// also clear any applied small-map overlay
			try { clearSmallMapOverlay(); } catch (e) { /* ignore */ }
		}
	} catch (e) {
		console.error("[map] togglePanel error", e);
	}
}
