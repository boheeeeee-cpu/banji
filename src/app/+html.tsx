import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

import { NAVER_MAP_CLIENT_ID } from '@/constants/map';

/**
 * Web 루트 HTML. JS 번들은 Expo가 자동으로 주입합니다.
 * 스크립트 순서: 콜백 정의 → bridge → 네이버 SDK
 */
export default function Root({ children }: PropsWithChildren) {
  const naverScriptSrc = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_MAP_CLIENT_ID}&callback=onBanjiNaverMapsReady`;

  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .banji-marker-pin {
                display: flex; align-items: center; justify-content: center;
                width: 32px; height: 32px;
                border-radius: 16px 16px 16px 4px;
                background: #ff6b8a; border: 2px solid #fff;
                box-shadow: 0 2px 8px rgba(0,0,0,0.25);
                color: #fff; font-size: 13px; font-weight: 700;
                transform: rotate(-45deg);
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
              }
              .banji-marker-pin span { transform: rotate(45deg); display: block; }
              .banji-marker-dot {
                width: 18px; height: 18px; border-radius: 50%;
                background: #ff6b8a; border: 2.5px solid #fff;
                box-shadow: 0 2px 6px rgba(0,0,0,0.35);
                opacity: 0.9; cursor: pointer;
                transition: transform 0.15s, opacity 0.15s;
              }
              .banji-marker-dot:hover { opacity: 1; transform: scale(1.4); }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.navermap_authFailure = function () {
                window.__banjiNaverMapAuthFailed = true;
                window.dispatchEvent(new Event('banji-naver-map-auth-failure'));
              };
              function onBanjiNaverMapsReady() {
                window.__banjiNaverMapReady = true;
                window.dispatchEvent(new Event('banji-naver-map-sdk-ready'));
              }
            `,
          }}
        />
        <script type="text/javascript" src="/banji-map-bridge.js?v=2" />
        <script type="text/javascript" src={naverScriptSrc} />
      </head>
      <body>{children}</body>
    </html>
  );
}
