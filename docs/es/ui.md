# UI (Ink/React)

La interfaz se construye con `ink` y `react`:
- `App.tsx`: envuelve y monta `Chat`.
- `components/core/Chat.tsx`: layout principal; integra historial, input, métricas y overlays.
- `components/core/MessageHistory.tsx`: render de mensajes (usuario, asistente, sistema, tool-execution) con soporte de markdown básico.
- `components/core/MessageInput.tsx`: input con cursor, historial hacia arriba/abajo y sugerencias de slash-commands.
- `components/display/TokenMetrics.tsx`: tiempo/tokens y estados (activo/pausado).
- `components/display/ToolHistoryItem.tsx`: resultado y parámetros de herramienta; muestra `DiffPreview` cuando aplica.
- `components/display/DiffPreview.tsx`: algoritmo LCS para diff unificado y vista amigable en TUI.
- `components/input-overlays/*`: overlays para login, selector de modelo, aprobación de herramienta y continuar tras iteraciones máximas.
- Hooks: `useAgent` (puente con `Agent`), `useTokenMetrics` (métricas de tokens/tiempo).

Atajos comunes:
- `Esc`: rechaza herramienta si está pendiente; interrumpe petición; o limpia input si inactivo.
- `Shift+Tab`: alterna auto-aprobación de ediciones.
- `Ctrl+C`: salir.
