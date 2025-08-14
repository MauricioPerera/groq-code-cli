export interface CommandContext {
  addMessage: (message: any) => void;
  clearHistory: () => void;
  setShowLogin: (show: boolean) => void;
  setShowModelSelector?: (show: boolean) => void;
  setShowAgentManager?: (show: boolean) => void;
  setShowRulesManager?: (show: boolean) => void;
  setShowTasksManager?: (show: boolean) => void;
  setShowMcpManager?: (show: boolean) => void;
  toggleReasoning?: () => void;
  showReasoning?: boolean;
  setLanguage?: (lang: 'es' | 'en') => void;
}

export interface CommandDefinition {
  command: string;
  description: string;
  descriptionKey?: string;
  handler: (context: CommandContext) => void;
}

export abstract class BaseCommand implements CommandDefinition {
  abstract command: string;
  abstract description: string;
  abstract handler(context: CommandContext): void;
}
