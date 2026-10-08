const API_KEY = process.env.TOUR_API_KEY ?? process.env.EXPO_PUBLIC_TOUR_API_KEY ?? '';
const BASE = 'https://apis.data.go.kr/B551011/Durunubi/courseList';
const PAGE_SIZE = 100;

let cache = null;
let cacheAt = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

async function fetchPage(pageNo) {
  const url = `${BASE}?serviceKey=${API_KEY}&numOfRows=${PAGE_SIZE}&pageNo=${pageNo}&MobileOS=ETC&MobileApp=banji&_type=json`;
  const res = await fetch(url);
  const data = await res.json();
  const body = data?.response?.body;
  if (!body) return { items: [], total: 0 };
  const total = Number(body.totalCount) || 0;
  let items = body.items?.item ?? [];
  if (!Array.isArray(items)) items = [items];
  return { items, total };
}

async function fetchGeojeTrails() {
  const first = await fetchPage(1);
  const totalPages = Math.ceil(first.total / PAGE_SIZE);

  const allItems = [...first.items];
  for (let p = 2; p <= totalPages; p++) {
    const { items } = await fetchPage(p);
    allItems.push(...items);
  }

  return allItems
    .filter(c => c.sigun?.includes('거제'))
    .map(c => ({
      id: c.crsIdx,
      name: c.crsKorNm,
      distance: Number(c.crsDstnc) || 0,
      durationMin: Number(c.crsTotlRqrmHour) || 0,
      level: Number(c.crsLevel) || 1,
      summary: c.crsSummary?.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim() ?? '',
      contents: c.crsContents?.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim() ?? '',
      sigun: c.sigun ?? '',
      gpxUrl: c.gpxpath ?? '',
    }));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (cache && Date.now() - cacheAt < CACHE_TTL) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cache);
  }

  try {
    const trails = await fetchGeojeTrails();
    cache = trails;
    cacheAt = Date.now();
    res.setHeader('X-Cache', 'MISS');
    res.status(200).json(trails);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
