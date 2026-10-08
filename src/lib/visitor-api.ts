export type VisitorLevel = 'high' | 'normal' | 'low';

export type VisitorStats = {
  recentAvg: number;
  prevAvg: number;
  ratio: number;
  level: VisitorLevel;
  latestDate: string;
  dataPoints: number;
  history: { ymd: string; value: number }[];
};

export async function fetchVisitorStats(): Promise<VisitorStats> {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const res = await fetch(`${base}/api/visitor-stats`);
  if (!res.ok) throw new Error(`visitor-stats API ${res.status}`);
  return res.json();
}

export function levelColor(level: VisitorLevel): string {
  if (level === 'high') return '#EF4444';   // 빨강 - 붐빔
  if (level === 'low') return '#3B82F6';    // 파랑 - 한산
  return '#F59E0B';                          // 노랑 - 보통
}

export function levelLabel(level: VisitorLevel): string {
  if (level === 'high') return '🔴 지금 거제 붐벼요!';
  if (level === 'low') return '🔵 지금 거제 한산해요';
  return '🟡 지금 거제 보통이에요';
}

export function formatVisitorCount(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}천 명`;
  return `${n.toLocaleString()} 명`;
}
