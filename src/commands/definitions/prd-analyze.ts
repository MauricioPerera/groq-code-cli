import { CommandDefinition, CommandContext } from '../base.js';

export const prdAnalyzeCommand: CommandDefinition = {
  command: 'prd-analyze',
  description: 'Analyze a PRD and technology stack for implementation planning: /prd-analyze <file>',
  handler: async ({ addMessage, agent }: CommandContext) => {
    const last = (addMessage as any).lastUserInput?.() as string | undefined;
    const input = typeof last === 'string' ? last : '';
    const parts = input.trim().split(/\s+/);
    const file = parts[1];
    
    if (!file) {
      addMessage({ 
        role: 'system', 
        content: 'Usage: /prd-analyze <file>\n\nAnalyzes a Product Requirements Document (PRD) and technology stack to create an implementation plan.' 
      });
      return;
    }

    // Instruction for the model to analyze the PRD using our rule
    const instruction = [
      `You are a technical analyst specialized in reviewing Product Requirements Documents (PRDs) and technology stacks.`,
      `Your task is to analyze the provided PRD and create an implementation plan based on the "PRD Technical Analyzer" rule.`,
      `The PRD file is: ${file}`,
      `Please perform a complete technical analysis including:`,
      `1. Identification of functional and non-functional requirements`,
      `2. User stories extraction and mapping`,
      `3. Technical constraints and risk identification`,
      `4. Recommended technology stack`,
      `5. Implementation phases with timeline`,
      `6. Required team roles and skills`,
      ``,
      `Use the PRD Technical Analyzer rule that you have access to for guidance on the structure and content of your analysis.`,
      `Provide a comprehensive and actionable analysis that will help the user plan their implementation effectively.`
    ].join('\n');

    // Send the instruction as a user message to trigger model response
    addMessage({ role: 'user', content: instruction });
    if (agent && agent.chat) {
      await agent.chat(instruction);
    }
  }
};