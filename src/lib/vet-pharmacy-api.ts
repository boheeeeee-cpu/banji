import { Platform } from 'react-native';

const API_KEY = process.env.EXPO_PUBLIC_TOUR_API_KEY ?? '';
const ENDPOINT = 'https://api.odcloud.kr/api/15066349/v1/uddi:d3ad8ba1-4717-4943-ba24-833f5e664d9e';

export type VetPharmacy = {
  name: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
};

export async function fetchGeojePetPharmacies(): Promise<VetPharmacy[]> {
  let url: string;

  if (Platform.OS === 'web') {
    url = '/api/vet-pharmacy';
  } else {
    const params = new URLSearchParams({
      page: '1',
      perPage: '100',
      returnType: 'JSON',
      serviceKey: API_KEY,
    });
    url = `${ENDPOINT}?${params}`;
  }

  const res = await fetch(url);
  const json = await res.json();

  return (json.data ?? []).map((item: Record<string, unknown>) => ({
    name: String(item['사업장명칭'] ?? ''),
    address: String(item['사업장소재지(도로명)'] ?? ''),
    phone: String(item['소재지전화번호'] ?? ''),
    lat: Number(item['위도'] ?? 0),
    lng: Number(item['경도'] ?? 0),
  }));
}
