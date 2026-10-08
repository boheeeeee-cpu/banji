const API_KEY = process.env.TOUR_API_KEY ?? process.env.EXPO_PUBLIC_TOUR_API_KEY ?? '';
const BASE = 'https://apis.data.go.kr/B551011/DataLabService/locgoRegnVisitrDDList';
const GEOJE_CODE = '48310';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6시간

let cache = null;
let cacheAt = 0;

function dateStr(d) {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

async function fetchDayOutsiders(ymd) {
  const url = `${BASE}?serviceKey=${API_KEY}&numOfRows=1000&pageNo=1&MobileOS=ETC&MobileApp=banji&_type=json&startYmd=${ymd}&endYmd=${ymd}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const data = await res.json();
  const items = data?.response?.body?.items?.item;
  if (!items) return null;
  const list = Array.isArray(items) ? items : [items];
  const entry = list.find(x => x?.signguCode === GEOJE_CODE && x?.touDivCd === '2');
  return entry ? { ymd, value: Number(entry.touNum) || 0 } : null;
}

async function fetchStats() {
  const today = new Date();
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i - 1);
    return dateStr(d);
  });

  const results = await Promise.allSettled(days.map(d => fetchDayOutsiders(d)));
  const data = results
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value)
    .sort((a, b) => a.ymd.localeCompare(b.ymd));

  if (data.length < 3) return null;

  const values = data.map(d => d.value);
  const half = Math.floor(values.length / 2);
  const recent = values.slice(half);
  const prev = values.slice(0, half);

  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const recentAvg = avg(recent);
  const prevAvg = prev.length > 0 ? avg(prev) : recentAvg;
  const ratio = prevAvg > 0 ? recentAvg / prevAvg : 1;

  const level = ratio >= 1.15 ? 'high' : ratio <= 0.85 ? 'low' : 'normal';

  return {
    recentAvg: Math.round(recentAvg),
    prevAvg: Math.round(prevAvg),
    ratio: Math.round(ratio * 100) / 100,
    level,
    latestDate: data[data.length - 1].ymd,
    dataPoints: data.length,
    history: data.slice(-14).map(d => ({ ymd: d.ymd, value: Math.round(d.value) })),
  };
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
    const stats = await fetchStats();
    if (!stats) return res.status(503).json({ error: 'no data' });
    cache = stats;
    cacheAt = Date.now();
    res.setHeader('X-Cache', 'MISS');
    res.status(200).json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
