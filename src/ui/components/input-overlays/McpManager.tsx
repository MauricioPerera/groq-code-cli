import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { McpManager } from '../../../utils/mcp.js';

interface McpManagerProps {
  onClose: () => void;
}

export default function McpManagerOverlay({ onClose }: McpManagerProps) {
  const [servers, setServers] = useState<string[]>([]);
  const [tools, setTools] = useState<Array<{ server: string; name: string; description?: string }>>([]);
  const [tab, setTab] = useState<'servers'|'tools'>('servers');
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setServers(McpManager.instance().listConfigured());
    (async () => {
      await McpManager.instance().ensureConnectedAll();
      const t = McpManager.instance().getDiscoveredTools();
      setTools(t);
    })();
  }, []);

  useInput(async (ch, key) => {
    if (key.escape) return onClose();
    if (ch === 't') { setTab('tools'); setIdx(0); return; }
    if (ch === 's') { setTab('servers'); setIdx(0); return; }
    if (key.upArrow) return setIdx(prev => Math.max(0, prev - 1));
    if (key.downArrow) return setIdx(prev => {
      const max = tab==='servers' ? Math.max(servers.length - 1, 0) : Math.max(tools.length - 1, 0);
      return Math.min(max, prev + 1);
    });
    if (key.return) {
      if (tab==='servers' && servers[idx]) {
        try { await McpManager.instance().connect(servers[idx]); } catch {}
      }
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}><Text color="cyan" bold>MCP</Text></Box>
      <Box>
        <Text>[</Text><Text color={tab==='servers'?'green':undefined}>servers</Text><Text>]</Text>
        <Text> </Text>
        <Text>[</Text><Text color={tab==='tools'?'green':undefined}>tools</Text><Text>]</Text>
      </Box>
      {tab==='servers' ? (
        <Box flexDirection="column">
          {servers.length===0 ? <Text color="gray">No hay servidores en .nexus/mcp.servers.json</Text> : servers.map((s,i)=> (
            <Box key={s}><Text color={i===idx?'green':undefined}>{i===idx?'❯ ':'  '}</Text><Text>{s}</Text></Box>
          ))}
          <Box marginTop={1}><Text color="gray">Enter: conectar, t: tools, Esc: cerrar</Text></Box>
        </Box>
      ) : (
        <Box flexDirection="column">
          {tools.length===0 ? <Text color="gray">No hay tools descubiertas</Text> : tools.map((t,i)=> (
            <Box key={`${t.server}:${t.name}`}>
              <Text color={i===idx?'green':undefined}>{i===idx?'❯ ':'  '}</Text>
              <Text>mcp__{t.server}__{t.name}</Text>
              {t.description ? <Text color="gray"> — {t.description}</Text> : null}
            </Box>
          ))}
          <Box marginTop={1}><Text color="gray">s: servers, Esc: cerrar</Text></Box>
        </Box>
      )}
    </Box>
  );
}


