// POST /api/canva/create-design
// Body: { asset_ids: [string], title: string }
// Returns: { design_id, edit_url }
//
// Creates a Canva design by importing each asset as a page.
// For a multi-page carousel, we create the first design from asset[0],
// then use design imports / pages API for subsequent assets.

import { canvaFetch } from '../../lib/canva.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  try {
    const { asset_ids, title } = req.body || {};
    if (!Array.isArray(asset_ids) || !asset_ids.length) {
      res.status(400).json({ error: 'asset_ids array required' });
      return;
    }

    // Step 1: create design from first asset
    const createR = await canvaFetch(req, res, '/designs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        design_type: { type: 'preset', name: 'instagram_post_square' },
        asset_id: asset_ids[0],
        title: title || 'Next-Flow Carousel'
      })
    });

    if (!createR.ok) {
      const t = await createR.text();
      res.status(createR.status).json({ error: 'Design creation failed', detail: t });
      return;
    }

    const created = await createR.json();
    const design = created.design || created;
    const designId = design.id;
    const editUrl = design.urls?.edit_url || design.edit_url || `https://www.canva.com/design/${designId}/edit`;

    // Step 2: for additional assets, attempt to add pages via design imports
    // NOTE: Canva's current Connect API supports single-asset design creation cleanly.
    // Multi-page imports may require Brand Templates or the Imports API depending on plan.
    // For Round 1, we return the first-page design with extra asset_ids listed so the
    // user can drag them in. Round 2 will refine this with the autofill template flow.
    const extraAssets = asset_ids.slice(1);

    res.status(200).json({
      design_id: designId,
      edit_url: editUrl,
      pages_created: 1,
      remaining_asset_ids: extraAssets,
      note: extraAssets.length
        ? 'First slide opened in Canva. The remaining slide assets are uploaded to your Canva account and accessible from the Uploads panel inside the design — drag them onto new pages.'
        : 'Design ready to edit in Canva.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
