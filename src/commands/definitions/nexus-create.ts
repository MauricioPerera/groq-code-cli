import { CommandDefinition, CommandContext } from '../base.js';
import * as fs from 'fs';
import * as path from 'path';

function ensureDir(p: string) {
  try { fs.mkdirSync(p, { recursive: true }); } catch {}
}

function writeIfNotExists(filePath: string, content: string): { ok: boolean; reason?: string } {
  if (fs.existsSync(filePath)) return { ok: false, reason: 'already_exists' };
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  return { ok: true };
}

export const createAgentCommand: CommandDefinition = {
  command: 'create-agent',
  description: 'Crea un agente Nexus: /create-agent <nombre>',
  handler: ({ addMessage }: CommandContext) => {
    // This command relies on the last user message content; simple parser:
    const last = (addMessage as any).lastUserInput?.() as string | undefined;
    const input = typeof last === 'string' ? last : '';
    const parts = input.trim().split(/\s+/);
    const name = parts[1];
    if (!name) {
      addMessage({ role: 'system', content: 'Uso: /create-agent <nombre>' });
      return;
    }
    const file = path.resolve('.nexus', 'agents', `${name}.mdc`);
    const tmpl = `---\ndescription: Describe el agente ${name}\nmodel: llama-3.1-70b\ntemperature: 0.5\n# tools_include: mcp__*__*\n---\nInstrucciones del agente ${name}.\n`;
    const res = writeIfNotExists(file, tmpl);
    if (res.ok) addMessage({ role: 'assistant', content: `Agente creado: .nexus/agents/${name}.mdc` });
    else addMessage({ role: 'assistant', content: `Ya existe: .nexus/agents/${name}.mdc` });
  }
};

export const deleteAgentCommand: CommandDefinition = {
  command: 'delete-agent',
  description: 'Elimina un agente Nexus: /delete-agent <nombre>',
  handler: ({ addMessage }: CommandContext) => {
    const last = (addMessage as any).lastUserInput?.() as string | undefined;
    const input = typeof last === 'string' ? last : '';
    const parts = input.trim().split(/\s+/);
    const name = parts[1];
    if (!name) {
      addMessage({ role: 'system', content: 'Uso: /delete-agent <nombre>' });
      return;
    }
    const file = path.resolve('.nexus', 'agents', `${name}.mdc`);
    if (!fs.existsSync(file)) {
      addMessage({ role: 'assistant', content: `No existe: .nexus/agents/${name}.mdc` });
      return;
    }
    try { fs.unlinkSync(file); addMessage({ role: 'assistant', content: `Agente eliminado: .nexus/agents/${name}.mdc` }); }
    catch { addMessage({ role: 'assistant', content: 'Error al eliminar' }); }
  }
};

export const createRuleCommand: CommandDefinition = {
  command: 'create-rule',
  description: 'Crea una regla Nexus: /create-rule <nombre> [always|auto]',
  handler: ({ addMessage }: CommandContext) => {
    const last = (addMessage as any).lastUserInput?.() as string | undefined;
    const input = typeof last === 'string' ? last : '';
    const parts = input.trim().split(/\s+/);
    const name = parts[1];
    const kind = parts[2] || 'manual';
    if (!name) {
      addMessage({ role: 'system', content: 'Uso: /create-rule <nombre> [always|auto]' });
      return;
    }
    const file = path.resolve('.nexus', 'rules', `${name}.mdc`);
    const header = kind === 'always' ? 'alwaysApply: true' : kind === 'auto' ? 'globs: [src/**]' : '';
    const tmpl = `---\ndescription: Regla ${name}\n${header}\n---\nInstrucciones de la regla ${name}.\n`;
    const res = writeIfNotExists(file, tmpl);
    if (res.ok) addMessage({ role: 'assistant', content: `Regla creada: .nexus/rules/${name}.mdc` });
    else addMessage({ role: 'assistant', content: `Ya existe: .nexus/rules/${name}.mdc` });
  }
};

export const deleteRuleCommand: CommandDefinition = {
  command: 'delete-rule',
  description: 'Elimina una regla Nexus: /delete-rule <nombre>',
  handler: ({ addMessage }: CommandContext) => {
    const last = (addMessage as any).lastUserInput?.() as string | undefined;
    const input = typeof last === 'string' ? last : '';
    const parts = input.trim().split(/\s+/);
    const name = parts[1];
    if (!name) {
      addMessage({ role: 'system', content: 'Uso: /delete-rule <nombre>' });
      return;
    }
    const file = path.resolve('.nexus', 'rules', `${name}.mdc`);
    if (!fs.existsSync(file)) {
      addMessage({ role: 'assistant', content: `No existe: .nexus/rules/${name}.mdc` });
      return;
    }
    try { fs.unlinkSync(file); addMessage({ role: 'assistant', content: `Regla eliminada: .nexus/rules/${name}.mdc` }); }
    catch { addMessage({ role: 'assistant', content: 'Error al eliminar' }); }
  }
};


