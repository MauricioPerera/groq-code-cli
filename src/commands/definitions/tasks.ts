import { CommandDefinition, CommandContext } from '../base.js';

export const tasksCommand: CommandDefinition = {
  command: 'tasks',
  description: 'Manage tasks (UI). Use: /tasks',
  handler: ({ addMessage, ...ctx }: CommandContext & { setShowTasksManager?: (show: boolean) => void }) => {
    if ((ctx as any).setShowTasksManager) {
      (ctx as any).setShowTasksManager(true);
    } else {
      addMessage({ role: 'system', content: 'Usa las tools create_tasks/update_tasks/save_tasks/load_tasks para gestionar tareas.' });
    }
  }
};


