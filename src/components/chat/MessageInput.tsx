import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon } from '../common';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';

interface MessageInputProps {
  onSend: (message: string) => Promise<void>;
  onTyping?: () => void;
  isSending?: boolean;
  placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onTyping,
  isSending = false,
  placeholder = 'Type a message...',
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handleChangeText = useCallback(
    (text: string) => {
      setMessage(text);
      if (text.length > 0 && onTyping) {
        onTyping();
      }
    },
    [onTyping]
  );

  const handleSend = useCallback(async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending) return;

    // Animate button press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setMessage('');
    try {
      await onSend(trimmedMessage);
    } catch (error) {
      // Restore message on error
      setMessage(trimmedMessage);
      console.log('Failed to send message:', error);
    }
  }, [message, isSending, onSend, scaleAnim]);

  const canSend = message.trim().length > 0 && !isSending;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.background,
          borderTopColor: themeColors.border,
        },
      ]}
    >
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: isDark ? themeColors.cardElevated : colors.grey[5],
            borderColor: isFocused ? colors.primary.main : 'transparent',
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              color: themeColors.text.primary,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={themeColors.text.hint}
          value={message}
          onChangeText={handleChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline
          maxLength={1000}
          editable={!isSending}
        />
      </View>

      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: canSend ? colors.primary.main : themeColors.border,
            },
          ]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={colors.common.white} />
          ) : (
            <Icon
              name="send"
              size={ms(20)}
              color={canSend ? colors.common.white : themeColors.text.hint}
            />
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: ms(24),
    borderWidth: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    minHeight: ms(44),
    maxHeight: ms(120),
  },
  input: {
    flex: 1,
    fontSize: ms(15),
    lineHeight: ms(20),
    paddingTop: Platform.OS === 'ios' ? ms(2) : spacing.xs,
    paddingBottom: Platform.OS === 'ios' ? ms(2) : spacing.xs,
  },
  sendButton: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default MessageInput;
