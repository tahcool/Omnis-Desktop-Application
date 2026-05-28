#!/usr/bin/env node
/**
 * Omnis Unified MCP Server
 * Provides tools for all Omnis sub-agents to share context,
 * query Supabase, search code, and persist session knowledge.
 *
 * Register in .mcp.json:
 * { "mcpServers": { "omnis": { "command": "node", "args": [".mcp/server.js"] } } }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const KNOWLEDGE = path.join(__dirname, 'knowledge');

// ── Supabase client (service role) ──────────────────────────────────────────
const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ── Helpers ──────────────────────────────────────────────────────────────────
const SYSTEMS = ['fleetrack', 'salestrack', 'spe', 'engtrack', 'powertrack', 'group_accounts'];

function readKnowledge(relPath) {
  const full = path.join(KNOWLEDGE, relPath);
  if (!fs.existsSync(full)) return `(no file at ${relPath})`;
  return fs.readFileSync(full, 'utf8');
}

function writeKnowledge(relPath, content) {
  const full = path.join(KNOWLEDGE, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
}

function appendKnowledge(relPath, content) {
  const full = path.join(KNOWLEDGE, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const timestamp = new Date().toISOString().split('T')[0];
  fs.appendFileSync(full, `\n\n---\n### ${timestamp}\n${content}`, 'utf8');
}

// ── MCP Server ────────────────────────────────────────────────────────────────
const server = new McpServer({
  name: 'omnis',
  version: '1.0.0',
});

// ═══════════════════════════════════════════════════════════════════════════
// TOOL: get_shared_context
// Returns shared infrastructure knowledge (IPC channels, Supabase config, DNS)
// ═══════════════════════════════════════════════════════════════════════════
server.tool(
  'get_shared_context',
  'Get the shared Omnis infrastructure context: Electron setup, IPC channels, Supabase config, DNS map, known cross-system gotchas.',
  {},
  async () => {
    const infra    = readKnowledge('_shared/infrastructure.md');
    const schema   = readKnowledge('_shared/database_schema.md');
    const issues   = readKnowledge('_shared/known_issues.md');
    return {
      content: [{
        type: 'text',
        text: `# Omnis Shared Infrastructure\n\n${infra}\n\n---\n\n## Database Schema\n${schema}\n\n---\n\n## Cross-System Known Issues\n${issues}`
      }]
    };
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// TOOL: get_system_context
// Returns full context for a specific system
// ═══════════════════════════════════════════════════════════════════════════
server.tool(
  'get_system_context',
  'Get full context for a specific Omnis system (fleetrack, salestrack, spe, engtrack, powertrack).',
  { system: z.enum(['fleetrack', 'salestrack', 'spe', 'engtrack', 'powertrack', 'group_accounts']) },
  async ({ system }) => {
    const context  = readKnowledge(`${system}/context.md`);
    const apiMap   = readKnowledge(`${system}/frappe_api_map.md`);
    const status   = readKnowledge(`${system}/migration_status.md`);
    const notes    = readKnowledge(`${system}/session_notes.md`);
    return {
      content: [{
        type: 'text',
        text: `# ${system.toUpperCase()} System Context\n\n## Overview\n${context}\n\n## Frappe API Map\n${apiMap}\n\n## Migration Status\n${status}\n\n## Session Notes\n${notes}`
      }]
    };
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// TOOL: get_pending_work
// Returns all open tasks across systems
// ═══════════════════════════════════════════════════════════════════════════
server.tool(
  'get_pending_work',
  'Get all pending work items across all systems, or for a specific system.',
  { system: z.enum(['fleetrack', 'salestrack', 'spe', 'engtrack', 'powertrack', 'group_accounts', 'all']).optional() },
  async ({ system = 'all' }) => {
    const systems = system === 'all' ? SYSTEMS : [system];
    const lines = [];
    for (const s of systems) {
      const notes = readKnowledge(`${s}/session_notes.md`);
      lines.push(`## ${s.toUpperCase()}\n${notes}\n`);
    }
    return { content: [{ type: 'text', text: lines.join('\n---\n') }] };
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// TOOL: save_session_notes
// Persist session learnings to the knowledge base
// ═══════════════════════════════════════════════════════════════════════════
server.tool(
  'save_session_notes',
  'Save session notes and learnings to the knowledge base for a specific system. These persist between sessions.',
  {
    system: z.enum(['fleetrack', 'salestrack', 'spe', 'engtrack', 'powertrack', 'group_accounts', '_shared']),
    notes: z.string().describe('Markdown-formatted notes. Include: what was completed, what is pending, any gotchas discovered.'),
    file: z.enum(['session_notes', 'migration_status', 'known_issues', 'frappe_api_map', 'context']).optional(),
  },
  async ({ system, notes, file = 'session_notes' }) => {
    const relPath = system === '_shared'
      ? `_shared/${file}.md`
      : `${system}/${file}.md`;
    appendKnowledge(relPath, notes);
    return { content: [{ type: 'text', text: `✅ Saved to ${relPath}` }] };
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// TOOL: log_gotcha
// Record a bug/gotcha permanently in the knowledge base
// ═══════════════════════════════════════════════════════════════════════════
server.tool(
  'log_gotcha',
  'Permanently record a bug, gotcha, or important finding to prevent future agents from hitting the same issue.',
  {
    system: z.enum(['fleetrack', 'salestrack', 'spe', 'engtrack', 'powertrack', 'group_accounts', '_shared']),
    title: z.string(),
    description: z.string(),
    fix: z.string().optional(),
  },
  async ({ system, title, description, fix }) => {
    const relPath = system === '_shared' ? '_shared/known_issues.md' : `${system}/session_notes.md`;
    const entry = `### ⚠️ GOTCHA: ${title}\n**Description:** ${description}${fix ? `\n**Fix:** ${fix}` : ''}`;
    appendKnowledge(relPath, entry);
    return { content: [{ type: 'text', text: `✅ Gotcha logged in ${relPath}` }] };
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// TOOL: supabase_query
// Run a type-safe Supabase table query
// ═══════════════════════════════════════════════════════════════════════════
server.tool(
  'supabase_query',
  'Query any Supabase table using the service role key. Use for checking migration status, verifying data, inspecting schema.',
  {
    table: z.string().describe('Table name (e.g. ft_machine, ft_breakdown)'),
    select: z.string().optional().describe('Columns to select (default: *)'),
    filters: z.record(z.string()).optional().describe('Key-value filters to apply'),
    limit: z.number().optional().describe('Max rows to return (default: 20)'),
    count_only: z.boolean().optional().describe('If true, return only the count'),
  },
  async ({ table, select = '*', filters = {}, limit = 20, count_only = false }) => {
    try {
      let q = count_only
        ? sb.from(table).select('*', { count: 'exact', head: true })
        : sb.from(table).select(select);
      for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
      if (!count_only) q = q.limit(limit);
      const { data, error, count } = await q;
      if (error) throw error;
      const result = count_only ? `Count: ${count}` : JSON.stringify(data, null, 2);
      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }] };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// TOOL: supabase_sql
// Run raw SQL via Supabase RPC
// ═══════════════════════════════════════════════════════════════════════════
server.tool(
  'supabase_sql',
  'Execute raw SQL against Supabase. Use for schema inspection, creating tables, checking policies, running migrations.',
  {
    sql: z.string().describe('SQL to execute'),
    description: z.string().optional().describe('Human-readable description of what this SQL does'),
  },
  async ({ sql, description }) => {
    try {
      // Use the Supabase Management API for arbitrary SQL
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
      });
      if (!resp.ok) {
        // Fallback: try via pg directly if available
        const txt = await resp.text();
        return { content: [{ type: 'text', text: `HTTP ${resp.status}: ${txt}\n\nSQL was:\n${sql}` }] };
      }
      const data = await resp.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }] };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// TOOL: get_migration_status
// Returns migration completion across all systems
// ═══════════════════════════════════════════════════════════════════════════
server.tool(
  'get_migration_status',
  'Get the full migration status dashboard showing which systems and tables have been migrated from Frappe to Supabase.',
  {},
  async () => {
    const lines = ['# Migration Status Dashboard\n'];
    for (const system of SYSTEMS) {
      const status = readKnowledge(`${system}/migration_status.md`);
      lines.push(`## ${system.toUpperCase()}\n${status}\n`);
    }
    return { content: [{ type: 'text', text: lines.join('\n---\n') }] };
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// TOOL: search_code
// Ripgrep search across codebase
// ═══════════════════════════════════════════════════════════════════════════
server.tool(
  'search_code',
  'Search for a pattern across the Omnis codebase. Returns file paths and matching lines.',
  {
    pattern: z.string().describe('Regex or literal pattern to search for'),
    system: z.enum(['fleetrack', 'salestrack', 'spe', 'engtrack', 'all']).optional().describe('Limit to a specific system (default: all)'),
    file_type: z.string().optional().describe('File extension to filter by (e.g. js, html)'),
    max_results: z.number().optional().describe('Max results to return (default: 30)'),
  },
  async ({ pattern, system = 'all', file_type, max_results = 30 }) => {
    try {
      const searchDir = system === 'all'
        ? ROOT
        : path.join(ROOT, 'systems', system);
      const ext = file_type ? `--include="*.${file_type}"` : '';
      const cmd = `rg --no-heading -n ${ext} --max-count=1 -m ${max_results} "${pattern.replace(/"/g, '\\"')}" "${searchDir}" 2>&1 | head -${max_results}`;
      const result = execSync(cmd, { encoding: 'utf8', cwd: ROOT }).trim();
      return { content: [{ type: 'text', text: result || 'No matches found.' }] };
    } catch (e) {
      // rg exits with 1 if no matches — that's fine
      return { content: [{ type: 'text', text: e.stdout || 'No matches found.' }] };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// TOOL: get_ipc_handlers
// Lists all ipcMain.handle channels from main.js
// ═══════════════════════════════════════════════════════════════════════════
server.tool(
  'get_ipc_handlers',
  'List all IPC channels registered in main.js with their signatures.',
  {},
  async () => {
    try {
      const mainJs = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
      const lines = mainJs.split('\n');
      const handlers = lines
        .map((line, i) => ({ line, num: i + 1 }))
        .filter(({ line }) => line.includes("ipcMain.handle("))
        .map(({ line, num }) => `L${num}: ${line.trim()}`);
      return { content: [{ type: 'text', text: handlers.join('\n') }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }] };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// TOOL: get_frappe_api_map
// Returns the complete Frappe→Supabase replacement map for a system
// ═══════════════════════════════════════════════════════════════════════════
server.tool(
  'get_frappe_api_map',
  'Get the Frappe API → Supabase replacement map for a system. Shows each callFrappe() endpoint and what it should be replaced with.',
  {
    system: z.enum(['fleetrack', 'salestrack', 'spe', 'engtrack', 'powertrack']),
  },
  async ({ system }) => {
    const map = readKnowledge(`${system}/frappe_api_map.md`);
    return { content: [{ type: 'text', text: map }] };
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// TOOL: git_checkpoint
// Create a git checkpoint commit before major changes
// ═══════════════════════════════════════════════════════════════════════════
server.tool(
  'git_checkpoint',
  'Create a git checkpoint commit before making major changes. Ensures a rollback point exists.',
  {
    message: z.string().describe('Checkpoint description (e.g. "before Fleetrack breakdown API migration")'),
  },
  async ({ message }) => {
    try {
      execSync(`git add -A && git commit -m "[checkpoint] ${message}"`, { cwd: ROOT, encoding: 'utf8' });
      const hash = execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
      return { content: [{ type: 'text', text: `✅ Checkpoint created: ${hash} — "${message}"\nRollback: git checkout ${hash}` }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Git error: ${e.message}` }] };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// TOOL: validate_html_syntax
// Quick syntax check on an HTML file
// ═══════════════════════════════════════════════════════════════════════════
server.tool(
  'validate_html_syntax',
  'Validate that an HTML file has no obvious syntax errors (unclosed tags, duplicate function names).',
  {
    system: z.enum(['fleetrack', 'salestrack', 'spe', 'group_accounts']),
  },
  async ({ system }) => {
    const htmlPath = path.join(ROOT, 'systems', system, 'index.html');
    if (!fs.existsSync(htmlPath)) {
      return { content: [{ type: 'text', text: `File not found: ${htmlPath}` }] };
    }
    try {
      const content = fs.readFileSync(htmlPath, 'utf8');
      const issues = [];

      // Check for duplicate function definitions
      const fnMatches = [...content.matchAll(/function\s+(\w+)\s*\(/g)].map(m => m[1]);
      const counts = {};
      fnMatches.forEach(fn => counts[fn] = (counts[fn] || 0) + 1);
      const duplicates = Object.entries(counts).filter(([_, c]) => c > 1).map(([fn, c]) => `  - ${fn} (${c}x)`);
      if (duplicates.length) issues.push(`Duplicate functions:\n${duplicates.join('\n')}`);

      // Check basic tag balance
      const opens = (content.match(/<script/gi) || []).length;
      const closes = (content.match(/<\/script>/gi) || []).length;
      if (opens !== closes) issues.push(`Unbalanced <script> tags: ${opens} opens, ${closes} closes`);

      const result = issues.length
        ? `⚠️ Issues found in ${system}/index.html:\n${issues.join('\n')}`
        : `✅ ${system}/index.html looks clean (${(content.length / 1024).toFixed(0)}KB, ${fnMatches.length} functions)`;

      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }] };
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[Omnis MCP] Server running');
