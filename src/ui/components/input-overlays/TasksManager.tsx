import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { createTasks, updateTasks, saveTasks, loadTasks } from '../../../tools/tools.js';

type Task = { id: string; description: string; status: 'pending'|'in_progress'|'completed'; notes?: string };

interface TasksManagerProps {
  onClose: () => void;
}

export default function TasksManager({ onClose }: TasksManagerProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cursor, setCursor] = useState(0);
  const [mode, setMode] = useState<'list'|'add'|'save'|'load'>('list');
  const [input, setInput] = useState('');

  useEffect(() => {
    // No-op: tasks live in tool layer; we only issue commands here as convenience
  }, []);

  useInput((ch, key) => {
    if (key.escape) return onClose();
    if (mode === 'list') {
      if (key.upArrow) return setCursor(prev => Math.max(0, prev - 1));
      if (key.downArrow) return setCursor(prev => Math.min(Math.max(tasks.length - 1, 0), prev + 1));
      if (ch === 'a') { setMode('add'); setInput(''); return; }
      if (ch === 's') { setMode('save'); setInput(''); return; }
      if (ch === 'l') { setMode('load'); setInput(''); return; }
      if (ch === ' ') {
        const t = tasks[cursor];
        if (!t) return;
        const next: Task = { ...t, status: t.status === 'completed' ? 'pending' : 'completed' };
        setTasks(ts => ts.map((x,i)=> i===cursor? next : x));
        updateTasks([{ id: t.id, status: next.status }]);
        return;
      }
    } else {
      if (key.return) {
        if (mode === 'add') {
          const id = String(tasks.length + 1);
          const desc = input.trim();
          if (desc) {
            const newTask: Task = { id, description: desc, status: 'pending' };
            setTasks(ts => [...ts, newTask]);
            if (tasks.length === 0) {
              createTasks('UI tasks', [newTask]);
            } else {
              updateTasks([{ id, status: 'pending', notes: '' }]);
            }
          }
          setMode('list');
          setInput('');
          return;
        }
        if (mode === 'save') {
          const p = input.trim();
          saveTasks(p || '', 'json');
          setMode('list');
          setInput('');
          return;
        }
        if (mode === 'load') {
          const p = input.trim();
          loadTasks(p || '');
          setMode('list');
          setInput('');
          return;
        }
      }
      if (key.backspace || key.delete) { setInput(prev => prev.slice(0,-1)); return; }
      if (ch && !key.ctrl && !key.meta) setInput(prev => prev + ch);
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}><Text color="cyan" bold>Tareas</Text></Box>
      {mode === 'list' ? (
        <>
          {tasks.length === 0 ? <Text color="gray">(sin tareas)</Text> : tasks.map((t,i)=> (
            <Box key={t.id}>
              <Text color={i===cursor?'green':undefined}>{i===cursor?'❯ ':'  '}</Text>
              <Text>[{t.status==='completed'?'x':' '}] {t.id}. {t.description}</Text>
            </Box>
          ))}
          <Box marginTop={1}><Text color="gray">a: añadir, espacio: toggle completado, s: guardar, l: cargar, Esc: salir</Text></Box>
        </>
      ) : null}
      {mode === 'add' ? (
        <>
          <Text>Descripción: {input}</Text>
        </>
      ) : null}
      {mode === 'save' ? (
        <>
          <Text>Ruta archivo (default .nexus/tasks/tasks.json): {input}</Text>
        </>
      ) : null}
      {mode === 'load' ? (
        <>
          <Text>Ruta archivo (default .nexus/tasks/tasks.json): {input}</Text>
        </>
      ) : null}
    </Box>
  );
}


