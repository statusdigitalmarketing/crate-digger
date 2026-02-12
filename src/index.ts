#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { startHttpServer } from './http-server.js';

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Optionally start HTTP server
  if (process.env.CRATE_DIGGER_HTTP === 'true' || process.env.CRATE_DIGGER_PORT) {
    const port = parseInt(process.env.CRATE_DIGGER_PORT || '3890', 10);
    startHttpServer(port);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`Fatal error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
