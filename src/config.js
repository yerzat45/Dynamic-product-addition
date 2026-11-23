import fs from 'node:fs';

export function loadEnv(file = '.env') {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z_0-9]*)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

export function configFromEnv() {
  const url = process.env.BITRIX_WEBHOOK_URL || '';
  const token = process.env.SYNC_TOKEN || '';
  if (!/^https:\/\/.+\/rest\/\d+\/[^/]+\/?$/.test(url)) throw new Error('BITRIX_WEBHOOK_URL: необходим полный HTTPS webhook URL');
  if (token.length < 16 || token.includes('REPLACE_')) throw new Error('SYNC_TOKEN: установите секрет длиной не менее 16 символов');
  const mode = process.env.SYNC_MODE || 'append';
  if (!['append', 'strict'].includes(mode)) throw new Error('SYNC_MODE должен быть append или strict');
  return {url: url.replace(/\/?$/, '/'), token, mode, dryRun: process.env.DRY_RUN !== 'false', recheck: process.env.RECHECK_DEAL !== 'false', port: Number(process.env.PORT || 3080), host: process.env.HOST || '127.0.0.1'};
}
