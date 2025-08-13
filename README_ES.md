# Groq Code CLI (Español)

Una CLI de código altamente personalizable, ligera y de código abierto, impulsada por Groq para iteración instantánea.

- Repositorio original: `https://github.com/MauricioPerera/groq-code-cli.git`
- Versión CLI: 1.0.2

## Índice
- [Descripción](#descripción)
- [Instalación](#instalación)
- [Uso](#uso)
- [Autenticación](#autenticación)
- [Comandos disponibles](#comandos-disponibles)
- [Arquitectura](#arquitectura)
- [Personalización](#personalización)
- [Desarrollo](#desarrollo)
- [Seguridad y aprobaciones](#seguridad-y-aprobaciones)
- [Solución de problemas](#solución-de-problemas)
- [Licencia](#licencia)

## Descripción
Groq Code CLI es un plano base para construir tu propia CLI de desarrollo. Mantiene una base de código mínima y clara, con una UI TUI (Ink/React) y un Agente que usa `groq-sdk` con herramientas (function calling) para leer/editar archivos, buscar en el código y ejecutar comandos cortos.

## Instalación

Desarrollo (recomendado):
```bash
git clone https://github.com/MauricioPerera/groq-code-cli.git
cd groq-code-cli
npm install
npm run build
npm link      # habilita el comando `groq` global
```

Ejecución instantánea:
```bash
npx groq-code-cli@latest
```

Instalación global:
```bash
npm install -g groq-code-cli@latest
```

## Uso
Iniciar sesión de chat:
```bash
groq
```

Opciones:
```bash
groq [options]

-t, --temperature <temp>  Temperatura (por defecto: 1)
-s, --system <message>    Mensaje de sistema personalizado
-d, --debug               Log de depuración en debug-agent.log
-h, --help                Ayuda
-V, --version             Versión
```

## Autenticación
Primera vez:
```bash
groq
```
y escribe el comando `/login` para guardar tu API Key de Groq de forma local (`~/.groq/local-settings.json`).

También puedes usar variable de entorno:
```bash
export GROQ_API_KEY=tu_api_key
```

## Comandos disponibles
- `/help`: ayuda y atajos
- `/login`: guardar API key
- `/model`: seleccionar modelo de Groq (persiste por defecto)
- `/clear`: limpiar historial
- `/reasoning`: mostrar/ocultar razonamiento en mensajes

## Arquitectura
- `src/core/cli.ts`: punto de entrada CLI (commander + Ink)
- `src/core/agent.ts`: bucle de conversación, tool-calls, aprobaciones, interrupciones
- `src/tools/`: esquemas (`tool-schemas.ts`), implementación (`tools.ts`), validadores
- `src/commands/`: definiciones y registro de slash-commands
- `src/ui/`: componentes Ink/React (chat, input, métricas, overlays), hooks (`useAgent`, `useTokenMetrics`)
- `src/utils/`: archivo/árbol (`file-ops.ts`), config local (`local-settings.ts`), markdown básico

Detalle en `docs/es/arquitectura.md`.

## Personalización
- Herramientas: define esquema en `tool-schemas.ts`, implementa en `tools.ts` y registra en `TOOL_REGISTRY`
- Slash-commands: crea en `src/commands/definitions` y registra en `src/commands/index.ts`
- UI: modifica componentes en `src/ui/components` o hooks
- Comando de inicio: cambia `bin.groq` en `package.json` y vuelve a `npm run build && npm link`

## Desarrollo
Scripts:
```bash
npm run build   # compila a dist/
npm run dev     # watch
```

Durante desarrollo, deja `npm run dev` en segundo plano para recompilar automáticamente.

Estructura completa en `README.md` y ampliada en `docs/es/desarrollo.md`.

## Seguridad y aprobaciones
- Edición segura: `edit_file` exige haber usado `read_file` antes
- Herramientas peligrosas o sensibles requieren aprobación explícita; puedes activar auto-aprobación de sesión para herramientas no peligrosas
- `execute_command` solo para comandos de corta duración (con timeout); evita procesos que queden corriendo

## Solución de problemas
Casos comunes en `docs/es/solucion-de-problemas.md`:
- 401/clave inválida → verifica `/login` o `GROQ_API_KEY`
- El comando se queda colgado → usa herramientas de archivo en vez de procesos largos
- “File must be read before editing” → usa `read_file` antes de `edit_file`
- Windows/Git Bash rutas → usa rutas relativas del proyecto

## Licencia
MIT. Consulta `LICENSE`.
