// POST /api/buffer — proxy to Buffer GraphQL for scheduling posts.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  const token = process.env.BUFFER_ACCESS_TOKEN;
  const channelId = process.env.BUFFER_CHANNEL_ID;
  if (!token || !channelId) {
    res.status(500).json({ error: 'BUFFER_ACCESS_TOKEN or BUFFER_CHANNEL_ID not set.' });
    return;
  }
  try {
    const { text, scheduledTime } = req.body || {};
    if (!text || !scheduledTime) {
      res.status(400).json({ error: 'text and scheduledTime required' });
      return;
    }
    const r = await fetch('https://api.buffer.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({
        query: `mutation CreatePost($input: CreatePostInput!) { createPost(input: $input) { ... on PostActionSuccess { post { id dueAt } } ... on MutationError { message } } }`,
        variables: { input: { text, channelId, schedulingType: 'custom', mode: 'customScheduled', dueAt: scheduledTime } }
      })
    });
    const data = await r.json();
    res.status(r.ok ? 200 : 500).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
