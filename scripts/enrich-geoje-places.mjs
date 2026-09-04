/**
 * 거제시 추천관광 API → 네이버 좌표 → places.ts 항목 생성
 * 실행: node scripts/enrich-geoje-places.mjs
 */

const GEOJE_API_KEY = 'cd61e62ccaf3f9610545359e66e26409cd62759611233b1c564af75cd3cbce01';
const NAVER_CLIENT_ID = '794WIC9SaQIgQsuUVMQ6';
const NAVER_CLIENT_SECRET = 'HO5zL2da5D';

// 야외 특성상 반려동물 동반 가능성 높은 키워드
const PET_FRIENDLY_KEYWORDS = ['해변', '해수욕장', '공원', '해안', '언덕', '섬', '바람', '공곶', '죽테마', '칠천량', '양지암', '습지', '야생화', '외도', '내도', '해금강', '여차', '덕원', '윤개', '삼밭'];

async function fetchGeojeSpots() {
  const res = await fetch(
    `https://data.geoje.go.kr/rfcapi/rest/geojetour/getGeojetourList?serviceKey=${GEOJE_API_KEY}&pageSize=100&startPage=1`,
    { headers: { 'User-Agent': 'Mozilla/5.0' } }
  );
  const text = await res.text();

  const matches = [...text.matchAll(/<list>([\s\S]*?)<\/list>/g)];
  return matches.map(m => {
    const get = (tag) => m[1].match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`))?.[1]?.trim() ?? '';
    return {
      name: get('geojetourNm'),
      photoUrl: get('geojetourMainImg'),
    };
  }).filter(p => p.name && p.photoUrl); // 사진 있는 것만
}

async function searchNaverCoords(query) {
  await new Promise(r => setTimeout(r, 300)); // 과호출 방지
  const params = new URLSearchParams({ query: `거제 ${query}`, display: '1' });
  const res = await fetch(`https://openapi.naver.com/v1/search/local.json?${params}`, {
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
    },
  });
  const json = await res.json();
  const item = json.items?.[0];
  if (!item) return null;
  return {
    address: item.roadAddress || item.address,
    lat: parseFloat(item.mapy) / 1e7,
    lng: parseFloat(item.mapx) / 1e7,
  };
}

function guessArea(address) {
  if (!address) return '거제';
  const areas = ['고현', '장승포', '옥포', '아주', '일운', '동부', '남부', '거제', '둔덕', '사등', '연초', '하청', '장목', '구조라', '학동', '지세포'];
  return areas.find(a => address.includes(a)) ?? '거제';
}

function isPetFriendly(name) {
  return PET_FRIENDLY_KEYWORDS.some(kw => name.includes(kw));
}

async function main() {
  console.log('1) 거제시 API에서 장소 목록 가져오는 중...');
  const spots = await fetchGeojeSpots();
  console.log(`   → 사진 있는 장소 ${spots.length}곳\n`);

  const results = [];

  for (const spot of spots) {
    process.stdout.write(`2+3) "${spot.name}" 좌표 검색 중... `);
    const coords = await searchNaverCoords(spot.name);
    if (!coords) {
      console.log('❌ 좌표 없음, 스킵');
      continue;
    }
    console.log(`✅ ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);

    const area = guessArea(coords.address);
    const petFriendly = isPetFriendly(spot.name);

    results.push({
      name: spot.name,
      photoUrl: spot.photoUrl,
      address: coords.address,
      lat: coords.lat,
      lng: coords.lng,
      area,
      petFriendly,
    });
  }

  console.log('\n=== 결과 ===');
  console.log(`총 ${results.length}곳 (반려동물 동반 추정: ${results.filter(r => r.petFriendly).length}곳)\n`);

  // places.ts에 추가할 코드 생성
  const petResults = results.filter(r => r.petFriendly);
  console.log('// places.ts에 추가할 항목 (반려동물 동반 가능 추정):');
  for (const p of petResults) {
    const id = `geoje_${p.name.replace(/[^가-힣a-z0-9]/gi, '_')}`;
    console.log(`  {
    id: '${id}',
    name: '${p.name}',
    placeTypes: ['landmark'],
    activities: ['산책', '포토스팟'],
    area: '${p.area}',
    address: '${p.address}',
    lat: ${p.lat},
    lng: ${p.lng},
    rating: 4.3,
    reviewCount: 0,
    petNote: '야외 공간으로 반려동물 동반 가능합니다. 방문 전 확인 권장.',
    imageEmoji: '🏝️',
    imageTint: '#E0F2F1',
    photoUrl: '${p.photoUrl}',
  },`);
  }

  // 전체 결과 JSON 저장
  const fs = await import('fs');
  fs.writeFileSync('./scripts/geoje-spots-result.json', JSON.stringify(results, null, 2), 'utf8');
  console.log('\n전체 결과 → scripts/geoje-spots-result.json 저장됨');
}

main().catch(console.error);
