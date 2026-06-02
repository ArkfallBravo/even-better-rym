import { useEffect, useMemo, useRef } from 'preact/hooks';
import type { CityPoint } from './types';
import { geocodeCity, getCachedCity, latLonToSmallMapCoords } from './geocode';
import { SMALL_MAP_SVG } from './map-svg';
import './map.css';

type Props = {
	cities?: (string | CityPoint)[];
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const MARKER_GROUP_CLASS = 'rymmt-small-map-markers';

function sanitizeHtml(html: string) {
	return html.replace(/onclick="[^"]*"/g, '');
}

function getMarkerGroup(svg: SVGSVGElement) {
	const transformGroup = svg.querySelector<SVGGElement>('g[transform^="translate"]');
	const parent = transformGroup ?? (svg.firstElementChild as SVGGElement | null) ?? svg;
	let group = parent.querySelector<SVGGElement>(`.${MARKER_GROUP_CLASS}`);
	if (!group) {
		group = document.createElementNS(SVG_NS, 'g');
		group.setAttribute('class', MARKER_GROUP_CLASS);
		parent.appendChild(group);
	}
	return group;
}

function createMarker(point: CityPoint, index: number) {
	const { cx, cy } = latLonToSmallMapCoords(point.lat, point.lon);
	const circle = document.createElementNS(SVG_NS, 'circle');
	circle.setAttribute('class', 'rymmt-small-map-marker');
	circle.setAttribute('r', '3');
	circle.setAttribute('cx', String(cx));
	circle.setAttribute('cy', String(cy));
	circle.setAttribute('fill', 'rgb(255, 255, 255)');
	circle.setAttribute('stroke', '#fff');
	circle.setAttribute('stroke-width', '1.5');
	circle.setAttribute('opacity', '0.45');
	circle.setAttribute('data-city', point.name);
	circle.setAttribute('data-index', String(index));
	circle.setAttribute('title', point.name);
	return circle;
}

export default function MapApp({ cities = [] }: Props) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const mapHtml = useMemo(() => sanitizeHtml(SMALL_MAP_SVG), []);

	useEffect(() => {
		let active = true;
		const root = containerRef.current;
		if (!root) return;

		const svg = root.querySelector('svg');
		if (!svg || !(svg instanceof SVGSVGElement)) return;

		const markerGroup = getMarkerGroup(svg);
		markerGroup.innerHTML = '';

		void (async () => {
			const points: CityPoint[] = [];
			for (const city of cities) {
				if (typeof city === 'string') {
					const cached = getCachedCity(city);
					if (cached) {
						points.push(cached);
						continue;
					}
					const g = await geocodeCity(city);
					if (g) points.push(g);
				} else {
					points.push(city);
				}
			}

			if (!active) return;
			markerGroup.innerHTML = '';
			for (const [index, point] of points.entries()) {
				markerGroup.appendChild(createMarker(point, index));
			}
		})();

		return () => {
			active = false;
		};
	}, [cities]);

	return <div class="rymmt-small-map-root" ref={containerRef} dangerouslySetInnerHTML={{ __html: mapHtml }}></div>;
}
