import { CommandDefinition, CommandContext } from '../base.js';

export const agentCommand: CommandDefinition = {
    command: 'agent',
    description: 'Gestiona y activa agentes Nexus (UI). Uso: /agent',
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


