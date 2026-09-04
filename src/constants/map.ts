/** 거제도 중심 (고현·옥포 일대) */
export const GEOJE_CENTER = {
  lat: 34.8805,
  lng: 128.621,
  zoom: 11,
} as const;

export const NAVER_MAP_CLIENT_ID =
  process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID ?? '6jiib06wvc';

/** public/index.html · map-embed.html 과 동일한 스크립트 URL */
export const NAVER_MAP_SCRIPT_URL = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_MAP_CLIENT_ID}`;
