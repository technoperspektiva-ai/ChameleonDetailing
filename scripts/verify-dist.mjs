import { existsSync, readFileSync } from 'node:fs';
const required = ['dist/index.html'];
for (const file of required) {
  if (!existsSync(file)) {
    console.error(`[verify-dist] Missing ${file}. Vite frontend was not built.`);
    process.exit(1);
  }
}
const html = readFileSync('dist/index.html', 'utf8');
if (!html.includes('id="root"')) {
  console.error('[verify-dist] dist/index.html does not look like the Chameleon React app.');
  process.exit(1);
}
console.log('[verify-dist] Chameleon frontend build output is present.');
