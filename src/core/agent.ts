import Groq from 'groq-sdk';
import { executeTool } from '../tools/tools.js';
import { validateReadBeforeEdit, getReadBeforeEditError } from '../tools/validators.js';
import { ALL_TOOL_SCHEMAS, DANGEROUS_TOOLS, APPROVAL_REQUIRED_TOOLS, ToolSchema } from '../tools/tool-schemas.js';
import { McpManager } from '../utils/mcp.js';
import { ConfigManager } from '../utils/local-settings.js';
import { ModelClient, createModelClient } from '../utils/model-client.js';
import fs from 'fs';
import path from 'path';
import { loadProjectRules, findManualRulesByRefs, getAutoAttachRules, getAgentAttachRules } from '../utils/nexus-rules.js';
import { getAgentProfile } from '../utils/nexus-agents.js';

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export class Agent {
  private client: ModelClient | null = null;
  private messages: Message[] = [];
  private apiKey: string | null = null;
  private model: string;
  private temperature: number;
  private sessionAutoApprove: boolean = false;
  private systemMessage: string;
  private configManager: ConfigManager;
  private projectRules: ReturnType<typeof loadProjectRules> = [];
  private activeAgentProfileName: string | null = null;
  private onToolStart?: (name: string, args: Record<string, any>) => void;
  private onToolEnd?: (name: string, result: any) => void;
  private onToolApproval?: (toolName: string, toolArgs: Record<string, any>) => Promise<{ approved: boolean; autoApproveSession?: boolean }>;
  private onThinkingText?: (content: string, reasoning?: string) => void;
  private onFinalMessage?: (content: string, reasoning?: string) => void;
  private onMaxIterations?: (maxIterations: number) => Promise<boolean>;
  private onApiUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void;
  private requestCount: number = 0;
  private currentAbortController: AbortController | null = null;
  private isInterrupted: boolean = false;
  private touchedFiles: Set<string> = new Set();
  private dynamicMcpTools: ToolSchema[] = [];

  private constructor(
    model: string,
    temperature: number,
    systemMessage: string | null,
    debug?: boolean
  ) {
    this.model = model;
    this.temperature = temperature;
    this.configManager = new ConfigManager();

    // Set debug mode
    debugEnabled = debug || false;

    // Build system message
    if (systemMessage) {
      this.systemMessage = systemMessage;
    } else {
      this.systemMessage = this.buildDefaultSystemMessage();
    }

    // Add system message to conversation
    // Load Nexus/Cursor rules and inject Always rules first
    try {
      this.projectRules = loadProjectRules();
      const alwaysRules = this.projectRules.filter(r => r.alwaysApply);
      for (const r of alwaysRules) {
        this.messages.push({ role: 'system', content: r.content });
      }
    } catch {}

    this.messages.push({ role: 'system', content: this.systemMessage });

    // Attempt to auto-connect to configured MCP servers and register their tools
    this.initializeMcp().catch(() => {});
  }

  static async create(
    model: string,
    temperature: number,
    systemMessage: string | null,
    debug?: boolean
  ): Promise<Agent> {
    // Check for default model in config if model not explicitly provided
    const configManager = new ConfigManager();
    const defaultModel = configManager.getDefaultModel();
    const selectedModel = defaultModel || model;

    const agent = new Agent(
      selectedModel,
      temperature,
      systemMessage,
      debug
    );
    return agent;
  }

  private buildDefaultSystemMessage(): string {
    return `You are a coding assistant powered by ${this.model} on Groq. Tools are available to you. Use tools to complete tasks.

CRITICAL: For ANY implementation request (building apps, creating components, writing code), you MUST use tools to create actual files. NEVER provide text-only responses for coding tasks that require implementation.

Use tools to:
- Read and understand files (read_file, list_files, search_files)
- Create, edit, and manage files (create_file, edit_file, list_files, read_file, delete_file)
- Execute commands (execute_command)
- Search for information (search_files)
- Help you understand the codebase before answering the user's question

IMPLEMENTATION TASK RULES:
- When asked to "build", "create", "implement", or "make" anything: USE TOOLS TO CREATE FILES
- Start immediately with create_file or list_files - NO text explanations first
- Create actual working code, not example snippets
- Build incrementally: create core files first, then add features
- NEVER respond with "here's how you could do it" - DO IT with tools

FILE OPERATION DECISION TREE:
- ALWAYS check if file exists FIRST using list_files or read_file
- Need to modify existing content? → read_file first, then edit_file (never create_file)
- Need to create something new? → list_files to check existence first, then create_file
- File exists but want to replace completely? → create_file with overwrite=true
- Unsure if file exists? → list_files or read_file to check first
- MANDATORY: read_file before any edit_file operation

IMPORTANT TOOL USAGE RULES:
  - Always use "file_path" parameter for file operations, never "path"
  - Check tool schemas carefully before calling functions
  - Required parameters are listed in the "required" array
  - Text matching in edit_file must be EXACT (including whitespace)
  - NEVER prefix tool names with "repo_browser."

COMMAND EXECUTION SAFETY:
  - Only use execute_command for commands that COMPLETE QUICKLY (tests, builds, short scripts)
  - NEVER run commands that start long-running processes (servers, daemons, web apps)
  - Examples of AVOIDED commands: "flask app.py", "npm start", "python -m http.server"
  - Examples of SAFE commands: "python test_script.py", "npm test", "ls -la", "git status"
  - If a long-running command is needed to complete the task, provide it to the user at the end of the response, not as a tool call, with a description of what it's for.

IMPORTANT: When creating files, keep them focused and reasonably sized. For large applications:
1. Start with a simple, minimal version first
2. Create separate files for different components
3. Build incrementally rather than generating massive files at once

Be direct and efficient.

Don't generate markdown tables.

When asked about your identity, you should identify yourself as a coding assistant running on the ${this.model} model via Groq.`;
  }

  public setActiveAgentProfile(profileName: string): void {
    const profile = getAgentProfile(profileName);
    if (!profile) {
      // If not found, keep current
      return;
    }
    this.activeAgentProfileName = profile.name;
    // Replace system message for future turns (do not mutate prior history)
    this.systemMessage = profile.system || this.buildDefaultSystemMessage();
    if (profile.model) {
      this.setModel(profile.model);
    }
    if (typeof profile.temperature === 'number') {
      this.temperature = profile.temperature;
    }
    // Append a system note indicating agent switch
    this.messages.push({ role: 'system', content: `Switched to agent profile: ${profile.name}` });
    this.messages.push({ role: 'system', content: this.systemMessage });

    // Filter dynamic MCP tools según include/exclude del perfil
    try {
      const include = (profile as any).toolsInclude as string[] | undefined;
      const exclude = (profile as any).toolsExclude as string[] | undefined;
      if (include || exclude) {
        const allDynamic = this.dynamicMcpTools;
        const shouldInclude = (name: string) => !include || include.some(p => matchPattern(name, p));
        const shouldExclude = (name: string) => !!exclude && exclude.some(p => matchPattern(name, p));
        this.dynamicMcpTools = allDynamic.filter(t => {
          const n = t.function.name;
          if (!shouldInclude(n)) return false;
          if (shouldExclude(n)) return false;
          return true;
        });
      }
    } catch {}

    // Attach rules scoped to this agent profile (agents field supports globs)
    try {
      if (this.projectRules && this.projectRules.length > 0 && this.activeAgentProfileName) {
        const scoped = getAgentAttachRules(this.projectRules, this.activeAgentProfileName);
        for (const r of scoped) {
          this.messages.push({ role: 'system', content: r.content });
        }
      }
    } catch {}
  }


  public setToolCallbacks(callbacks: {
    onToolStart?: (name: string, args: Record<string, any>) => void;
    onToolEnd?: (name: string, result: any) => void;
    onToolApproval?: (toolName: string, toolArgs: Record<string, any>) => Promise<{ approved: boolean; autoApproveSession?: boolean }>;
    onThinkingText?: (content: string) => void;
    onFinalMessage?: (content: string) => void;
    onMaxIterations?: (maxIterations: number) => Promise<boolean>;
    onApiUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void;
  }) {
    this.onToolStart = callbacks.onToolStart;
    this.onToolEnd = callbacks.onToolEnd;
    this.onToolApproval = callbacks.onToolApproval;
    this.onThinkingText = callbacks.onThinkingText;
    this.onFinalMessage = callbacks.onFinalMessage;
    this.onMaxIterations = callbacks.onMaxIterations;
    this.onApiUsage = callbacks.onApiUsage;
  }

  public setApiKey(apiKey: string): void {
    debugLog('Setting API key in agent...');
    debugLog('API key provided:', apiKey ? `${apiKey.substring(0, 8)}...` : 'empty');
    this.apiKey = apiKey;
    // Keep backwards compatibility: if OPENAI_API_KEY is present, model-client will route to OpenAI-compatible endpoint
    this.client = createModelClient(this.configManager);
    debugLog('Groq client initialized with provided API key');
  }

  public saveApiKey(apiKey: string): void {
    this.configManager.setApiKey(apiKey);
    this.setApiKey(apiKey);
  }

  public clearApiKey(): void {
    this.configManager.clearApiKey();
    this.apiKey = null;
    this.client = null;
  }

  public clearHistory(): void {
    // Reset messages to only contain system messages
    this.messages = this.messages.filter(msg => msg.role === 'system');
  }

  public setModel(model: string): void {
    this.model = model;
    // Save as default model
    this.configManager.setDefaultModel(model);
    // Update system message to reflect new model
    const newSystemMessage = this.buildDefaultSystemMessage();
    this.systemMessage = newSystemMessage;
    // Update the system message in the conversation
    const systemMsgIndex = this.messages.findIndex(msg => msg.role === 'system' && msg.content.includes('coding assistant'));
    if (systemMsgIndex >= 0) {
      this.messages[systemMsgIndex].content = newSystemMessage;
    }
  }

  public getCurrentModel(): string {
    if (this.model && this.model.trim()) return this.model;
    try {
      const cfg = this.configManager.getDefaultModel?.();
      return cfg || '';
    } catch {
      return '';
    }
  }

  public getCurrentProvider(): string {
    try {
      const kind = this.client ? (this.client as any).getKind?.() : undefined;
      if (kind === 'openai') return 'OpenAI-compatible';
      return 'Groq';
    } catch {
      return 'Groq';
    }
  }

  public getCurrentBaseUrlDomain(): string {
    try {
      const url = this.client ? (this.client as any).getBaseUrl?.() : null;
      if (!url) return '';
      const u = new URL(url);
      return u.host;
    } catch {
      return '';
    }
  }

  public getCurrentBaseUrl(): string {
    try {
      const url = this.client ? (this.client as any).getBaseUrl?.() : null;
      return url || '';
    } catch {
      return '';
    }
  }

  public setOpenAIConfig(apiKey: string, baseUrl?: string): void {
    try {
      // Persist and rebuild client
      (this.configManager as any).setOpenAIConfig?.(apiKey, baseUrl);
      this.client = createModelClient(this.configManager);
    } catch (e) {
      // Fallback: keep previous client
    }
  }

  public setSessionAutoApprove(enabled: boolean): void {
    this.sessionAutoApprove = enabled;
  }

  public interrupt(): void {
    debugLog('Interrupting current request');
    this.isInterrupted = true;

    if (this.currentAbortController) {
      debugLog('Aborting current API request');
      this.currentAbortController.abort();
    }

    // Add interruption message to conversation
    this.messages.push({
      role: 'system',
      content: 'User has interrupted the request.'
    });
  }

  async chat(userInput: string): Promise<void> {
    // Reset interrupt flag at the start of a new chat
    this.isInterrupted = false;

    // Check API key on first message send
    if (!this.client) {
      debugLog('Initializing model client...');
      // Try environment variable first
      const envApiKey = process.env.GROQ_API_KEY;
      if (envApiKey) {
        debugLog('Using API key from environment variable');
        this.setApiKey(envApiKey);
      } else {
        // Try config file
        debugLog('Environment variable GROQ_API_KEY not found, checking config file');
        const configApiKey = this.configManager.getApiKey();
        if (configApiKey) {
          debugLog('Using API key from config file');
           this.setApiKey(configApiKey);
        } else {
          debugLog('No API key found anywhere');
          throw new Error('No API key available. Please use /login to set your Groq API key.');
        }
      }
      debugLog('Model client initialized successfully');
    }

    // Apply @manual rule refs and clean input
    try {
      if (this.projectRules && this.projectRules.length > 0) {
        const { active, cleaned } = findManualRulesByRefs(this.projectRules, userInput);
        if (active.length > 0) {
          for (const r of active) {
            this.messages.push({ role: 'system', content: r.content });
          }
        }
        userInput = cleaned;
      }
    } catch {}

    // Add user message
    this.messages.push({ role: 'user', content: userInput });

    const maxIterations = 50;
    let iteration = 0;

    while (true) { // Outer loop for iteration reset
      while (iteration < maxIterations) {
        // Check for interruption before each iteration
        if (this.isInterrupted) {
          debugLog('Chat loop interrupted by user');
          this.currentAbortController = null;
          return;
        }

        try {
          // Check client exists
          if (!this.client) {
            throw new Error('Groq client not initialized');
          }

          debugLog('Making API call to Groq with model:', this.model);
          debugLog('Messages count:', this.messages.length);
          debugLog('Last few messages:', this.messages.slice(-3));

          // Prepare request body for curl logging
          const requestBody = {
            model: this.model,
            messages: this.messages,
            tools: this.getAllToolsForModel(),
            tool_choice: 'auto' as const,
            temperature: this.temperature,
            max_tokens: 8000,
            stream: false as const
          };

          // Log equivalent curl command
          this.requestCount++;
          const curlCommand = generateCurlCommand(this.apiKey!, requestBody, this.requestCount);
          if (curlCommand) {
            debugLog('Equivalent curl command:', curlCommand);
          }

          // Create AbortController for this request
          this.currentAbortController = new AbortController();

          const response = await this.client.createChatCompletion({
            model: this.model,
            messages: this.messages as any,
            tools: this.getAllToolsForModel(),
            tool_choice: 'auto',
            temperature: this.temperature,
            max_tokens: 8000,
            stream: false
          }, this.currentAbortController.signal);

          debugLog('Full API response received:', response);
          debugLog('Response usage:', response.usage);
          debugLog('Response finish_reason:', response.choices[0].finish_reason);
          debugLog('Response choices length:', response.choices.length);

          const message = response.choices[0].message;

          // Extract reasoning if present
          const reasoning = (message as any).reasoning;

          // Pass usage data to callback if available
          if (response.usage && this.onApiUsage) {
            this.onApiUsage({
              prompt_tokens: response.usage.prompt_tokens,
              completion_tokens: response.usage.completion_tokens,
              total_tokens: response.usage.total_tokens
            });
          }
          debugLog('Message content length:', message.content?.length || 0);
          debugLog('Message has tool_calls:', !!message.tool_calls);
          debugLog('Message tool_calls count:', message.tool_calls?.length || 0);

          if (response.choices[0].finish_reason !== 'stop' && response.choices[0].finish_reason !== 'tool_calls') {
            debugLog('WARNING - Unexpected finish_reason:', response.choices[0].finish_reason);
          }

          // Handle tool calls if present
          if (message.tool_calls) {
            // Show thinking text or reasoning if present
            if (message.content || reasoning) {
              if (this.onThinkingText) {
                this.onThinkingText(message.content || '', reasoning);
              }
            }

            // Add assistant message to history
            const assistantMsg: Message = {
              role: 'assistant',
              content: message.content || ''
            };
            assistantMsg.tool_calls = message.tool_calls;
            this.messages.push(assistantMsg);

            // Execute tool calls
            for (const toolCall of message.tool_calls) {
              // Check for interruption before each tool execution
              if (this.isInterrupted) {
                debugLog('Tool execution interrupted by user');
                this.currentAbortController = null;
                return;
              }

              const result = await this.executeToolCall(toolCall);

              // Add tool result to conversation (including rejected ones)
              this.messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(result)
              });

              // Track files touched (for auto-attached rules)
              try {
                const fn = toolCall.function?.name;
                const args = JSON.parse(toolCall.function?.arguments || '{}');
                const fp = args.file_path || args.directory;
                if (typeof fp === 'string' && fp.trim()) {
                  this.touchedFiles.add(fp);
                }
              } catch {}

              // Check if user rejected the tool, if so, stop processing
              if (result.userRejected) {
                // Add a note to the conversation that the user rejected the tool
                this.messages.push({
                  role: 'system',
                  content: `The user rejected the ${toolCall.function.name} tool execution. The response has been terminated. Please wait for the user's next instruction.`
                });
                return;
              }
            }

            // Continue loop to get model response to tool results
            iteration++;
            continue;
          }

          // No tool calls, before final response, auto-attach rules by globs
          try {
            if (this.projectRules?.length && this.touchedFiles.size) {
              const autoRules = getAutoAttachRules(this.projectRules, Array.from(this.touchedFiles));
              for (const r of autoRules) {
                // Avoid duplicating same rule content in the same turn
                const already = this.messages.some(m => m.role === 'system' && m.content === r.content);
                if (!already) this.messages.push({ role: 'system', content: r.content });
              }
            }
          } catch {}

          // No tool calls, this is the final response
          const content = message.content || '';
          debugLog('Final response - no tool calls detected');
          debugLog('Final content length:', content.length);
          debugLog('Final content preview:', content.substring(0, 200));

          if (this.onFinalMessage) {
            debugLog('Calling onFinalMessage callback');
            this.onFinalMessage(content, reasoning);
          } else {
            debugLog('No onFinalMessage callback set');
          }

          // Add final response to conversation history
          this.messages.push({
            role: 'assistant',
            content: content
          });

          debugLog('Final response added to conversation history, exiting chat loop');
          this.currentAbortController = null; // Clear abort controller
          return; // Successfully completed, exit both loops

        } catch (error) {
          this.currentAbortController = null; // Clear abort controller

          // Check if this is an abort error due to user interruption
          if (error instanceof Error && (
            error.message.includes('Request was aborted') ||
            error.message.includes('The operation was aborted') ||
            error.name === 'AbortError'
          )) {
            debugLog('API request aborted due to user interruption');
            // Don't add error message if it's an interruption - the interrupt message was already added
            return;
          }

          debugLog('Error occurred during API call:', error);
          debugLog('Error details:', {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : 'No stack available'
          });

          // Add API error as context message instead of terminating chat
          let errorMessage = 'Unknown error occurred';
          let is401Error = false;

          if (error instanceof Error) {
            // Check if it's an API error with more details
            if ('status' in error && 'error' in error) {
              const apiError = error as any;
              is401Error = apiError.status === 401;
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

          // For 401 errors (invalid API key), don't retry - terminate immediately
          if (is401Error) {
            throw new Error(`${errorMessage}. Please check your API key and use /login to set a valid key.`);
          }

          // Add error context to conversation for model to see and potentially recover
          this.messages.push({
            role: 'system',
            content: `Previous API request failed with error: ${errorMessage}. Please try a different approach or ask the user for clarification.`
          });

          // Continue conversation loop to let model attempt recovery
          iteration++;
          continue;
        }
      }

      // Hit max iterations, ask user if they want to continue
      if (iteration >= maxIterations) {
        let shouldContinue = false;
        if (this.onMaxIterations) {
          shouldContinue = await this.onMaxIterations(maxIterations);
        }
        if (shouldContinue) {
          iteration = 0; // Reset iteration counter
          continue; // Continue the outer loop
        } else {
          return; // Exit both loops
        }
      }
    }
  }

  private async executeToolCall(toolCall: any): Promise<Record<string, any>> {
    try {
      // Strip 'repo_browser.' prefix if present (some models hallucinate this)
      let toolName = toolCall.function.name;
      if (toolName.startsWith('repo_browser.')) {
        toolName = toolName.substring('repo_browser.'.length);
      }

      // Handle truncated tool calls
      let toolArgs: any;
      try {
        toolArgs = JSON.parse(toolCall.function.arguments);
      } catch (error) {
        return {
          error: `Tool arguments truncated: ${error}. Please break this into smaller pieces or use shorter content.`,
          success: false
        };
      }

      // Notify UI about tool start
      if (this.onToolStart) {
        this.onToolStart(toolName, toolArgs);
      }

      // Check read-before-edit for edit tools
      if (toolName === 'edit_file' && toolArgs.file_path) {
        if (!validateReadBeforeEdit(toolArgs.file_path)) {
          const errorMessage = getReadBeforeEditError(toolArgs.file_path);
          const result = { error: errorMessage, success: false };
          if (this.onToolEnd) {
            this.onToolEnd(toolName, result);
          }
          return result;
        }
      }

      // Check if tool needs approval (only after validation passes)
      const isDangerous = DANGEROUS_TOOLS.includes(toolName);
      const requiresApproval = APPROVAL_REQUIRED_TOOLS.includes(toolName);
      const needsApproval = isDangerous || requiresApproval;

      // For APPROVAL_REQUIRED_TOOLS, check if session auto-approval is enabled
      const canAutoApprove = requiresApproval && !isDangerous && this.sessionAutoApprove;

      if (needsApproval && !canAutoApprove) {
        let approvalResult: { approved: boolean; autoApproveSession?: boolean };

        if (this.onToolApproval) {
          // Check for interruption before waiting for approval
          if (this.isInterrupted) {
            const result = { error: 'Tool execution interrupted by user', success: false, userRejected: true };
            if (this.onToolEnd) {
              this.onToolEnd(toolName, result);
            }
            return result;
          }

          approvalResult = await this.onToolApproval(toolName, toolArgs);

          // Check for interruption after approval process
          if (this.isInterrupted) {
            const result = { error: 'Tool execution interrupted by user', success: false, userRejected: true };
            if (this.onToolEnd) {
              this.onToolEnd(toolName, result);
            }
            return result;
          }
        } else {
          // No approval callback available, reject by default
          approvalResult = { approved: false };
        }

        // Enable session auto-approval if requested (only for APPROVAL_REQUIRED_TOOLS)
        if (approvalResult.autoApproveSession && requiresApproval && !isDangerous) {
          this.sessionAutoApprove = true;
        }

        if (!approvalResult.approved) {
          const result = { error: 'Tool execution canceled by user', success: false, userRejected: true };
          if (this.onToolEnd) {
            this.onToolEnd(toolName, result);
          }
          return result;
        }
      }

      // Execute tool (including dynamic MCP proxy tools)
      let result: any;
      if (toolName.startsWith('mcp__')) {
        // Format: mcp__<server>__<tool>
        const parts = toolName.split('__');
        if (parts.length >= 3) {
          const server = parts[1];
          const tname = parts.slice(2).join('__');
          try {
            const data = await McpManager.instance().call(server, tname, toolArgs || {});
            result = { success: true, content: data };
          } catch (e: any) {
            result = { success: false, error: e?.message || 'MCP tool failed' };
          }
        } else {
          result = { success: false, error: 'Invalid MCP tool format' };
        }
      } else {
        result = await executeTool(toolName, toolArgs);
      }

      // Notify UI about tool completion
      if (this.onToolEnd) {
        this.onToolEnd(toolName, result);
      }

      return result;

    } catch (error) {
      const errorMsg = `Tool execution error: ${error}`;
      return { error: errorMsg, success: false };
    }
  }

  private async initializeMcp() {
    try {
      await McpManager.instance().ensureConnectedAll();
      const discovered = McpManager.instance().getDiscoveredTools();
      // Convert discovered MCP tools to OpenAI tool schemas with namespaced names
      this.dynamicMcpTools = discovered.map(d => {
        const schema: any = d.inputSchema && typeof d.inputSchema === 'object' ? d.inputSchema : { type: 'object', properties: {}, required: [] };
        const description = d.description || `MCP tool ${d.name} from server ${d.server}`;
        return {
          type: 'function',
          function: {
            name: `mcp__${d.server}__${d.name}`,
            description,
            parameters: schema,
          }
        } as ToolSchema;
      });
    } catch {}
  }

  private getAllToolsForModel(): ToolSchema[] {
    // Merge static tools with dynamic MCP tools
    return [...ALL_TOOL_SCHEMAS, ...this.dynamicMcpTools];
  }

  public attachRule(ruleName: string): boolean {
    try {
      if (!this.projectRules || this.projectRules.length === 0) return false;
      const rule = this.projectRules.find(r => r.name === ruleName || r.name + '.mdc' === ruleName);
      if (!rule) return false;
      this.messages.push({ role: 'system', content: rule.content });
      return true;
    } catch {
      return false;
    }
  }
}


// Debug logging to file
const DEBUG_LOG_FILE = path.join(process.cwd(), 'debug-agent.log');
let debugLogCleared = false;
let debugEnabled = false;

function debugLog(message: string, data?: any) {
  if (!debugEnabled) return;

  // Clear log file on first debug log of each session
  if (!debugLogCleared) {
    fs.writeFileSync(DEBUG_LOG_FILE, '');
    debugLogCleared = true;
  }

  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
  fs.appendFileSync(DEBUG_LOG_FILE, logEntry);
}

function generateCurlCommand(apiKey: string, requestBody: any, requestCount: number): string {
  if (!debugEnabled) return '';

  const maskedApiKey = `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 8)}`;

  // Write request body to JSON file
  const jsonFileName = `debug-request-${requestCount}.json`;
  const jsonFilePath = path.join(process.cwd(), jsonFileName);
  fs.writeFileSync(jsonFilePath, JSON.stringify(requestBody, null, 2));

  const curlCmd = `curl -X POST "https://api.groq.com/openai/v1/chat/completions" \\
  -H "Authorization: Bearer ${maskedApiKey}" \\
  -H "Content-Type: application/json" \\
  -d @${jsonFileName}`;

  return curlCmd;
}

function matchPattern(value: string, pattern: string): boolean {
  if (pattern === '*') return true;
  const escaped = pattern.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  const re = new RegExp(`^${escaped}$`, 'i');
  return re.test(value);
}
