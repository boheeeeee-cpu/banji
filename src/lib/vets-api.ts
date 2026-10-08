export type VetItem = {
  name: string;
  address: string;
  tel: string;
  status: string;
};

export async function fetchGeojeVets(): Promise<VetItem[]> {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const res = await fetch(`${base}/api/vets`);
  if (!res.ok) throw new Error(`vets API ${res.status}`);
  return res.json();
}
