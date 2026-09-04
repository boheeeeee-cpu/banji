const ENDPOINT = 'https://api.odcloud.kr/api/15066349/v1/uddi:d3ad8ba1-4717-4943-ba24-833f5e664d9e';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const params = new URLSearchParams({
    page: '1',
    perPage: '100',
    returnType: 'JSON',
    serviceKey: process.env.VET_PHARMACY_API_KEY ?? '',
  });

  const response = await fetch(`${ENDPOINT}?${params}`);
  const data = await response.json();
  res.status(response.status).json(data);
}
