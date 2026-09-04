import type { Place } from '@/data/places';

export type MapPlacePayload = Pick<Place, 'id' | 'name' | 'lat' | 'lng' | 'area'>;

export type MapUpdatePayload = {
  routeIds: string[];
  places: MapPlacePayload[];
};

export function buildMapUpdateScript(payload: MapUpdatePayload): string {
  return `window.updateBanjiMap(${JSON.stringify(payload)}); true;`;
}
