// POST /api/canva/upload-asset
// Body: { name: string, image_base64: string, media_type: string }
// Returns: { asset_id: string }
//
// Canva Connect API asset upload uses a metadata header + binary body.

import { canvaFetch } from '../../lib/canva.js';

export const config = { api: { bodyParser: { sizeLimit: '12mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  try {
    const { name, image_base64, media_type } = req.body || {};
    if (!image_base64) {
      res.status(400).json({ error: 'image_base64 required' });
      return;
    }
    const safeName = (name || 'nextflow-slide.png').slice(0, 60);

    // Canva asset-uploads: POST binary, with name in a JSON header
    const buf = Buffer.from(image_base64, 'base64');
    const r = await canvaFetch(req, res, '/asset-uploads', {
      method: 'POST',
      headers: {
        'Content-Type': media_type || 'image/png',
        'Asset-Upload-Metadata': JSON.stringify({ name_base64: Buffer.from(safeName).toString('base64') })
      },
      body: buf
    });

    if (!r.ok) {
      const t = await r.text();
      res.status(r.status).json({ error: 'Canva upload failed', detail: t });
      return;
    }

    const job = await r.json();
    // Asset upload is async — Canva returns a job we need to poll
    const jobId = job.job?.id || job.id;
    if (!jobId) {
      res.status(500).json({ error: 'No job id returned', detail: job });
      return;
    }

    // Poll for completion (max ~25s)
    let asset = null;
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const pollR = await canvaFetch(req, res, '/asset-uploads/' + jobId, { method: 'GET' });
      if (!pollR.ok) continue;
      const pollData = await pollR.json();
      const status = pollData.job?.status || pollData.status;
      if (status === 'success') {
        asset = pollData.asset || pollData.job?.asset;
        break;
      }
      if (status === 'failed') {
        res.status(500).json({ error: 'Asset upload job failed', detail: pollData });
        return;
      }
    }

    if (!asset) {
      res.status(504).json({ error: 'Asset upload timed out' });
      return;
    }

    res.status(200).json({ asset_id: asset.id, asset });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
