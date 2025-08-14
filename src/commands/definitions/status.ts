import { CommandDefinition, CommandContext } from '../base.js';
import { Agent } from '../../core/agent.js';

export const statusCommand: CommandDefinition = {
  command: 'status',
  description: 'Muestra proveedor, base URL y modelo activos',
  handler: (ctx: CommandContext & { agent?: Agent }) => {
    const { addMessage, agent } = ctx as any;
    if (!agent) {
      addMessage({ role: 'system', content: 'Estado no disponible' });
      return;
    }
    const provider = agent.getCurrentProvider?.() || '';
    const baseUrl = agent.getCurrentBaseUrl?.() || '';
    const domain = agent.getCurrentBaseUrlDomain?.() || '';
    const model = agent.getCurrentModel?.() || '';
    addMessage({ role: 'system', content: `Proveedor: ${provider}\nBase URL: ${baseUrl || '(no definida)'}${domain ? `\nDominio: ${domain}` : ''}\nModelo: ${model || '(no definido)'}` });
  }
};


