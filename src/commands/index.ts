import { CommandDefinition, CommandContext } from './base.js';
import { helpCommand } from './definitions/help.js';
import { loginCommand } from './definitions/login.js';
import { modelCommand } from './definitions/model.js';
import { clearCommand } from './definitions/clear.js';
import { reasoningCommand } from './definitions/reasoning.js';
import { agentCommand } from './definitions/agent.js';
import { rulesCommand } from './definitions/rules.js';
import { mcpCommand } from './definitions/mcp.js';
import { tasksCommand } from './definitions/tasks.js';

const availableCommands: CommandDefinition[] = [
  helpCommand,
  loginCommand,
  modelCommand,
  clearCommand,
  reasoningCommand,
  agentCommand,
  rulesCommand,
  mcpCommand,
  tasksCommand,
];

export function getAvailableCommands(): CommandDefinition[] {
  return [...availableCommands];
}

export function getCommandNames(): string[] {
  return getAvailableCommands().map(cmd => cmd.command);
}

export function handleSlashCommand(
  command: string,
  context: CommandContext
) {
  // Extract the command part, everything up to the first space or end of string
  const fullCommand = command.slice(1);
  const spaceIndex = fullCommand.indexOf(' ');
  const cmd = spaceIndex > -1 ? fullCommand.substring(0, spaceIndex).toLowerCase() : fullCommand.toLowerCase();

  const commandDef = getAvailableCommands().find(c => c.command === cmd);

  // Add user message for the command
  context.addMessage({
    role: 'user',
    content: command,
  });

  if (commandDef) {
    commandDef.handler(context);
  }
}

export { CommandDefinition, CommandContext } from './base.js';
