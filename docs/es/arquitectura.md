# Arquitectura

Este proyecto separa claramente el CLI, el Agente, las Herramientas y la UI TUI (Ink/React).

## Módulos principales
- `src/core/cli.ts`: Punto de entrada. Usa `commander` para flags y `ink` para montar `App` con un `Agent`.
- `src/core/agent.ts`: Orquesta el bucle de conversación con `groq-sdk` y soporta `tool_calls`.
  - Callbacks UI: `onThinkingText`, `onFinalMessage`, `onToolStart`, `onToolEnd`, `onToolApproval`, `onMaxIterations`, `onApiUsage`.
  - Interrupciones: `AbortController` y `interrupt()`.
  - Persistencia: `ConfigManager` (`~/.groq/local-settings.json`) para API Key y modelo por defecto.
- `src/tools/`:
  - `tool-schemas.ts`: Define `ALL_TOOL_SCHEMAS` con `read_file`, `create_file`, `edit_file`, `delete_file`, `list_files`, `search_files`, `execute_command`, `create_tasks`, `update_tasks`.
  - `tools.ts`: Implementa cada herramienta con validaciones, timeout y formateo de resultados.
  - `validators.ts`: Regla “leer antes de editar”.
- `src/commands/`: Comandos `/help`, `/login`, `/model`, `/clear`, `/reasoning` con registro en `index.ts`.
- `src/ui/`: Componentes Ink (`Chat`, `MessageHistory`, `MessageInput`, `TokenMetrics`, overlays) y hooks (`useAgent`, `useTokenMetrics`).
- `src/utils/`: `file-ops` (escritura y árbol), `constants` (ignore patterns), `markdown` (parser sencillo), `local-settings` (API key y modelo).

## Flujo de ejecución
1. Usuario ejecuta `groq` → `cli.ts` instancia `Agent` y monta `App`.
2. `Chat` usa `useAgent` para enviar mensajes, manejar aprobaciones, interrupciones y métricas.
3. `Agent.chat` llama a Groq con `tools`; si hay `tool_calls`, ejecuta con `executeTool`, agrega resultados y repite hasta respuesta final o límite de iteraciones.

## Decisiones de diseño
- TUI con Ink para una UX rápida y minimalista.
- Herramientas explicitadas vía esquemas para guiar al modelo y controlar riesgos.
- Validación previa a edición de archivos y aprobación de herramientas sensibles.
- Logs de depuración opcionales (flag `--debug`) en `debug-agent.log` con comando `curl` equivalente.
