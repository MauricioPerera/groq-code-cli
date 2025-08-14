import { CommandDefinition } from '../base.js';
import { McpManager } from '../../utils/mcp.js';

export const mcpCommand: CommandDefinition = {
  command: 'mcp',
  description: 'Manage MCP servers (UI). Use: /mcp',
  handler: async (context: any) => {
    if (context.setShowMcpManager) {
      context.setShowMcpManager(true);
      return;
    }
    // El texto completo del comando llega como mensaje de usuario previo, recuperable vía addMessage side effects.
    // Aquí no tenemos acceso directo, así que inferimos desde la última inserción no es posible; aceptamos subcomando por defecto.
    // Ofrecemos UX simple: por defecto lista, y si el usuario quiere conectar, que use "/mcp connect <name>".
    const sub = 'list';

    if (sub === 'list') {
      const names = McpManager.instance().listConfigured();
      context.addMessage({ role: 'assistant', content: names.length ? `Servidores MCP configurados: ${names.join(', ')}` : 'No hay servidores MCP configurados' });
      return;
    }

    if (sub === 'tools') {
      try {
        await McpManager.instance().ensureConnectedAll();
        const tools = McpManager.instance().getDiscoveredTools();
        if (!tools.length) {
          context.addMessage({ role: 'assistant', content: 'No se encontraron tools MCP. Asegúrate de que los servidores estén corriendo.' });
          return;
        }
        const lines = tools.map(t => `- mcp__${t.server}__${t.name}${t.description ? `: ${t.description}` : ''}`);
        context.addMessage({ role: 'assistant', content: `Tools MCP disponibles:\n${lines.join('\n')}` });
      } catch (e: any) {
        context.addMessage({ role: 'assistant', content: `Error listando tools MCP: ${e?.message || 'desconocido'}` });
      }
      return;
    }

    // Default: list
    const names = McpManager.instance().listConfigured();
    context.addMessage({ role: 'assistant', content: names.length ? `Servidores MCP configurados: ${names.join(', ')}` : 'No hay servidores MCP configurados' });
  }
};


