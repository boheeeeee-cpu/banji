import { GEOJE_LOCAL_FESTIVALS } from '@/data/geoje-festivals';
import { fetchGeojeEvents, type FestivalItem } from '@/lib/tour-api';

export type NowFestival = FestivalItem & {
  start: Date;
  end: Date;
  /** 거제시 관광 사이트 기준 예년 일정(정확한 날짜 아님) */
  estimated: boolean;
  status: 'ongoing' | 'upcoming';
};

function parseYmd(ymd: string): Date | null {
  if (!/^\d{8}$/.test(ymd)) return null;
  return new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)));
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** 로컬 축제는 매년 비슷한 때 열리므로 월·일만 보고 올해 또는 내년 날짜로 맞춤 */
function nextOccurrence(item: FestivalItem, today: Date): { start: Date; end: Date } | null {
  const s = parseYmd(item.eventstartdate);
  const e = parseYmd(item.eventenddate) ?? s;
  if (!s || !e) return null;
  for (const year of [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1]) {
    const start = new Date(year, s.getMonth(), s.getDate());
    const endYear = (e.getMonth() * 100 + e.getDate()) < (s.getMonth() * 100 + s.getDate()) ? year + 1 : year;
    const end = new Date(endYear, e.getMonth(), e.getDate());
    if (end >= today) return { start, end };
  }
  return null;
}

/** 지금 열리는 중이거나 withinDays일 안에 시작하는 거제 축제·행사 */
export async function fetchNowFestivals(withinDays = 60): Promise<NowFestival[]> {
  const today = startOfDay(new Date());
  const limit = new Date(today.getTime() + withinDays * 24 * 60 * 60 * 1000);

  let tour: FestivalItem[] = [];
  try { tour = await fetchGeojeEvents(); } catch { tour = []; }

  const result: NowFestival[] = [];
  const titles = new Set<string>();

  for (const item of tour) {
    const start = parseYmd(item.eventstartdate);
    const end = parseYmd(item.eventenddate) ?? start;
    if (!start || !end || end < today || start > limit) continue;
    titles.add(item.title);
    result.push({ ...item, start, end, estimated: false, status: start <= today ? 'ongoing' : 'upcoming' });
  }

  for (const item of GEOJE_LOCAL_FESTIVALS) {
    if (titles.has(item.title)) continue;
    const occ = nextOccurrence(item, today);
    if (!occ || occ.start > limit) continue;
    result.push({ ...item, ...occ, estimated: true, status: occ.start <= today ? 'ongoing' : 'upcoming' });
  }

  return result.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function formatPeriod(f: NowFestival): string {
  if (f.estimated && f.periodLabel) return `${f.periodLabel} (예년 기준)`;
  const fmt = (d: Date) => `${d.getMonth() + 1}.${d.getDate()}`;
  return f.start.getTime() === f.end.getTime() ? fmt(f.start) : `${fmt(f.start)} ~ ${fmt(f.end)}`;
}
