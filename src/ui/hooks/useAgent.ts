import { useState, useCallback, useRef } from 'react';
import { Agent } from '../../core/agent.js';
import { DANGEROUS_TOOLS, APPROVAL_REQUIRED_TOOLS } from '../../tools/tool-schemas.js';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool' | 'tool_execution';
  content: string;
  reasoning?: string;
  timestamp: Date;
  toolExecution?: ToolExecution;
}

export interface ToolExecution {
  id: string;
  name: string;
  args: Record<string, any>;
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'canceled';
  result?: any;
  needsApproval?: boolean;
}

export function useAgent(
  agent: Agent,
  onStartRequest?: () => void,
  onAddApiTokens?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void,
  onPauseRequest?: () => void,
  onResumeRequest?: () => void,
  onCompleteRequest?: () => void
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userMessageHistory, setUserMessageHistory] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentToolExecution, setCurrentToolExecution] = useState<ToolExecution | null>(null);
  const [sessionAutoApprove, setSessionAutoApprove] = useState(false);
  const [showReasoning, setShowReasoning] = useState(true);
  const currentExecutionIdRef = useRef<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<{
    toolName: string;
    toolArgs: Record<string, any>;
    resolve: (approvalResult: { approved: boolean; autoApproveSession?: boolean }) => void;
  } | null>(null);
  const [pendingMaxIterations, setPendingMaxIterations] = useState<{
    maxIterations: number;
    resolve: (shouldContinue: boolean) => void;
  } | null>(null);

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(msg =>
      msg.id === id ? { ...msg, ...updates } : msg
    ));
  }, []);

  const sendMessage = useCallback(async (userInput: string) => {
    if (isProcessing) return;

    // Start tracking metrics for new agent request
    if (onStartRequest) {
      onStartRequest();
    }

    // Add user message to history
    setUserMessageHistory(prev => [...prev, userInput]);

    // Quick agent profile switch: @agent:<name>
    const agentMatch = userInput.match(/@agent:([\w.-]+)/);
    if (agentMatch && agent.setActiveAgentProfile) {
      agent.setActiveAgentProfile(agentMatch[1]);
    }

    // Entrada natural para crear reglas sin comando explícito
    let effectiveInput = userInput;
    const naturalRule = userInput.match(/^(?:crea|crear|genera|generate)\s+una?\s+regla\s+(?:para\s+)?([\w.-]+)\s*[:\-]?\s*(.+)$/i)
      || userInput.match(/^@([\w.-]+)\.mdc\s+(.+)$/i);
    if (naturalRule) {
      const name = (naturalRule[1] || '').trim();
      const spec = (naturalRule[2] || '').trim();
      if (name && spec) {
        effectiveInput = `/rule-ai ${name} ${spec}`;
      }
    } else {
      // Reglas: actualizar
      const updateRule = userInput.match(/^(?:actualiza|modifica|edita|update|edit)a?\s+(?:la\s+)?regla\s+([\w.-]+)\s*[:\-]?\s*(.+)$/i);
      if (updateRule) {
        const name = updateRule[1].trim();
        const spec = updateRule[2].trim();
        effectiveInput = [
          'You are an assistant that updates Nexus rules located at .nexus/rules/<name>.mdc.',
          `Target name: ${name}`,
          `Spec: ${spec}`,
          'Task:',
          '- Interpret the spec to produce an improved rule body and any metadata (alwaysApply, globs, agents) if implied.',
          `- Then call nexus_write_rule with: { name: "${name}", content: <generated_body>, alwaysApply?: <bool>, globs?: <csv>, agents?: <csv> }`,
          '- Preserve unspecified fields when the rule exists.',
          'Answer by calling the tool; avoid dumping full content in assistant text.'
        ].join('\n');
      }

      // Reglas: eliminar
      const deleteRule = !updateRule && userInput.match(/^(?:elimina|borra|delete|remove)\s+(?:la\s+)?regla\s+([\w.-]+)\b/i);
      if (!updateRule && deleteRule) {
        const name = deleteRule[1].trim();
        effectiveInput = [
          'Delete the given Nexus rule file.',
          `- Call delete_file with { file_path: ".nexus/rules/${name}.mdc" }`,
          '- Respond by calling the tool.'
        ].join('\n');
      }

      // Reglas: listar
      const listRules = !updateRule && !deleteRule && userInput.match(/^(?:lista|listar|muestra|ver|list|show)\s+reglas\b/i);
      if (!updateRule && !deleteRule && listRules) {
        effectiveInput = [
          'List Nexus rules.',
          '- Call list_files with { directory: ".nexus/rules", pattern: "*.mdc", recursive: false }',
          '- Respond by calling the tool.'
        ].join('\n');
      }

      // Agentes: crear/actualizar
      const upsertAgent = !naturalRule && userInput.match(/^(?:crea|crear|genera|generate|actualiza|modifica|edita|update|edit)a?\s+(?:un\s+|una\s+|el\s+|la\s+)?agente\s+([\w.-]+)\s*[:\-]?\s*(.*)$/i);
      if (upsertAgent) {
        const name = upsertAgent[1].trim();
        const spec = (upsertAgent[2] || '').trim();
        effectiveInput = [
          'You manage Nexus agents stored at .nexus/agents/<name>.mdc.',
          `Target name: ${name}`,
          `Spec: ${spec}`,
          'Task:',
          '- Extract fields: description, model, temperature, tools_include, tools_exclude and the system prompt.',
          `- Then call nexus_write_agent with: { name: "${name}", description?, model?, temperature?, tools_include?, tools_exclude?, system? }`,
          '- Preserve unspecified fields if agent exists.',
          'Answer by calling the tool.'
        ].join('\n');
      }

      // Agentes: eliminar
      const deleteAgent = !upsertAgent && userInput.match(/^(?:elimina|borra|delete|remove)\s+(?:el\s+|la\s+)?agente\s+([\w.-]+)\b/i);
      if (!upsertAgent && deleteAgent) {
        const name = deleteAgent[1].trim();
        effectiveInput = [
          'Delete the given Nexus agent file.',
          `- Call delete_file with { file_path: ".nexus/agents/${name}.mdc" }`,
          '- Respond by calling the tool.'
        ].join('\n');
      }

      // Agentes: listar
      const listAgents = !upsertAgent && !deleteAgent && userInput.match(/^(?:lista|listar|muestra|ver|list|show)\s+agentes\b/i);
      if (!upsertAgent && !deleteAgent && listAgents) {
        effectiveInput = [
          'List Nexus agents.',
          '- Call list_files with { directory: ".nexus/agents", pattern: "*.mdc", recursive: false }',
          '- Respond by calling the tool.'
        ].join('\n');
      }

      // Tareas: crear
      const createTasksNL = userInput.match(/^(?:crea|crear|genera|generate)\s+tareas?\s*[:\-]?\s*(.+)$/i);
      if (createTasksNL) {
        const spec = createTasksNL[1].trim();
        effectiveInput = [
          'Create a structured task list for the request.',
          `User request/spec: ${spec}`,
          '- Construct an array of tasks with fields: id, description, status (pending|in_progress|completed).',
          '- Then call create_tasks with { user_query, tasks }.',
          'Answer by calling the tool.'
        ].join('\n');
      }

      // Tareas: actualizar
      const updateTasksNL = !createTasksNL && userInput.match(/^(?:actualiza|modifica|marca|update)\s+tareas?\s*[:\-]?\s*(.+)$/i);
      if (!createTasksNL && updateTasksNL) {
        const spec = updateTasksNL[1].trim();
        effectiveInput = [
          'Update tasks statuses and notes.',
          `Spec: ${spec}`,
          '- Extract task_updates as an array: { id, status, notes? }.',
          '- Then call update_tasks with { task_updates }.',
          'Answer by calling the tool.'
        ].join('\n');
      }

      // Tareas: guardar
      const saveTasksNL = userInput.match(/^(?:guarda|guardar|save)\s+tareas?(?:\s+en\s+(.+))?$/i);
      if (saveTasksNL) {
        const fp = (saveTasksNL[1] || '').trim();
        effectiveInput = [
          'Persist the current task list.',
          fp ? `- Call save_tasks with { file_path: "${fp}", format: "json" }` : '- Call save_tasks with defaults (to .nexus/tasks/tasks.json)',
          '- Respond by calling the tool.'
        ].join('\n');
      }

      // Tareas: cargar
      const loadTasksNL = userInput.match(/^(?:carga|cargar|load)\s+tareas?(?:\s+desde\s+(.+))?$/i);
      if (loadTasksNL) {
        const fp = (loadTasksNL[1] || '').trim();
        effectiveInput = [
          'Load a task list from disk.',
          fp ? `- Call load_tasks with { file_path: "${fp}" }` : '- Call load_tasks with defaults (from .nexus/tasks/tasks.json)',
          '- Respond by calling the tool.'
        ].join('\n');
      }

      // MCP: upsert
      const upsertMcp = userInput.match(/^(?:agrega|agregar|configura|configurar|upsert|set)\s+(?:servidor\s+)?mcp\s+([\w.-]+)\s*[:\-]?\s*(.*)$/i);
      if (upsertMcp) {
        const name = upsertMcp[1].trim();
        const spec = (upsertMcp[2] || '').trim();
        effectiveInput = [
          'Configure an MCP server entry in .nexus/mcp.servers.json.',
          `Name: ${name}`,
          `Spec: ${spec}`,
          '- Extract command, args (comma-separated), cwd, env (KEY=VAL,KEY=VAL).',
          `- Then call nexus_write_mcp_server with { action: "upsert", name: "${name}", command?, args?, cwd?, env? }`,
          'Answer by calling the tool.'
        ].join('\n');
      }

      // MCP: delete
      const deleteMcp = !upsertMcp && userInput.match(/^(?:elimina|borra|delete|remove)\s+(?:servidor\s+)?mcp\s+([\w.-]+)\b/i);
      if (!upsertMcp && deleteMcp) {
        const name = deleteMcp[1].trim();
        effectiveInput = [
          'Delete an MCP server entry by name.',
          `- Call nexus_write_mcp_server with { action: "delete", name: "${name}" }`,
          '- Respond by calling the tool.'
        ].join('\n');
      }

      // MCP: list
      const listMcp = !upsertMcp && !deleteMcp && userInput.match(/^(?:lista|listar|muestra|ver|list|show)\s+mcp(s| servidores)?\b/i);
      if (!upsertMcp && !deleteMcp && listMcp) {
        effectiveInput = [
          'List configured MCP servers.',
          '- Call nexus_read_mcp_config with no arguments.',
          '- Respond by calling the tool.'
        ].join('\n');
      }
    }

    // Add user message
    addMessage({
      role: 'user',
      content: effectiveInput,
    });

    setIsProcessing(true);

    try {
      // Set up tool execution callbacks
      agent.setToolCallbacks({
        onThinkingText: (content: string, reasoning?: string) => {
          // Add thinking text as assistant message when model uses tools
          addMessage({
            role: 'assistant',
            content: content,
            reasoning: reasoning,
          });
        },
        onFinalMessage: (content: string, reasoning?: string) => {
          // Add final assistant message when no tools are used
          addMessage({
            role: 'assistant',
            content: content,
            reasoning: reasoning,
          });
        },
        onToolStart: (name: string, args: Record<string, any>) => {
          const toolExecution: ToolExecution = {
            id: Math.random().toString(36).substr(2, 9),
            name,
            args,
            status: 'pending',
            needsApproval: DANGEROUS_TOOLS.includes(name) || APPROVAL_REQUIRED_TOOLS.includes(name),
          };

          // Store the ID in ref for reliable matching across callbacks
          currentExecutionIdRef.current = toolExecution.id;

          // Always add tool execution message; approval is handled separately
          addMessage({
            role: 'tool_execution',
            content: `Executing ${name}...`,
            toolExecution,
          });

          setCurrentToolExecution(toolExecution);
        },
        onToolEnd: (name: string, result: any) => {
          const executionId = currentExecutionIdRef.current;

          // Only update the specific tool execution that just finished
          setMessages(prev => {
            return prev.map(msg => {
              // Match by the execution ID stored in ref (reliable across callbacks)
              if (msg.toolExecution?.id === executionId && msg.role === 'tool_execution') {
                return {
                ...msg,
                content: result.userRejected
                  ? `🚫 ${name} rejected by user`
                  : result.success
                    ? `✓ ${name} completed successfully`
                    : `🔴 ${name} failed: ${result.error || 'Unknown error'}`,
                toolExecution: {
                  ...msg.toolExecution!,
                  status: result.userRejected
                    ? 'canceled'
                    : result.success
                      ? 'completed'
                      : 'failed',
                  result
                }
              };
            }
            return msg;
          });
        });
          setCurrentToolExecution(null);
          currentExecutionIdRef.current = null;
        },
        onApiUsage: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => {
          // Pass API usage data to token metrics
          if (onAddApiTokens) {
            onAddApiTokens(usage);
          }
        },
        onToolApproval: async (toolName: string, toolArgs: Record<string, any>) => {
          // Pause metrics while waiting for approval
          if (onPauseRequest) {
            onPauseRequest();
          }

          return new Promise<{ approved: boolean; autoApproveSession?: boolean }>((resolve) => {
            setPendingApproval({
              toolName,
              toolArgs,
              resolve: (approvalResult: { approved: boolean; autoApproveSession?: boolean }) => {

                // Resume metrics after approval decision
                if (onResumeRequest) {
                  onResumeRequest();
                }

                // Update the existing tool execution message with approval result
                setMessages(prev => {
                  return prev.map(msg => {
                    if (msg.toolExecution?.id === currentExecutionIdRef.current && msg.role === 'tool_execution') {
                      const messageContent = approvalResult.approved
                        ? `Executing ${toolName}...${approvalResult.autoApproveSession ? ' (Auto-approval enabled for session)' : ''}`
                        : `Tool ${toolName} rejected by user`;

                      return {
                        ...msg,
                        content: messageContent,
                        toolExecution: {
                          ...msg.toolExecution!,
                          status: approvalResult.approved ? 'approved' : 'canceled'
                        }
                      };
                    }
                    return msg;
                  });
                });

                if (approvalResult.autoApproveSession) {
                  setSessionAutoApprove(true);
                }
                resolve(approvalResult);
              }
            });
          });
        },
        onMaxIterations: async (maxIterations: number) => {
          // Pause metrics while waiting for continuation decision
          if (onPauseRequest) {
            onPauseRequest();
          }

          return new Promise<boolean>((resolve) => {
            setPendingMaxIterations({
              maxIterations,
              resolve: (shouldContinue: boolean) => {

                // Resume metrics after decision
                if (onResumeRequest) {
                  onResumeRequest();
                }

                resolve(shouldContinue);
              }
            });
          });
        },
      });

      await agent.chat(effectiveInput);

    } catch (error) {
      // Don't show abort errors - user interruption message is already shown
      if (error instanceof Error && (
        error.message.includes('Request was aborted') ||
        error.message.includes('The operation was aborted') ||
        error.name === 'AbortError'
      )) {
        // Skip showing abort errors since user already sees "User has interrupted the request"
        return;
      }

      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        // Check if it's an API error with more details
        if ('status' in error && 'error' in error) {
          const apiError = error as any;
          if (apiError.error?.error?.message) {
            errorMessage = `API Error (${apiError.status}): ${apiError.error.error.message}`;
            if (apiError.error.error.code) {
              errorMessage += ` (Code: ${apiError.error.error.code})`;
            }
          } else {
            errorMessage = `API Error (${apiError.status}): ${error.message}`;
          }
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      } else {
        errorMessage = `Error: ${String(error)}`;
      }

      addMessage({
        role: 'system',
        content: errorMessage,
      });
    } finally {
      setIsProcessing(false);
      setCurrentToolExecution(null);

      // Complete the request tracking
      if (onCompleteRequest) {
        onCompleteRequest();
      }
    }
  }, [agent, isProcessing, addMessage, updateMessage, onStartRequest, onAddApiTokens, onPauseRequest, onResumeRequest, onCompleteRequest]);

  const approveToolExecution = useCallback((approved: boolean, autoApproveSession?: boolean) => {
    if (pendingApproval) {
      pendingApproval.resolve({ approved, autoApproveSession });
      setPendingApproval(null);
    }
  }, [pendingApproval]);

  const respondToMaxIterations = useCallback((shouldContinue: boolean) => {
    if (pendingMaxIterations) {
      pendingMaxIterations.resolve(shouldContinue);
      setPendingMaxIterations(null);
    }
  }, [pendingMaxIterations]);

  const setApiKey = useCallback((apiKey: string) => {
    agent.setApiKey(apiKey);
  }, [agent]);

  const toggleAutoApprove = useCallback(() => {
    const newAutoApproveState = !sessionAutoApprove;
    setSessionAutoApprove(newAutoApproveState);
    agent.setSessionAutoApprove(newAutoApproveState);
  }, [sessionAutoApprove, agent]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setUserMessageHistory([]);
    // Don't reset sessionAutoApprove, it should persist across /clear
    agent.clearHistory();
  }, [agent]);

  const interruptRequest = useCallback(() => {
    agent.interrupt();
    setIsProcessing(false);
    setCurrentToolExecution(null);

    // Add the interruption message to the UI
    addMessage({
      role: 'system',
      content: 'User has interrupted the request.',
    });
  }, [agent, addMessage]);

  const toggleReasoning = useCallback(() => {
    setShowReasoning(prev => !prev);
  }, []);

  return {
    messages,
    userMessageHistory,
    isProcessing,
    currentToolExecution,
    pendingApproval,
    pendingMaxIterations,
    sessionAutoApprove,
    showReasoning,
    sendMessage,
    approveToolExecution,
    respondToMaxIterations,
    addMessage,
    setApiKey,
    clearHistory,
    toggleAutoApprove,
    toggleReasoning,
    interruptRequest,
  };
}
