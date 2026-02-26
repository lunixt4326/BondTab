/**
 * Vercel Serverless Function: /api/pin
 * Proxies IPFS pinning requests to Pinata.
 * The PINATA_JWT is kept server-side only.
 */

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return res.status(500).json({ error: 'PINATA_JWT not configured' });
  }

  try {
    const { data, name } = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Missing or invalid "data" field' });
    }

    const pinataBody = {
      pinataContent: data,
      pinataMetadata: {
        name: name || `bondtab-${Date.now()}`,
      },
    };

    const pinataRes = await fetch(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(pinataBody),
      },
    );

    if (!pinataRes.ok) {
      const errText = await pinataRes.text();
      console.error('Pinata error:', errText);
      return res.status(502).json({ error: 'Pinata pinning failed' });
    }

    const result: PinataResponse = await pinataRes.json();

    return res.status(200).json({
      cid: result.IpfsHash,
      size: result.PinSize,
      timestamp: result.Timestamp,
    });
  } catch (err) {
    console.error('Pin handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
