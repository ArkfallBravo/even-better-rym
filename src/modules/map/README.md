Map module

This module provides a simple map view powered by Leaflet and OpenStreetMap tiles.

Usage

- Install dependency: `npm install leaflet`
- Import and mount from your page or app:

```ts
import mountMap from './modules/map/main';
const container = document.getElementById('rymmt-map-root');
mountMap(container, ['London, UK', 'New York, NY']);
```

Geocoding

This module uses OpenStreetMap Nominatim for geocoding via `geocodeCity()`.
- Nominatim is free but rate-limited. The helper includes localStorage caching and a 1.1s minimum delay between calls.
- The map also supports an offline location fallback from `geo.merged.sorted.csv`.
- If the page exposes `loc_XXXX` identifiers, the module resolves them from the offline CSV before calling Nominatim.
- The module also exports `latLonToSmallMapCoords(lat, lon)` to convert large-map lat/lon values into the small-map SVG coordinate system used by the built-in page map.
- For bulk geocoding or production use, consider an API key provider or your own local dataset.

Notes

- The component expects shows to be represented as elements with class `rymmt-show` and a `data-city` or `data-location` attribute for auto-discovery.
- You can seed `localStorage` with well-known city coordinates using `seedLocalGeocode()` in `geocode.ts`.
