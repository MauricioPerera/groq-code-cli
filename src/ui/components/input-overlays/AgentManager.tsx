import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { loadAgentProfiles } from '../../../utils/nexus-agents.js';

interface AgentManagerProps {
  onActivate: (name: string) => void;
  onCancel: () => void;
}

export default function AgentManager({ onActivate, onCancel }: AgentManagerProps) {
  const [agents, setAgents] = useState<{ name: string; description?: string }[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const profs = loadAgentProfiles();
    setAgents(profs.map(p => ({ name: p.name, description: p.description })));
  }, []);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.upArrow) {
      setIdx(prev => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setIdx(prev => Math.min(Math.max(agents.length - 1, 0), prev + 1));
      return;
    }
    if (key.return) {
      if (agents[idx]) onActivate(agents[idx].name);
      return;
    }
  });

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginBottom={1}><Text color="cyan" bold>Agentes Nexus</Text></Box>
      {agents.length === 0 ? (
        <Text color="gray">No hay agentes en .nexus/agents</Text>
      ) : (
        agents.map((a, i) => (
          <Box key={a.name}>
            <Text color={i === idx ? 'green' : undefined}>{i === idx ? '❯ ' : '  '}</Text>
            <Text>{a.name}</Text>
            {a.description ? <Text color="gray"> — {a.description}</Text> : null}
          </Box>
        ))
      )}
      <Box marginTop={1}><Text color="gray">↑/↓ para navegar, Enter para activar, Esc para cancelar</Text></Box>
    </Box>
  );
}


