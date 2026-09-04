export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { query, display = '5', sort = 'random' } = req.query;
  if (!query) return res.status(400).json({ error: 'query required' });

  const params = new URLSearchParams({ query, display, sort });
  const url = `https://openapi.naver.com/v1/search/local.json?${params}`;

  const response = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': process.env.NAVER_SEARCH_CLIENT_ID ?? '',
      'X-Naver-Client-Secret': process.env.NAVER_SEARCH_CLIENT_SECRET ?? '',
    },
  });

  const data = await response.json();
  res.status(response.status).json(data);
}
