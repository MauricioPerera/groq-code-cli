import { CommandDefinition, CommandContext } from '../base.js';
import * as fs from 'fs';
import * as path from 'path';

function listMdc(baseDir: string): string[] {
	try {
		if (!fs.existsSync(baseDir)) return [];
		const entries = fs.readdirSync(baseDir);
		return entries
			.filter(f => f.toLowerCase().endsWith('.mdc'))
			.map(f => path.basename(f, path.extname(f)));
	} catch {
		return [];
	}
}

export const rulesCommand: CommandDefinition = {
    command: 'rules',
    description: 'Manage Nexus rules (UI). Use: /rules',
	handler: ({ addMessage, ...ctx }: CommandContext & { setShowRulesManager?: (show: boolean) => void }) => {
		if ((ctx as any).setShowRulesManager) {
			(ctx as any).setShowRulesManager(true);
		} else {
			// fallback textual listing
			const rulesDir = path.resolve('.nexus', 'rules');
			const agentsDir = path.resolve('.nexus', 'agents');
			const rules = listMdc(rulesDir);
			const agents = listMdc(agentsDir);
			const lines: string[] = [];
			lines.push('Nexus Rules:');
			lines.push(rules.length ? rules.map(r => `- ${r}`).join('\n') : '(none)');
			lines.push('');
			lines.push('Agent Profiles:');
			lines.push(agents.length ? agents.map(a => `- ${a}`).join('\n') : '(none)');
			addMessage({ role: 'system', content: lines.join('\n') });
		}
	}
};

