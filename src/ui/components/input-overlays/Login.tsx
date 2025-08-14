import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { t } from '../../../utils/i18n.js';

interface LoginProps {
  onSubmit: (apiKey: string, baseUrl?: string) => void;
  onCancel: () => void;
}

export default function Login({ onSubmit, onCancel }: LoginProps) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [step, setStep] = useState<'api' | 'url'>('api');

  useInput((input, key) => {
    // Enter: avanza de API -> URL; en URL guarda
    if (key.return) {
      if (step === 'api') {
        if (apiKey.trim()) {
          setStep('url');
        }
      } else {
        onSubmit(apiKey.trim(), baseUrl.trim() || undefined);
      }
      return;
    }

    if (key.escape) {
      onCancel();
      return;
    }

    // Tab o flechas: alternar paso
    if (input === '\t' || key.upArrow || key.downArrow || key.leftArrow || key.rightArrow) {
      setStep(prev => (prev === 'api' ? 'url' : 'api'));
      return;
    }

    if (key.backspace || key.delete) {
      if (step === 'api') setApiKey(prev => prev.slice(0, -1));
      else setBaseUrl(prev => prev.slice(0, -1));
      return;
    }

    if (key.ctrl && input === 'c') {
      onCancel();
      return;
    }

    // Regular character input
    if (input && !key.meta && !key.ctrl) {
      if (step === 'api') setApiKey(prev => prev + input);
      else setBaseUrl(prev => prev + input);
    }
  });

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>Login</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">{step === 'api' ? t('login.step1') : t('login.step2')}</Text>
      </Box>

      {step === 'api' ? (
        <>
          <Box>
            <Text color="cyan">API Key: </Text>
            <Text>
              {'*'.repeat(Math.min(apiKey.length, 20))}
              {apiKey.length > 20 && '...'}
            </Text>
            <Text backgroundColor="cyan" color="cyan">▌</Text>
          </Box>
          <Box marginTop={1}><Text color="gray">Enter: continuar · Esc: cancelar</Text></Box>
        </>
      ) : (
        <>
          <Box>
            <Text color="cyan">Base URL: </Text>
            <Text>{baseUrl || ''}</Text>
            <Text backgroundColor="cyan" color="cyan">▌</Text>
          </Box>
          <Box marginTop={1}><Text color="gray">Enter: guardar · Esc: cancelar</Text></Box>
        </>
      )}
    </Box>
  );
}
