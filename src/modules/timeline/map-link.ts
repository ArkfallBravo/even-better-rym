import mountMap from "../map/main";
import { applySmallMapCoords, clearSmallMapOverlay } from "../map/overlay";
import { insertPanelAfterLastRenderedTextArtist } from "./dom-helpers";
import { openPastShows } from "./show";
import { isDarkPage } from "./theme";

const LINK_CLASS = "rymmt-link";

export function addMapLink(showsHeaderEl: HTMLElement): void {
	if (showsHeaderEl.parentElement?.querySelector(`.${LINK_CLASS}.rymmt-map-link`)) {
		return;
	}

	const mapLink = document.createElement("span");
	mapLink.className = `${LINK_CLASS} rymmt-map-link`;
	mapLink.textContent = "[Map]";

	if (isDarkPage(showsHeaderEl)) {
		mapLink.style.color = "#7eb8f7";
	}

	mapLink.addEventListener("click", async () => {
		try {
			const existing = document.getElementById("rymmt-map-root");

			if (existing) {
				existing.remove();
				clearSmallMapOverlay();
				return;
			}

			await openPastShows(3000);

			const root = document.createElement("div");
			root.id = "rymmt-map-root";
			root.style.marginTop = "10px";

			const inserted = insertPanelAfterLastRenderedTextArtist(root, showsHeaderEl);

			if (!inserted) {
				(showsHeaderEl.parentElement ?? document.body).appendChild(root);
			}

			mountMap(root);
			applySmallMapCoords();
		} catch (error) {
			console.error("[map] mount error", error);
		}
	});

	showsHeaderEl.appendChild(mapLink);
}