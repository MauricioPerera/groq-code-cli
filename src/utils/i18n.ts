import { ConfigManager } from './local-settings.js';

type Lang = 'es' | 'en';

const dict: Record<Lang, Record<string, string>> = {
  es: {
    'cmd.agent': 'Gestiona y activa agentes Nexus (UI). Uso: /agent',
    'cmd.rules': 'Gestiona reglas Nexus (UI). Uso: /rules',
    'cmd.mcp': 'Gestiona servidores MCP (UI). Uso: /mcp',
    'cmd.tasks': 'Gestiona tareas (UI). Uso: /tasks',
    'cmd.language': 'Establece el idioma de la UI: /language es | /language en',
    'selectModel.title': 'Seleccionar modelo',
    'selectModel.subtitle': 'Elige un modelo para la conversación. Al cambiar se limpiará el chat.',
    'selectModel.visit': 'Más info en https://groq.com/pricing',
    'selectModel.custom.label': 'ID de modelo personalizado (provider/model u otro):',
    'selectModel.custom.help': 'Enter: confirmar · Esc: volver',

    'agentManager.title': 'Agentes Nexus',
    'agentManager.empty': 'No hay agentes en .nexus/agents',
    'agentManager.hint': '↑/↓ para navegar, Enter para activar, Esc para cancelar',

    'rulesManager.title': 'Reglas Nexus',
    'rulesManager.empty': 'No hay reglas en .nexus/rules',
    'rulesManager.hint': '↑/↓ navegar, Enter adjuntar, Esc cancelar',

    'tasks.title': 'Tareas',
    'tasks.empty': '(sin tareas)',
    'tasks.hint': 'a: añadir, espacio: toggle completado, s: guardar, l: cargar, Esc: salir',
    'tasks.add.label': 'Descripción:',
    'tasks.save.label': 'Ruta archivo (default .nexus/tasks/tasks.json):',
    'tasks.load.label': 'Ruta archivo (default .nexus/tasks/tasks.json):',

    'mcp.title': 'MCP',
    'mcp.servers': 'servers',
    'mcp.tools': 'tools',
    'mcp.emptyServers': 'No hay servidores en .nexus/mcp.servers.json',
    'mcp.connectHint': 'Enter: conectar, t: tools, Esc: cerrar',
    'mcp.emptyTools': 'No hay tools descubiertas',
    'mcp.switchHint': 's: servers, Esc: cerrar',

    'login.step1': 'Paso 1/2: Ingresa tu API Key (Groq o proveedor compatible)',
    'login.step2': 'Paso 2/2: Ingresa la Base URL (OpenRouter: https://openrouter.ai/api/v1)',

    'footer.processing': 'Procesando...'
  },
  en: {
    'cmd.agent': 'Manage and activate Nexus agents (UI). Use: /agent',
    'cmd.rules': 'Manage Nexus rules (UI). Use: /rules',
    'cmd.mcp': 'Manage MCP servers (UI). Use: /mcp',
    'cmd.tasks': 'Manage tasks (UI). Use: /tasks',
    'cmd.language': 'Set UI language: /language es | /language en',
    'selectModel.title': 'Select Model',
    'selectModel.subtitle': 'Choose a model for your conversation. The chat will be cleared when you switch.',
    'selectModel.visit': 'More info at https://groq.com/pricing',
    'selectModel.custom.label': 'Custom model id (provider/model or similar):',
    'selectModel.custom.help': 'Enter: confirm · Esc: back',

    'agentManager.title': 'Nexus Agents',
    'agentManager.empty': 'No agents in .nexus/agents',
    'agentManager.hint': '↑/↓ navigate, Enter activate, Esc cancel',

    'rulesManager.title': 'Nexus Rules',
    'rulesManager.empty': 'No rules in .nexus/rules',
    'rulesManager.hint': '↑/↓ navigate, Enter attach, Esc cancel',

    'tasks.title': 'Tasks',
    'tasks.empty': '(no tasks)',
    'tasks.hint': 'a: add, space: toggle done, s: save, l: load, Esc: close',
    'tasks.add.label': 'Description:',
    'tasks.save.label': 'File path (default .nexus/tasks/tasks.json):',
    'tasks.load.label': 'File path (default .nexus/tasks/tasks.json):',

    'mcp.title': 'MCP',
    'mcp.servers': 'servers',
    'mcp.tools': 'tools',
    'mcp.emptyServers': 'No servers in .nexus/mcp.servers.json',
    'mcp.connectHint': 'Enter: connect, t: tools, Esc: close',
    'mcp.emptyTools': 'No discovered tools',
    'mcp.switchHint': 's: servers, Esc: close',

    'login.step1': 'Step 1/2: Enter your API Key (Groq or OpenAI-compatible)',
    'login.step2': 'Step 2/2: Enter Base URL (OpenRouter: https://openrouter.ai/api/v1)',

    'footer.processing': 'Processing...'
  }
};

export function t(key: string): string {
  const lang = new ConfigManager().getLanguage();
  return (dict[lang] && dict[lang][key]) || (dict.es[key] || key);
}


