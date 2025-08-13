# Desarrollo

## Requisitos
- Node.js >= 16

## Scripts
```bash
npm run build   # compila TypeScript a dist/
npm run dev     # watch de TypeScript
```

## Flujo de trabajo sugerido
1. `npm run dev` en segundo plano para compilar en caliente.
2. Añadir herramientas nuevas: esquema en `tool-schemas.ts`, implementación y registro en `tools.ts`.
3. Añadir slash-commands: crear en `src/commands/definitions` y registrar en `src/commands/index.ts`.
4. Cambiar modelo por defecto con `/model` o en `~/.groq/local-settings.json`.
5. Modificar UI en `src/ui/components` y hooks.

## Debug
- `groq --debug` genera `debug-agent.log` y muestra el cURL equivalente para reproducir llamadas a la API.

## Pruebas manuales
- Probar herramientas dentro de una sesión: pedir que lea/edite/cree archivos y aprobar desde la UI.
- Verificar `edit_file` tras `read_file` (la UI impide editar sin leer antes).
