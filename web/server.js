/**
 * Production server for Railway.
 * Serves the Vite-built SPA from dist/ and exposes /api/pin for IPFS pinning.
 */
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import compression from 'compression';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ── Middleware ──
app.use(compression());
app.use(express.json({ limit: '5mb' }));

// ── API: /api/pin (IPFS pinning via Pinata) ──
app.post('/api/pin', async (req, res) => {
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
      pinataMetadata: { name: name || `bondtab-${Date.now()}` },
    };

    const pinataRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(pinataBody),
    });

    if (!pinataRes.ok) {
      const errText = await pinataRes.text();
      console.error('Pinata error:', errText);
      return res.status(502).json({ error: 'Pinata pinning failed' });
    }

    const result = await pinataRes.json();
    return res.status(200).json({
      cid: result.IpfsHash,
      size: result.PinSize,
      timestamp: result.Timestamp,
    });
  } catch (err) {
    console.error('Pin handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Static files from Vite build ──
const distPath = join(__dirname, 'dist');
app.use(express.static(distPath, { maxAge: '1y', immutable: true }));

// ── SPA fallback: all non-API routes serve index.html ──
app.get('*', (_req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

// ── Start ──
app.listen(PORT, '0.0.0.0', () => {
  console.log(`BondTab server listening on port ${PORT}`);
});
