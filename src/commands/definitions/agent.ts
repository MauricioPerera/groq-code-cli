import { CommandDefinition, CommandContext } from '../base.js';

export const agentCommand: CommandDefinition = {
	command: 'agent',
	description: 'Switch active agent profile (from .nexus/agents/*.mdc). Usage: /agent <name>',
	handler: ({ addMessage }: CommandContext) => {
		addMessage({
			role: 'system',
			content: 'Use @agent:<name> in your next message to set the active agent profile.',
		});
	}
};


