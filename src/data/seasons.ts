// "지금 거제" 탭의 계절 카드. 계절마다 강아지와 거제를 즐기는 방법과 주의할 점
// 장소·날짜가 확실하지 않은 건 넣지 않고, 일반적인 안내로만 씀

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type SeasonCard = {
  emoji: string;
  title: string;
  body: string;
  kind: 'enjoy' | 'caution';
};

export const SEASON_LABELS: Record<Season, string> = {
  spring: '봄',
  summer: '여름',
  autumn: '가을',
  winter: '겨울',
};

export function seasonOf(month: number): Season {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export const SEASON_CARDS: Record<Season, SeasonCard[]> = {
  spring: [
    { kind: 'enjoy', emoji: '🌸', title: '꽃길 산책', body: '동백이 지고 진달래·벚꽃이 피는 때예요. 바람이 순해서 해안 산책하기 좋아요.' },
    { kind: 'enjoy', emoji: '🥾', title: '남파랑길 한 구간', body: '덥지 않아 긴 걷기에 좋은 계절이에요. 아이 체력에 맞춰 짧은 구간부터 골라 보세요.' },
    { kind: 'caution', emoji: '🕷️', title: '진드기 주의', body: '풀숲·숲길을 다녀오면 귀 뒤, 겨드랑이, 발가락 사이를 꼭 확인해 주세요.' },
  ],
  summer: [
    { kind: 'enjoy', emoji: '💠', title: '수국 드라이브', body: '6~7월은 수국 철이에요. 남부면 쪽 해안도로가 특히 예뻐요.' },
    { kind: 'enjoy', emoji: '🌅', title: '아침·저녁 산책', body: '해 뜰 무렵과 해 질 무렵의 바닷가 산책이 가장 시원해요.' },
    { kind: 'caution', emoji: '🔥', title: '한낮 땅바닥은 뜨거워요', body: '아스팔트·모래가 발바닥을 데게 할 수 있어요. 손등을 대 보고 5초를 못 버티면 쉬어 가세요.' },
    { kind: 'caution', emoji: '🏖️', title: '해수욕장 출입 확인', body: '여름 개장 기간에는 반려동물 출입을 막는 해수욕장이 많아요. 가기 전에 꼭 확인하세요.' },
  ],
  autumn: [
    { kind: 'enjoy', emoji: '🍂', title: '산책하기 가장 좋은 때', body: '선선하고 맑은 날이 많아요. 긴 해안길이나 남파랑길을 걸어 보세요.' },
    { kind: 'enjoy', emoji: '🌼', title: '가을꽃 구경', body: '10~11월에는 섬꽃축제 등 가을꽃 행사가 열려요. 아래 축제 목록을 확인해 보세요.' },
    { kind: 'caution', emoji: '🌇', title: '해가 빨리 져요', body: '해안 산책로는 해가 지면 금방 어두워져요. 일몰 전에 돌아오도록 계획하세요.' },
  ],
  winter: [
    { kind: 'enjoy', emoji: '🐟', title: '대구 제철', body: '거제 대구가 맛있는 계절이에요. 반려견 동반 식당은 찾기 탭에서 확인해 보세요.' },
    { kind: 'enjoy', emoji: '🌄', title: '겨울 바다 해돋이', body: '동쪽 바다에서 맑은 겨울 해돋이를 볼 수 있어요. 따뜻하게 입고 나가세요.' },
    { kind: 'caution', emoji: '🧥', title: '바닷바람이 차가워요', body: '해안은 체감 온도가 훨씬 낮아요. 소형견·단모종은 옷을 챙기고 산책을 짧게 해 주세요.' },
  ],
};
