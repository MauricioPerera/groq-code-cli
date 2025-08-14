import { CommandDefinition, CommandContext } from '../base.js';

// Instruye al modelo a sintetizar contenido de regla y escribirla con nexus_write_rule
export const ruleAiCommand: CommandDefinition = {
  command: 'rule-ai',
  description: 'Generate a Nexus rule from natural language: /rule-ai <name> <spec...>',
  handler: async ({ addMessage, agent }: CommandContext) => {
    const last = (addMessage as any).lastUserInput?.() as string | undefined;
    const input = typeof last === 'string' ? last : '';
    const parts = input.trim().split(/\s+/);
    const name = parts[1];
    const spec = parts.slice(2).join(' ').trim();
    if (!name || !spec) {
      addMessage({ role: 'system', content: 'Usage: /rule-ai <name> <spec ...>' });
      return;
    }

    // Pedimos al modelo redactar y ejecutar la tool. Inyectamos una orden directa.
    const instruction = [
      `You are an assistant that creates Nexus rules (.mdc with frontmatter).`,
      `Target file name: ${name}`,
      `User spec: ${spec}`,
      `Do:`,
      `1) Generate a well-structured rule body (Markdown/plain text).`,
      `2) If the spec references file globs (e.g., docs/**/*.md) or agent scopes (e.g., agents: reviewer, build-*), include them as strings: globs (CSV) and agents (CSV).`,
      `3) Then call the tool nexus_write_rule with JSON args: { name: "${name}", content: <generated_body>, globs?: <csv>, agents?: <csv>, alwaysApply?: <boolean> }`,
      `   - Preserve unspecified fields if file exists.`,
      `   - If spec implies it, you may also include alwaysApply.`,
      `Answer by calling the tool; avoid dumping the whole file content in assistant text.`,
    ].join('\n');

    // Enviamos la instrucción como mensaje de usuario para forzar un turno del modelo
    addMessage({ role: 'user', content: instruction });
    if (agent && agent.chat) {
      await agent.chat(instruction);
    }
  }
};


