// Serverless handler (Vercel / Netlify-compatible). Requires SEARCH_API_KEY in env.
// Set SEARCH_PROVIDER to 'serpapi' (default) or 'bing'.
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { q, newsOnly } = req.body || {};
  if (!q) return res.status(400).json({ error: 'Missing query' });

  const provider = process.env.SEARCH_PROVIDER || 'serpapi';
  const key = process.env.SEARCH_API_KEY;
  if (!key) return res.status(500).json({ error: 'SEARCH_API_KEY not configured' });

  try {
    if (provider === 'serpapi') {
      const params = new URLSearchParams();
      params.set('q', q);
      params.set('engine', 'google');
      if (newsOnly) params.set('tbm', 'nws');
      params.set('api_key', key);
      const url = `https://serpapi.com/search.json?${params.toString()}`;
      const r = await fetch(url);
      const data = await r.json();
      const results = (data.organic_results || []).map(r => ({
        title: r.title,
        link: r.link,
        snippet: r.snippet || (r.rich_snippet && r.rich_snippet.top && r.rich_snippet.top.extensions ? r.rich_snippet.top.extensions.join(' ') : ''),
        source: r.displayed_link || '',
        displayed_at: r.date || ''
      }));
      return res.json({ results });
    } else {
      // Bing Web Search
      const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(q)}${newsOnly ? '&responseFilter=News' : ''}`;
      const r = await fetch(url, { headers: { 'Ocp-Apim-Subscription-Key': key } });
      const j = await r.json();
      const webPages = (j.webPages && j.webPages.value) || [];
      const results = webPages.map(w => ({
        title: w.name,
        link: w.url,
        snippet: w.snippet,
        source: (w.displayUrl || ''),
        displayed_at: w.datePublished || ''
      }));
      return res.json({ results });
    }
  } catch (err) {
    console.error('search error', err);
    return res.status(500).json({ error: 'Search provider error' });
  }
};
