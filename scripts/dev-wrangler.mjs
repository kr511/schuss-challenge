import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const persistDir = process.env.WRANGLER_PERSIST_TO ||
  join(tmpdir(), 'schuss-challenge-wrangler-state');
const port = process.env.PORT || '8787';

const wranglerArgs = [
  'wrangler',
  'dev',
  '--env',
  'local',
  '--port',
  port,
  '--live-reload=false',
  '--persist-to',
  persistDir,
  ...process.argv.slice(2),
];

const npmCli = process.env.npm_execpath;
const command = npmCli ? process.execPath : (process.platform === 'win32' ? 'npx.cmd' : 'npx');
const args = npmCli ? [npmCli, 'exec', '--', ...wranglerArgs] : wranglerArgs;

const child = spawn(command, args, {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
