import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { t } from '../../../utils/i18n.js';

interface ModelSelectorProps {
  onSubmit: (model: string) => void;
  onCancel: () => void;
  currentModel?: string;
}

const AVAILABLE_MODELS = [
  { id: 'moonshotai/kimi-k2-instruct', name: 'Kimi K2 Instruct', description: 'Most capable model' },
  { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', description: 'Fast, capable, and cheap model' },
  { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', description: 'Fastest and cheapest model' },
  { id: 'qwen/qwen3-32b', name: 'Qwen 3 32B', description: '' },
  { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick', description: '' },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout', description: '' },
  { id: '__custom__', name: 'Custom (enter model id manually)', description: 'Type any provider model id' },
];

export default function ModelSelector({ onSubmit, onCancel, currentModel }: ModelSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const currentIndex = AVAILABLE_MODELS.findIndex(model => model.id === currentModel);
    return currentIndex >= 0 ? currentIndex : 0;
  });
  const [isCustom, setIsCustom] = useState(false);
  const [customText, setCustomText] = useState('');

  useInput((input, key) => {
    if (key.return) {
      const selected = AVAILABLE_MODELS[selectedIndex];
      if (selected.id === '__custom__') {
        if (!isCustom) {
          setIsCustom(true);
        } else {
          const value = customText.trim();
          if (value) onSubmit(value);
        }
      } else {
        onSubmit(selected.id);
      }
      return;
    }

    if (key.escape) {
      if (isCustom) {
        setIsCustom(false);
        setCustomText('');
      } else {
        onCancel();
      }
      return;
    }

    if (isCustom) {
      if (key.backspace || key.delete) {
        setCustomText(prev => prev.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setCustomText(prev => prev + input);
        return;
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex(prev => Math.min(AVAILABLE_MODELS.length - 1, prev + 1));
      return;
    }

    if (key.ctrl && input === 'c') {
      onCancel();
      return;
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan" bold>{t('selectModel.title')}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray" dimColor>{t('selectModel.subtitle')}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray" dimColor>{t('selectModel.visit')}</Text>
      </Box>

      {!isCustom ? (
        <Box flexDirection="column" marginBottom={1}>
          {AVAILABLE_MODELS.map((model, index) => (
            <Box key={model.id} marginBottom={index === AVAILABLE_MODELS.length - 1 ? 0 : 1}>
              <Text
                color={index === selectedIndex ? 'black' : 'white'}
                backgroundColor={index === selectedIndex ? 'cyan' : undefined}
                bold={index === selectedIndex}
              >
                {index === selectedIndex ? <Text bold>{">"}</Text> : "  "} {""}
                {model.name}
                {model.id === currentModel ? ' (current)' : ''}
              </Text>
              {index === selectedIndex && (
                <Box marginLeft={4} marginTop={0}>
                  <Text color="gray" dimColor>
                    {model.description}
                  </Text>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      ) : (
        <Box flexDirection="column" marginBottom={1}>
          <Box marginBottom={1}><Text color="gray">Custom model id (provider/model or similar):</Text></Box>
          <Box>
            <Text color="cyan">Model: </Text>
            <Text>{customText}</Text>
            <Text backgroundColor="cyan" color="cyan">▌</Text>
          </Box>
          <Box marginTop={1}><Text color="gray">{t('selectModel.custom.help')}</Text></Box>
        </Box>
      )}
    </Box>
  );
}
