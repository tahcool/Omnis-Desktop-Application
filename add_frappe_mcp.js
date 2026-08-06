const fs = require('fs');
let content = fs.readFileSync('.mcp/server.js', 'utf8');

const credBlock = `
// --- Frappe API Credentials ---
const FRAPPE_URL = 'https://fleetrack.machinery-exchange.com';
const FRAPPE_API_KEY = '07660480c74686c';
const FRAPPE_API_SECRET = '82899cba0bfdc36';
`;
content = content.replace('const SUPABASE_URL', credBlock + 'const SUPABASE_URL');

const toolBlock = `
// --- TOOL: query_frappe ---
server.tool(
  'query_frappe',
  'Execute a GET request against the Frappe API using the saved credentials.',
  { endpoint: z.string().describe('The Frappe API endpoint (e.g., "/api/resource/FT Breakdown Log")') },
  async ({ endpoint }) => {
    try {
      const url = \`\${FRAPPE_URL}\${endpoint.startsWith('/') ? endpoint : '/' + endpoint}\`;
      const res = await fetch(url, {
        headers: { 'Authorization': \`token \${FRAPPE_API_KEY}:\${FRAPPE_API_SECRET}\`, 'Accept': 'application/json' }
      });
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2).substring(0, 5000) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: \`Frappe API error: \${e.message}\` }] };
    }
  }
);

`;
content = content.replace('const transport = new StdioServerTransport();', toolBlock + 'const transport = new StdioServerTransport();');

fs.writeFileSync('.mcp/server.js', content);
console.log('MCP updated');
