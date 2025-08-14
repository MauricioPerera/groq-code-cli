import test from 'ava';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadPkg() {
  const text = readFileSync(join(__dirname, '../package.json'), 'utf8');
  return JSON.parse(text);
}

test('bin entry exists', t => {
  const pkg = loadPkg();
  t.truthy(pkg.bin && (pkg.bin.nexus || pkg.bin.groq));
});
