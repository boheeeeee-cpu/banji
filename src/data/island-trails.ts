// 거제섬앤섬길 코스 (자료: 거제랑 geoje-rang.co.kr, 2026-11-15 확인)
// 14개 코스 중 확인된 것만 넣음. 칠천량 해전길은 숫자가 다른 코스와 겹쳐 의심스러워 뺐음
// 반려견 동반 여부·시작점 좌표는 자료에 없음

export type IslandTrail = {
  id: string;
  name: string;
  distanceKm: number;
  duration: string;
  stops: string[];
  sourceUrl: string;
};

export const ISLAND_TRAILS: IslandTrail[] = [
  {
    id: 'maengjong',
    name: '맹종죽순 체험길',
    distanceKm: 8,
    duration: '4시간 40분',
    stops: ['사환마을 입구', '맹종죽테마파크', '맹종죽테마파크 제2진입구', '실전마을', '성동마을 입구'],
    sourceUrl: 'https://geoje-rang.co.kr/Maengjong',
  },
  {
    id: 'goryeo-village',
    name: '고려촌 문화체험길',
    distanceKm: 16,
    duration: '8시간',
    stops: ['거제시관광안내소', '국제식품(임도)', '둔덕기성', '임도', '둔덕농촌체험센터', '청마생가', '산방산비원', '산방산', '옥동마을'],
    sourceUrl: 'https://geoje-rang.co.kr/GoryeoVillage',
  },
];
