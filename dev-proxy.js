/**
 * 네이버 검색 API CORS 프록시 (개발용)
 * 실행: node dev-proxy.js
 * 포트: 3001
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// .env 파일 읽기
const envPath = path.join(__dirname, '.env');
const env = {};
try {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const idx = line.indexOf('=');
    if (idx > 0) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  });
} catch (_) {}

const CLIENT_ID = env['EXPO_PUBLIC_NAVER_SEARCH_CLIENT_ID'] || '';
const CLIENT_SECRET = env['EXPO_PUBLIC_NAVER_SEARCH_CLIENT_SECRET'] || '';
const PORT = 3001;

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== '/local') { res.writeHead(404); res.end(); return; }

  const params = new URLSearchParams({
    query: url.searchParams.get('query') || '',
    display: url.searchParams.get('display') || '5',
    sort: 'random',
  });

  https.get({
    hostname: 'openapi.naver.com',
    path: '/v1/search/local.json?' + params,
    headers: {
      'X-Naver-Client-Id': CLIENT_ID,
      'X-Naver-Client-Secret': CLIENT_SECRET,
    },
  }, naverRes => {
    res.writeHead(naverRes.statusCode, { 'Content-Type': 'application/json' });
    naverRes.pipe(res);
  }).on('error', e => {
    res.writeHead(500);
    res.end(JSON.stringify({ error: e.message }));
  });
}).listen(PORT, () => console.log(`[proxy] Naver search proxy :${PORT}`));
