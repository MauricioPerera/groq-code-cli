# Solución de problemas

## Errores de autenticación (401)
- Asegúrate de configurar la API key: `/login` o `export GROQ_API_KEY=...`
- Revisa `~/.groq/local-settings.json` y permisos del archivo.

## El comando se queda esperando
- `execute_command` solo debe ejecutar comandos que terminen por sí solos (p. ej., `npm test`, `ls -la`). Evita `npm start` o servidores.
- Ajusta `timeout` si tu comando tarda más.

## “File must be read before editing”
- Usa `read_file` sobre el archivo antes de `edit_file`. La UI también respeta esta regla en `DiffPreview`.

## Rutas en Windows / Git Bash
- Usa rutas relativas al proyecto en herramientas (`src/...`). Evita rutas absolutas.

## Depuración
- Ejecuta `groq --debug` y revisa `debug-agent.log` y los JSON de request `debug-request-*.json`.
