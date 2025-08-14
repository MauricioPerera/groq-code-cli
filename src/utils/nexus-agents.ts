import * as fs from 'fs';
import * as path from 'path';
import { getNexusRoot } from './nexus-paths.js';

export interface NexusAgentProfile {
	name: string; // filename without extension
	description?: string;
	model?: string;
	temperature?: number;
	system: string; // body content after frontmatter
	toolsInclude?: string[];
	toolsExclude?: string[];
}

interface ParsedMdc {
	description?: string;
	model?: string;
	temperature?: number;
	body: string;
	toolsInclude?: string[];
	toolsExclude?: string[];
}

function parseMdc(fileContent: string): ParsedMdc {
	let description: string | undefined;
	let model: string | undefined;
	let temperature: number | undefined;
	let body = fileContent;
	let toolsInclude: string[] | undefined;
	let toolsExclude: string[] | undefined;

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
				else if (key === 'model') model = val;
				else if (key === 'temperature') {
					const num = Number(val);
					if (!Number.isNaN(num)) temperature = num;
				}
				else if (key === 'tools_include') {
					const items = val.split(',').map(s => s.trim()).filter(Boolean);
					if (items.length) toolsInclude = items;
				}
				else if (key === 'tools_exclude') {
					const items = val.split(',').map(s => s.trim()).filter(Boolean);
					if (items.length) toolsExclude = items;
				}
			}
		}
	}

	return { description, model, temperature, body, toolsInclude, toolsExclude };
}

export function loadAgentProfiles(): NexusAgentProfile[] {
	const agentsDir = path.join(getNexusRoot(), 'agents');
	let files: string[] = [];
	try {
		files = fs.readdirSync(agentsDir)
			.filter(f => f.toLowerCase().endsWith('.mdc'))
			.map(f => path.join(agentsDir, f));
	} catch {
		return [];
	}

	const profiles: NexusAgentProfile[] = [];
	for (const file of files) {
		try {
			const content = fs.readFileSync(file, 'utf-8');
			const parsed = parseMdc(content);
			profiles.push({
				name: path.basename(file, path.extname(file)),
				description: parsed.description,
				model: parsed.model,
				temperature: parsed.temperature,
				system: parsed.body,
				toolsInclude: parsed.toolsInclude,
				toolsExclude: parsed.toolsExclude,
			});
		} catch {
			continue;
		}
	}
	return profiles;
}

export function getAgentProfile(name: string): NexusAgentProfile | null {
	const all = loadAgentProfiles();
	return all.find(p => p.name === name || p.name + '.mdc' === name) || null;
}


