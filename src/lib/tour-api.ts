const API_KEY = process.env.EXPO_PUBLIC_TOUR_API_KEY ?? '';
const BASE = 'https://apis.data.go.kr/B551011';

export type TourItem = {
  contentid: string;
  title: string;
  addr1: string;
  mapx: string;
  mapy: string;
  firstimage: string;
  tel: string;
  contenttypeid?: string;
};

export type PetTourItem = TourItem & {
  acmpyTypeCd: string;
  acmpyPsblCpam: string;
  acmpyNeedMtr: string;
  etcAcmpyInfo: string;
};

async function get<T>(endpoint: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`${BASE}/${endpoint}`);
  url.searchParams.set('serviceKey', API_KEY);
  url.searchParams.set('MobileOS', 'ETC');
  url.searchParams.set('MobileApp', 'banji');
  url.searchParams.set('_type', 'json');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  const json = await res.json();
  const items = json?.response?.body?.items?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

// 거제 해수욕장 목록 (KorService2)
export async function fetchGeojeBeaches(): Promise<TourItem[]> {
  return get<TourItem>('KorService2/areaBasedList2', {
    areaCode: '36',
    sigunguCode: '1',
    contentTypeId: '12',
    cat1: 'A01',
    cat2: 'A0101',
    cat3: 'A01010400',
    numOfRows: '50',
    pageNo: '1',
  });
}

// 거제 반려동물 동반 가능 전체 장소 (KorPetTourService2)
export async function fetchGeojePetFriendly(contentTypeId?: string): Promise<PetTourItem[]> {
  return get<PetTourItem>('KorPetTourService2/areaBasedList2', {
    areaCode: '36',
    sigunguCode: '1',
    ...(contentTypeId ? { contentTypeId } : {}),
    numOfRows: '100',
    pageNo: '1',
  });
}

// 거제 인기 관광지 - 야외 관광지(12)만, 추천수순 (KorService2, 실시간 API 호출)
// 카페·식당·숙소는 반려동물 동반 여부 불명이므로 제외
export async function fetchGeojePopular(count = 10): Promise<TourItem[]> {
  return get<TourItem>('KorService2/areaBasedList2', {
    areaCode: '36',
    sigunguCode: '1',
    contentTypeId: '12',
    arrange: 'Q',
    numOfRows: String(count),
    pageNo: '1',
  });
}

// contentId로 반려동물 상세 정보 조회 (KorPetTourService2)
export async function fetchPetDetail(contentId: string): Promise<PetTourItem | null> {
  const items = await get<PetTourItem>('KorPetTourService2/detailPetTour2', {
    contentId,
  });
  return items[0] ?? null;
}
