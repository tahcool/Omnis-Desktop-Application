/**
 * mock_openai.js — Shared mock OpenAI chat completions server.
 *
 * Provides deterministic responses based on the system prompt content.
 * Tracks hit count so tests can verify unauthorized requests never reach the provider.
 *
 * Usage:
 *   const mock = require('./mock_openai');
 *   const server = await mock.start(9876);
 *   // ... run tests ...
 *   console.log('Hits:', mock.getHitCount());
 *   mock.resetHitCount();
 *   await mock.stop(server);
 */

const http = require('http');

let hitCount = 0;

function buildMockResponse(body) {
  const messages = body.messages || [];
  const systemPrompt = (messages.find(m => m.role === 'system') || {}).content || '';

  let content;

  if (systemPrompt.includes('quotation data extraction')) {
    content = JSON.stringify({
      customer: 'Test Corp',
      salesperson: 'John Smith',
      item_code: 'CAT D6',
      price: 150000,
      lead_time: '4 Weeks',
    });
  } else if (systemPrompt.includes('professional titles')) {
    content = JSON.stringify({
      title: 'Heavy Equipment Supply Quotation — Test Client',
    });
  } else if (systemPrompt.includes('sales intelligence')) {
    content = JSON.stringify({
      insights: 'Competitive pricing for this market segment. Recommend volume discount.',
      suggestedPrice: 145000,
      competitorInfo: 'Similar models range $140k-$160k in this region.',
      negotiationTips: ['Offer extended warranty', 'Bundle service package'],
    });
  } else if (systemPrompt.includes('sales analytics')) {
    content = JSON.stringify({
      insights: 'Strong Q3 performance. 15% growth over previous quarter.',
      recommendations: ['Increase stock levels for excavators', 'Expand dealer network'],
    });
  } else if (systemPrompt.includes('test assistant')) {
    content = JSON.stringify({ ok: true, message: 'Connection successful' });
  } else {
    content = JSON.stringify({ error: 'Unknown action in mock' });
  }

  return {
    id: `chatcmpl-mock-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: body.model || 'gpt-4o-mini',
    choices: [{
      index: 0,
      message: { role: 'assistant', content },
      finish_reason: 'stop',
    }],
    usage: { prompt_tokens: 50, completion_tokens: 30, total_tokens: 80 },
  };
}

function start(port = 9876) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        hitCount++;

        // Verify the Authorization header contains our mock key
        const auth = req.headers.authorization || '';
        if (!auth.includes('sk-mock-test-key-not-real')) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'Invalid API key', type: 'invalid_request_error' } }));
          return;
        }

        try {
          const parsed = JSON.parse(body);
          const response = buildMockResponse(parsed);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'Invalid request body' } }));
        }
      });
    });
    server.on('error', reject);
    server.listen(port, '0.0.0.0', () => {
      console.log(`  Mock OpenAI server listening on port ${port}`);
      resolve(server);
    });
  });
}

function stop(server) {
  return new Promise((resolve) => {
    if (!server) return resolve();
    server.close(resolve);
  });
}

function getHitCount() { return hitCount; }
function resetHitCount() { hitCount = 0; }

module.exports = { start, stop, getHitCount, resetHitCount, buildMockResponse };
