import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { loadProjectRules } from '../../../utils/nexus-rules.js';
import { t } from '../../../utils/i18n.js';

interface RulesManagerProps {
  onAttach: (name: string) => void;
  onCancel: () => void;
}

export default function RulesManager({ onAttach, onCancel }: RulesManagerProps) {
  const [rules, setRules] = useState<{ name: string; description?: string; always?: boolean }[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const list = loadProjectRules();
    setRules(list.map(r => ({ name: r.name, description: r.description, always: !!r.alwaysApply })));
  }, []);

  useInput((input, key) => {
    if (key.escape) return onCancel();
    if (key.upArrow) return setIdx(prev => Math.max(0, prev - 1));
    if (key.downArrow) return setIdx(prev => Math.min(Math.max(rules.length - 1, 0), prev + 1));
    if (key.return) {
      if (rules[idx]) onAttach(rules[idx].name);
    }
  });

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginBottom={1}><Text color="cyan" bold>{t('rulesManager.title')}</Text></Box>
      {rules.length === 0 ? (
        <Text color="gray">{t('rulesManager.empty')}</Text>
      ) : (
        rules.map((r, i) => (
          <Box key={r.name}>
            <Text color={i === idx ? 'green' : undefined}>{i === idx ? '❯ ' : '  '}</Text>
            <Text>{r.name}</Text>
            {r.description ? <Text color="gray"> — {r.description}</Text> : null}
            {r.always ? <Text color="yellow"> [Always]</Text> : null}
          </Box>
        ))
      )}
      <Box marginTop={1}><Text color="gray">{t('rulesManager.hint')}</Text></Box>
    </Box>
  );
}


