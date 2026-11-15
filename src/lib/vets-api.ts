import { apiOrigin } from '@/lib/api-base';

export type VetItem = {
  name: string;
  address: string;
  tel: string;
  status: string;
};

export async function fetchGeojeVets(): Promise<VetItem[]> {
  const res = await fetch(`${apiOrigin()}/api/vets`);
  if (!res.ok) throw new Error(`vets API ${res.status}`);
  return res.json();
}
