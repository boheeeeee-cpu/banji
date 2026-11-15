import { apiOrigin } from '@/lib/api-base';

export type TrailItem = {
  id: string;
  name: string;
  distance: number;
  durationMin: number;
  level: number;
  summary: string;
  contents: string;
  sigun: string;
  gpxUrl: string;
};

export async function fetchGeojeTrails(): Promise<TrailItem[]> {
  const res = await fetch(`${apiOrigin()}/api/trails`);
  if (!res.ok) throw new Error(`trails API ${res.status}`);
  return res.json();
}
