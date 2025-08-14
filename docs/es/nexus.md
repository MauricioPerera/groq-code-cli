# Nexus: Reglas, Agentes, MCP y Lenguaje Natural

Este documento explica cómo usar `.nexus/` y cómo operar por lenguaje natural sin comandos explícitos.

## Estructura

- `.nexus/rules/*.mdc`: Reglas con frontmatter + cuerpo.
- `.nexus/agents/*.mdc`: Agentes con frontmatter + system prompt.
- `.nexus/mcp.servers.json`: Servidores MCP.
- `.nexus/tasks/`: Persistencia de tareas (json/md).

## Reglas (MDC)

Frontmatter soportado:

```
---
description: Texto
alwaysApply: false
globs: docs/**/*.md,src/**
agents: prd, review-*
---
Cuerpo de la regla…
```

- `alwaysApply`: se inyecta siempre.
- `globs`: auto-attach cuando se tocan archivos que matchean.
- `agents`: se inyecta al activar un agente cuyo nombre haga match (globs soportados).

## Agentes (MDC)

Frontmatter soportado:

```
---
description: Texto
model: qwen/qwen3-coder:free
temperature: 0.7
tools_include: mcp__*__*, read_file, create_file
tools_exclude: execute_command
---
System prompt del agente…
```

## Lenguaje Natural (CRUD)

Puedes crear/editar/borrar/listar entidades sin comandos:

- Reglas
  - Crear/actualizar: “crea una regla PRD: … globs docs/**/*.md; agents prd,review-*; …”
  - Editar: “actualiza la regla PRD: alwaysApply=true; …”
  - Borrar: “elimina la regla PRD”
  - Listar: “lista reglas”
  - Adjuntar manualmente al contexto: “@PRD.mdc …”

- Agentes
  - Crear/actualizar: “crea agente reviewer: model=…, temp=0.2, tools_include=mcp__*__*, prompt=…”
  - Borrar: “elimina el agente reviewer”
  - Listar: “lista agentes”
  - Activar: “@agent:reviewer”

- Tareas
  - Crear: “crea tareas: preparar PRD, definir KPIs, …”
  - Actualizar: “actualiza tareas: 1=completed, 2=in_progress con nota ‘…’”
  - Guardar: “guarda tareas en .nexus/tasks/prd.json”
  - Cargar: “carga tareas desde .nexus/tasks/prd.json”

- MCP
  - Configurar: “configura mcp ejemplo: command=node, args=server.js, cwd=./mcp, env=PORT=3001”
  - Eliminar: “elimina mcp ejemplo”
  - Listar: “lista mcp”

Internamente, el mensaje se reescribe a instrucciones para que el modelo llame a las tools adecuadas (`nexus_write_rule`, `nexus_write_agent`, `create_tasks`, `update_tasks`, `save_tasks`, `load_tasks`, `nexus_write_mcp_server`, etc.).

## Comandos útiles

- `/agent`, `/rules`, `/tasks`, `/mcp`: abren overlays para gestionar entidades.
- `/rule-ai <name> <spec…>`: el modelo genera el contenido de la regla y llama `nexus_write_rule`.
- `/language es|en`: cambia el idioma de la UI.

## Buenas prácticas

- Estandariza reglas y agentes con frontmatter.
- Usa `agents` para scoping por agente y `globs` para scoping por archivos.
- Habilita auto-aprobación solo si confías en las operaciones.


