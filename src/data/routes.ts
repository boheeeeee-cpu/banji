export type RecommendedRoute = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  duration: string;
  tags: string[];
  placeIds: string[];
};

export const RECOMMENDED_ROUTES: RecommendedRoute[] = [
  {
    id: 'route_maemiseong',
    emoji: '🏰',
    name: '매미성 반나절',
    description: '장목면 대표 카페 두 곳과 하청 굴구이로 마무리하는 북서부 코스',
    duration: '반나절',
    tags: ['카페', '맛집', '드라이브'],
    placeIds: ['4', '5', '10'],
  },
  {
    id: 'route_okpo',
    emoji: '🌊',
    name: '옥포 해변 산책',
    description: '옥포항부터 팔랑포 해수욕장까지 바다를 따라 걷고 카페로 마무리',
    duration: '반나절',
    tags: ['바다', '산책', '카페'],
    placeIds: ['17', '15', '16', '6'],
  },
  {
    id: 'route_jisepo',
    emoji: '🐾',
    name: '지세포 반려견 코스',
    description: '수변공원 산책 후 방파제 뷰, 카페와 맛집까지 강아지와 함께하기 좋은 코스',
    duration: '하루',
    tags: ['반려견', '산책', '수변공원'],
    placeIds: ['7', '18', '19', '9'],
  },
  {
    id: 'route_nature',
    emoji: '🌿',
    name: '동부 자연 탐방',
    description: '산촌습지에서 힐링하고 싱싱한 해산물로 마무리하는 자연 중심 코스',
    duration: '반나절',
    tags: ['자연', '습지', '해산물'],
    placeIds: ['20', '11', '7'],
  },
];
