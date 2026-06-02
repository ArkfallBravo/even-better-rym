import { getOfflineLocationById, getOfflineLocationByName, latLonToSmallMapCoords } from './geocode';

function findSvgWithLocs(): SVGSVGElement | null {
    const svgs = Array.from(document.querySelectorAll('svg')) as SVGSVGElement[];
    for (const svg of svgs) {
        // If the svg already contains loc_* elements, choose it
        if (svg.querySelector('[id^="loc_"]')) return svg;
        // Or if it contains any element with a cx attribute, prefer it
        if (svg.querySelector('[cx]')) return svg;
    }
    return null;
}

function parseId(el: Element) {
    const m = (el.id || '').match(/loc_\d+/i);
    return m ? m[0].toLowerCase() : null;
}

export function applySmallMapCoords(): void {
    try {
        const svg = findSvgWithLocs();
        // We'll target any element with id starting with loc_ anywhere
        const locEls = Array.from(document.querySelectorAll('[id^="loc_"]')) as Element[];

        for (const el of locEls) {
            const id = parseId(el);
            if (!id) continue;
            const offline = getOfflineLocationById(id);
            if (!offline) continue;

            const { cx, cy } = latLonToSmallMapCoords(offline.lat, offline.lon);
            // If the element is an SVG element that supports cx/cy, set them.
            if (el instanceof SVGElement) {
                el.setAttribute('cx', String(cx));
                el.setAttribute('cy', String(cy));
                el.classList.add('rymmt-small-map-applied');
            } else {
                // If not SVG, attempt to find a corresponding SVG child by id inside the discovered svg
                if (svg) {
                    const target = svg.querySelector(`#${CSS.escape(el.id)}`) as SVGElement | null;
                    if (target) {
                        target.setAttribute('cx', String(cx));
                        target.setAttribute('cy', String(cy));
                        target.classList.add('rymmt-small-map-applied');
                    }
                }
            }
        }

        // Additionally, try to annotate any non-loc elements by city name matching
        const textCandidates = Array.from(document.querySelectorAll<HTMLElement>('.show_venue, li, span')).slice(0, 500);
        for (const el of textCandidates) {
            const txt = (el.textContent || '').trim();
            if (!txt) continue;
            const offlineByName = getOfflineLocationByName(txt);
            if (!offlineByName) continue;
            // Attempt to find a corresponding svg child whose id contains the city name
            const svg2 = findSvgWithLocs();
            if (!svg2) continue;
            // naive search for a child with text matching the city name
            const child = Array.from(svg2.querySelectorAll('[id], [data-name]')).find((c) => {
                const id = (c as Element).getAttribute('id') || '';
                const dn = (c as Element).getAttribute('data-name') || '';
                return id.toLowerCase().includes(txt.toLowerCase()) || dn.toLowerCase().includes(txt.toLowerCase());
            }) as SVGElement | undefined;
            if (!child) continue;
            const { cx, cy } = latLonToSmallMapCoords(offlineByName.lat, offlineByName.lon);
            child.setAttribute('cx', String(cx));
            child.setAttribute('cy', String(cy));
            child.classList.add('rymmt-small-map-applied');
        }
    } catch (e) {
        // Non-fatal; overlay is best-effort
        // eslint-disable-next-line no-console
        console.warn('[map][overlay] apply failed', e);
    }
}

export function clearSmallMapOverlay(): void {
    try {
        const applied = Array.from(document.querySelectorAll('.rymmt-small-map-applied')) as Element[];
        for (const el of applied) {
            if (el instanceof SVGElement) {
                el.removeAttribute('cx');
                el.removeAttribute('cy');
            }
            el.classList.remove('rymmt-small-map-applied');
        }
    } catch (e) {
        // ignore
    }
}

export default { applySmallMapCoords, clearSmallMapOverlay };
