import test from 'ava';
import { getAutoAttachRules } from '../dist/utils/nexus-rules.js';

test('getAutoAttachRules matches files by globs', t => {
	const rules = [
		{ name: 'ui', description: '', alwaysApply: false, globs: ['src/ui/**'], content: 'ui' },
		{ name: 'tools', description: '', alwaysApply: false, globs: ['src/tools/**'], content: 'tools' },
		{ name: 'always', description: '', alwaysApply: true, globs: [], content: 'always' },
	];

	const files = ['src/ui/App.tsx', 'src/core/agent.ts'];
	const autos = getAutoAttachRules(rules, files).map(r => r.name);
	t.deepEqual(autos.sort(), ['ui']);
});
