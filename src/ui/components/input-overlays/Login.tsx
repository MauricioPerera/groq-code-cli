import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

interface LoginProps {
  onSubmit: (apiKey: string, baseUrl?: string) => void;
  onCancel: () => void;
}

export default function Login({ onSubmit, onCancel }: LoginProps) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  useInput((input, key) => {
    if (key.return) {
      if (apiKey.trim()) {
        onSubmit(apiKey.trim(), baseUrl.trim() || undefined);
      }
      return;
    }

    if (key.escape) {
      onCancel();
      return;
    }

    if (key.backspace || key.delete) {
      if (baseUrl.length > 0) setBaseUrl(prev => prev.slice(0, -1));
      else setApiKey(prev => prev.slice(0, -1));
      return;
    }

    if (key.ctrl && input === 'c') {
      onCancel();
      return;
    }

    // Regular character input
    if (input && !key.meta && !key.ctrl) {
      if (apiKey.length === 0 || baseUrl.length > 0) {
        setBaseUrl(prev => prev + input);
      } else {
        setApiKey(prev => prev + input);
      }
    }
  });

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>Login with Groq API Key</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">Enter your API key. To use OpenAI-compatible providers, set Base URL and API key.</Text>
      </Box>

      <Box>
        <Text color="cyan">API Key: </Text>
        <Text>
          {'*'.repeat(Math.min(apiKey.length, 20))}
          {apiKey.length > 20 && '...'}
        </Text>
        <Text backgroundColor="cyan" color="cyan">▌</Text>
      </Box>
      <Box>
        <Text color="cyan">Base URL (optional): </Text>
        <Text>{baseUrl || ''}</Text>
      </Box>
    </Box>
  );
}
