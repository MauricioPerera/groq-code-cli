import { CommandDefinition, CommandContext } from '../base.js';
import { ConfigManager } from '../../utils/local-settings.js';

export const languageCommand: CommandDefinition = {
  command: 'language',
  description: 'Set UI language: /language es | /language en',
  handler: ({ addMessage }: CommandContext) => {
    const last = (addMessage as any).lastUserInput?.() as string | undefined;
    const input = typeof last === 'string' ? last : '';
    const parts = input.trim().split(/\s+/);
    const lang = (parts[1] || '').toLowerCase();
    if (!['es','en'].includes(lang)) {
      addMessage({ role: 'system', content: 'Uso: /language es | /language en' });
      return;
    }
    const cfg = new ConfigManager();
    cfg.setLanguage(lang as any);
    addMessage({ role: 'system', content: `Idioma establecido a: ${lang}` });
  }
};


