import { CommandDefinition, CommandContext } from '../base.js';
import { getAvailableCommands } from '../index.js';
import { ConfigManager } from '../../utils/local-settings.js';

export const helpCommand: CommandDefinition = {
  command: 'help',
  description: 'Show help and available commands',
  handler: ({ addMessage }: CommandContext) => {
    const commands = getAvailableCommands();
    const lang = new ConfigManager().getLanguage();
    const commandList = commands.map(cmd => `/${cmd.command} - ${cmd.description}`).join('\n');

    const content = lang === 'en'
      ? `Available Commands:\n${commandList}\n\nNavigation:\n- Use arrow keys to navigate chat history\n- Type '/' to see available slash commands\n- Use arrow keys to navigate slash command suggestions\n- Press Enter to execute the selected command\n\nKeyboard Shortcuts:\n- Esc - Clear input box / Interrupt processing / Reject tool approval\n- Shift+Tab - Toggle auto-approval for editing tools\n- Ctrl+C - Exit the application\n\nThis is a highly customizable, lightweight, and open-source coding CLI powered by Groq. Ask for help with coding tasks, debugging issues, or explaining code.`
      : `Comandos disponibles:\n${commandList}\n\nNavegación:\n- Usa las flechas para navegar el historial\n- Escribe '/' para ver los comandos slash\n- Usa flechas para navegar sugerencias de comandos\n- Enter para ejecutar\n\nAtajos de teclado:\n- Esc - Limpiar caja / Interrumpir / Rechazar tool\n- Shift+Tab - Alternar auto-aprobación para edición\n- Ctrl+C - Salir\n\nCLI minimalista y personalizable con Groq. Pide ayuda para codificar, depurar o explicar código.`;

    addMessage({ role: 'system', content });
  }
};
