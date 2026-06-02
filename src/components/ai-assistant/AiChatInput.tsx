/** Chat composer: growing text input + send / stop button. */
import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Icon } from '../common';
import { useAppTheme } from '../../contexts/ThemeContext';
import { ms, spacing, fontSizes } from '../../utils/responsive';

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  busy: boolean;
  placeholder?: string;
}

export const AiChatInput: React.FC<Props> = ({ onSend, onStop, busy, placeholder }) => {
  const theme = useAppTheme();
  const [text, setText] = useState('');
  const [height, setHeight] = useState(ms(40));

  const canSend = text.trim().length > 0 && !busy;

  const handleSend = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
    setHeight(ms(40));
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <TextInput
        style={[
          styles.input,
          {
            color: theme.colors.text,
            height: Math.min(Math.max(ms(40), height), ms(120)),
          },
        ]}
        value={text}
        onChangeText={setText}
        placeholder={placeholder ?? 'Ask about your operations…'}
        placeholderTextColor={theme.colors.textHint}
        multiline
        onContentSizeChange={(e: { nativeEvent: { contentSize: { height: number } } }) =>
          setHeight(e.nativeEvent.contentSize.height + ms(16))
        }
        editable={!busy}
        returnKeyType="default"
      />
      {busy ? (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.colors.error.main }]}
          onPress={onStop}
          activeOpacity={0.8}
        >
          <Icon name="stop" size={ms(18)} color="#FFFFFF" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[
            styles.btn,
            { backgroundColor: canSend ? theme.colors.primary.main : theme.colors.border },
          ]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.8}
        >
          <Icon name="arrow-up" size={ms(20)} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: ms(24),
    paddingLeft: spacing.md,
    paddingRight: ms(5),
    paddingVertical: ms(5),
  },
  input: {
    flex: 1,
    fontSize: fontSizes.md,
    paddingTop: Platform.OS === 'ios' ? ms(10) : ms(6),
    paddingBottom: Platform.OS === 'ios' ? ms(8) : ms(6),
    paddingRight: spacing.sm,
    maxHeight: ms(120),
  },
  btn: {
    width: ms(38),
    height: ms(38),
    borderRadius: ms(19),
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AiChatInput;
