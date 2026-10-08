const API_KEY = process.env.TOUR_API_KEY ?? process.env.EXPO_PUBLIC_TOUR_API_KEY ?? '';
const BASE = 'https://apis.data.go.kr/1741000/animal_hospitals/info';
const PAGE_SIZE = 100;
const CONCURRENCY = 20; // 동시 요청 수

// 메모리 캐시 (같은 Vercel 인스턴스 재사용 시 유효)
let cache = null;
let cacheAt = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6시간

async function fetchPage(pageNo) {
  const url = `${BASE}?serviceKey=${API_KEY}&numOfRows=${PAGE_SIZE}&pageNo=${pageNo}&returnType=json`;
  const res = await fetch(url);
  const data = await res.json();
  const body = data?.response?.body;
  if (!body) return { items: [], total: 0 };
  const total = Number(body.totalCount) || 0;
  let items = body.items?.item ?? [];
  if (!Array.isArray(items)) items = [items];
  return { items, total };
}

async function fetchAllGeojeVets() {
  // 첫 페이지로 총 건수 파악
  const first = await fetchPage(1);
  const totalPages = Math.ceil(first.total / PAGE_SIZE);

  // 나머지 페이지 번호 목록
  const pages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);

  // CONCURRENCY개씩 병렬 요청
  const allItems = [...first.items];
  for (let i = 0; i < pages.length; i += CONCURRENCY) {
    const chunk = pages.slice(i, i + CONCURRENCY);
    const results = await Promise.all(chunk.map(fetchPage));
    results.forEach(r => allItems.push(...r.items));
  }

  // 경상남도 거제시 + 영업 중만 필터
  return allItems.filter(h => {
    const addr = h.ROAD_NM_ADDR || h.LOTNO_ADDR || '';
    const active = h.SALS_STTS_NM?.includes('영업');
    return addr.includes('경상남도 거제시') && active;
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 캐시 히트
  if (cache && Date.now() - cacheAt < CACHE_TTL) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cache);
  }

  try {
    const vets = await fetchAllGeojeVets();
    const result = vets.map(h => ({
      name: h.BPLC_NM,
      address: h.ROAD_NM_ADDR || h.LOTNO_ADDR || '',
      tel: h.TELNO || '',
      status: h.SALS_STTS_NM || '',
    }));

    cache = result;
    cacheAt = Date.now();

    res.setHeader('X-Cache', 'MISS');
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
