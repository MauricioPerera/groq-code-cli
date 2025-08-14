import { CommandDefinition, CommandContext } from '../base.js';

export const agentCommand: CommandDefinition = {
    command: 'agent',
    description: 'Manage and activate Nexus agents (UI). Use: /agent',
    handler: ({ addMessage, setShowAgentManager }: CommandContext) => {
        if (setShowAgentManager) {
            setShowAgentManager(true);
        } else {
            addMessage({
                role: 'system',
                content: 'Use @agent:<name> en tu siguiente mensaje para activar un perfil de agente.',
            });
        }
    }
};


