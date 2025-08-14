# MCP en Groq Code CLI

Este CLI puede conectarse a servidores MCP, descubrir sus tools y exponerlas al modelo como tools dinámicas.

## Configuración

Crea `.nexus/mcp.servers.json` con el listado de servidores. Ejemplo:

```json
[
  { "name": "example", "command": "node", "args": ["./server.js"], "cwd": "." }
]
```

## Uso rápido

- /mcp list lista servidores configurados.
- /mcp connect <name> conecta un servidor.
- /mcp tools muestra las tools descubiertas como `mcp__<server>__<tool>`.

El modelo puede invocar estas tools directamente durante la conversación.

## Filtro de tools por agente

Los perfiles Nexus en `.nexus/agents/*.mdc` pueden limitar tools MCP disponibles usando frontmatter:

```md
---
description: Implementador con conjunto restringido de MCP
model: llama-3.1-70b
temperature: 0.5
tools_include: mcp__example__*
tools_exclude: mcp__example__danger*
---
<instrucciones del agente>
```
- tools_include y tools_exclude aceptan patrones con * y ?.
- Estos filtros se aplican a tools MCP dinámicas (no afectan tools estáticas como read_file).