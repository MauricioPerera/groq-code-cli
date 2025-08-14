import * as fs from 'fs';
import * as path from 'path';
import { getNexusRulesDir, getCursorRulesFallbackDir, resolveFirstExistingDir } from './nexus-paths.js';

export interface NexusRule {
	name: string; // filename without extension
	description?: string;
	alwaysApply?: boolean;
	globs?: string[];
	content: string; // body content after frontmatter
}

interface ParsedMdc {
	description?: string;
	alwaysApply?: boolean;
	globs?: string[];
	body: string;
}

function parseMdc(fileContent: string): ParsedMdc {
	// Very small frontmatter parser: expects YAML-like between --- ... --- at top
	// Supports keys: description (string), alwaysApply (bool), globs (array)
	let description: string | undefined;
	let alwaysApply: boolean | undefined;
	let globs: string[] | undefined;
	let body = fileContent;

	if (fileContent.startsWith('---')) {
		const end = fileContent.indexOf('\n---', 3);
		if (end !== -1) {
			const headerRaw = fileContent.slice(3, end).trim();
			body = fileContent.slice(end + 4).replace(/^\s*\n/, '');
			for (const line of headerRaw.split(/\r?\n/)) {
				const m = line.match(/^([a-zA-Z]+):\s*(.*)$/);
				if (!m) continue;
				const key = m[1].trim();
				const val = m[2].trim();
				if (key === 'description') description = val;
				else if (key === 'alwaysApply') alwaysApply = /true/i.test(val);
				else if (key === 'globs') {
					// naive array parsing: [a, b] or comma-separated
					const arr = val
						.replace(/^\[|\]$/g, '')
						.split(',')
						.map(s => s.trim())
						.filter(Boolean);
					if (arr.length) globs = arr;
				}
			}
		}
	}

	return { description, alwaysApply, globs, body };
}

export function loadProjectRules(): NexusRule[] {
	const rulesDir = resolveFirstExistingDir([
		getNexusRulesDir(),
		getCursorRulesFallbackDir(),
	]);
	if (!rulesDir) return [];

	let files: string[] = [];
	try {
		files = fs.readdirSync(rulesDir)
			.filter(f => f.toLowerCase().endsWith('.mdc'))
			.map(f => path.join(rulesDir, f));
	} catch {
		return [];
	}

	const rules: NexusRule[] = [];
	for (const file of files) {
		try {
			const content = fs.readFileSync(file, 'utf-8');
			const parsed = parseMdc(content);
			rules.push({
				name: path.basename(file, path.extname(file)),
				description: parsed.description,
				alwaysApply: parsed.alwaysApply,
				globs: parsed.globs,
				content: parsed.body,
			});
		} catch {
			continue;
		}
	}
	return rules;
}

export function findManualRulesByRefs(rules: NexusRule[], userInput: string): { active: NexusRule[]; cleaned: string } {
	const atRefs = Array.from(userInput.matchAll(/@([\w.-]+)/g)).map(m => m[1]);
	if (atRefs.length === 0) return { active: [], cleaned: userInput };
	const active = rules.filter(r => atRefs.includes(r.name) || atRefs.includes(r.name + '.mdc'));
	let cleaned = userInput;
	for (const ref of atRefs) {
		cleaned = cleaned.replace(new RegExp('(?:^|\n)@' + ref + '(?=\s|$)'), '').trim();
	}
	return { active, cleaned };
}

// --- Auto-Attach helpers ---

function globToRegex(glob: string): RegExp {
	// Very small glob -> regex: supports ** and *
	let pattern = glob
		.replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex special
		.replace(/\*\*/g, '§DOUBLESTAR§')
		.replace(/\*/g, '[^/]*')
		.replace(/§DOUBLESTAR§/g, '.*');
	return new RegExp('^' + pattern + '$', 'i');
}

export function getAutoAttachRules(rules: NexusRule[], filePaths: string[]): NexusRule[] {
	if (!filePaths || filePaths.length === 0) return [];
	const autos: NexusRule[] = [];
	for (const rule of rules) {
		if (rule.alwaysApply) continue;
		if (!rule.globs || rule.globs.length === 0) continue;
		const regexes = rule.globs.map(globToRegex);
		const matched = filePaths.some(p => {
			const norm = p.replace(/\\/g, '/');
			return regexes.some(rx => rx.test(norm));
		});
		if (matched) autos.push(rule);
	}
	return autos;
}


