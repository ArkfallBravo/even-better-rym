import { h, render } from 'preact';
import MapApp from './app';
import type { CityPoint } from './types';
import { findOfflineLocation } from './geocode';

// Try to auto-detect city list from page: look for .rymmt-show elements with data-city
function extractCitiesFromDocument(): (string | CityPoint)[] {
	const results: (string | CityPoint)[] = [];

	function resolveLocationId(item: HTMLElement): boolean {
		const id = item.getAttribute('data-loc-id') || item.id?.match(/loc_\d+/i)?.[0];
		if (!id) return false;
		const offline = findOfflineLocation(id);
		if (!offline) return false;
		results.push(offline);
		return true;
	}

	// Prefer structured show list items used on the artist page
	const items = document.querySelectorAll<HTMLElement>('.section_artist_shows ul.shows li');
	if (items.length) {
		for (const item of Array.from(items)) {
			if (resolveLocationId(item)) continue;

			let city = '';
			const venueSpan = item.querySelector<HTMLElement>('.show_venue');
			const smallSpan = venueSpan?.querySelector<HTMLElement>('span') ?? item.querySelector<HTMLElement>('span[style*="font-size"]');
			if (smallSpan && smallSpan.textContent) city = smallSpan.textContent.trim();

			// fallback: if venueSpan contains text besides the venue anchor, strip the anchor text
			if (!city && venueSpan) {
				const anchor = venueSpan.querySelector<HTMLElement>('a');
				const txt = (venueSpan.textContent || '').trim();
				if (anchor && anchor.textContent) {
					city = txt.replace(anchor.textContent, '').trim();
				} else {
					city = txt;
				}
			}

			// generic fallback: take the part after the last comma in the li text
			if (!city) {
				const txt = (item.textContent || '').replace(/\s+/g, ' ').trim();
				const parts = txt.split(',');
				if (parts.length >= 2) city = parts.slice(-2).join(',').trim();
				else city = parts.slice(-1)[0] ?? '';
			}

			if (city) results.push(city);
		}
		// dedupe preserving order
		return Array.from(new Set(results));
	}

	// fallback: generic elements with data-city/data-location or .rymmt-show markers
	const els = document.querySelectorAll<HTMLElement>('.rymmt-show, [data-city], [data-location], [id^="loc_"]');
	for (const el of Array.from(els)) {
		if (resolveLocationId(el)) continue;
		const city = el.getAttribute('data-city') || el.getAttribute('data-location') || el.textContent || '';
		if (city) results.push(city.trim());
	}
	return Array.from(new Set(results));
}

export function mountMap(container: HTMLElement, cities?: (string | CityPoint)[]) {
	render(h(MapApp, { cities: cities ?? extractCitiesFromDocument() }), container);
}

// If script is included directly on a page, auto-mount into #rymmt-map-root
if (typeof window !== 'undefined') {
	const root = document.getElementById('rymmt-map-root');
	if (root) mountMap(root);
}

export default mountMap;
