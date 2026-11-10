import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);
await mkdir(output, { recursive: true });
for (const path of ['index.html', 'styles.css', 'assets', 'privacy', 'terms', 'community']) {
  await cp(new URL(path, root), new URL(path, output), { recursive: true });
}
console.log(`정적 페이지 생성: ${fileURLToPath(output)}`);
