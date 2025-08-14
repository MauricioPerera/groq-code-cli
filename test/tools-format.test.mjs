import test from 'ava';
import { formatToolParams } from '../dist/tools/tools.js';

test('formatToolParams extracts key params', t => {
	const s = formatToolParams('read_file', { file_path: 'src/app.ts', extra: 'ignored' });
	t.true(s.includes('file_path'));
	t.true(s.includes('src/app.ts'));
});
