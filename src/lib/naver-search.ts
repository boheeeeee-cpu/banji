import { Platform } from 'react-native';

const CLIENT_ID = process.env.EXPO_PUBLIC_NAVER_SEARCH_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.EXPO_PUBLIC_NAVER_SEARCH_CLIENT_SECRET ?? '';

export type NaverLocalResult = {
  title: string;
  link: string;
  category: string;
  address: string;
  roadAddress: string;
  lat: number;
  lng: number;
};

function stripHtml(str: string): string {
  return str.replace(/<[^>]+>/g, '');
}

function getUrl(query: string, display: number): string {
  const params = new URLSearchParams({ query, display: String(display), sort: 'random' });
  if (Platform.OS === 'web') {
    return `http://localhost:3001/local?${params}`;
  }
  return `https://openapi.naver.com/v1/search/local.json?${params}`;
}

function getHeaders(): Record<string, string> {
  if (Platform.OS === 'web') return {};
  return {
    'X-Naver-Client-Id': CLIENT_ID,
    'X-Naver-Client-Secret': CLIENT_SECRET,
  };
}

export async function searchNaverLocal(query: string, display = 5): Promise<NaverLocalResult[]> {
  const res = await fetch(getUrl(query, display), { headers: getHeaders() });
  if (!res.ok) throw new Error(`${res.status}`);
  const data = await res.json() as {
    items: Array<{
      title: string; link: string; category: string;
      address: string; roadAddress: string; mapx: string; mapy: string;
    }>;
  };
  return (data.items ?? []).map(item => ({
    title: stripHtml(item.title),
    link: item.link,
    category: item.category,
    address: item.address,
    roadAddress: item.roadAddress,
    lat: parseInt(item.mapy) / 1e7,
    lng: parseInt(item.mapx) / 1e7,
  }));
}
