# Herramientas (Tools)

El Agente usa herramientas invocadas por function-calling del modelo Groq. Todas se describen mediante esquemas en `src/tools/tool-schemas.ts` y se implementan en `src/tools/tools.ts`.

## Archivos
- `read_file(file_path, start_line?, end_line?)` — Lee un archivo. Requisito previo para `edit_file`.
- `create_file(file_path, content, file_type?, overwrite?)` — Crea archivos o directorios.
- `edit_file(file_path, old_text, new_text, replace_all?)` — Reemplazo exacto de texto. Exige `read_file` previo.
- `delete_file(file_path, recursive?)` — Elimina archivos/directorios (seguro y con checks).
- `list_files(directory?, pattern?, recursive?, show_hidden?)` — Lista estructura (salida tipo árbol).

## Búsqueda
- `search_files(pattern, file_pattern?, directory?, case_sensitive?, pattern_type?, file_types?, exclude_dirs?, exclude_files?, max_results?, context_lines?, group_by_file?)` — Busca coincidencias con filtros.

## Ejecución
- `execute_command(command, command_type, working_directory?, timeout?)` — Comandos de corta duración. Evita procesos largos.

## Gestión de tareas
- `create_tasks(user_query, tasks[])` — Crea una lista de subtareas.
- `update_tasks(task_updates[])` — Actualiza estados y notas.

## Validaciones y seguridad
- `validators.ts` impone “leer antes de editar”.
- Aprobación de herramientas sensibles desde la UI. Auto-aprobación opcional para herramientas no peligrosas por sesión.
- `DiffPreview.tsx` muestra diffs para `create_file`/`edit_file`.
