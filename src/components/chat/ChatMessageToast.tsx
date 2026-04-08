import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../common';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { ms } from '../../utils/responsive';
import { ChatToastData } from '../../store/chatStore';

interface ChatMessageToastProps {
  data: ChatToastData | null;
  visible: boolean;
  onPress?: (data: ChatToastData) => void;
  onDismiss?: () => void;
  duration?: number;
}

export const ChatMessageToast: React.FC<ChatMessageToastProps> = ({
  data,
  visible,
  onPress,
  onDismiss,
  duration = 3000,
}) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible && data) {
      // Slide in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, data]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -150,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  };

  const handlePress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    handleDismiss();
    if (data) onPress?.(data);
  };

  if (!data) return null;

  const bgColor = isDark ? '#1E293B' : '#FFFFFF';
  const borderColor = isDark ? '#334155' : '#E2E8F0';
  const senderColor = isDark ? '#F1F5F9' : '#1E293B';
  const messageColor = isDark ? '#94A3B8' : '#64748B';
  const orderColor = colors.primary.main;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + ms(4),
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={[
          styles.toast,
          {
            backgroundColor: bgColor,
            borderColor,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
              },
              android: {
                elevation: 8,
              },
            }),
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${orderColor}15` }]}>
          <Icon name="chat" size={ms(18)} color={orderColor} />
        </View>
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text
              style={[styles.orderText, { color: orderColor }]}
              numberOfLines={1}
            >
              Order {data.orderCode}
            </Text>
          </View>
          <Text
            style={[styles.senderText, { color: senderColor }]}
            numberOfLines={1}
          >
            {data.senderName}
          </Text>
          <Text
            style={[styles.messageText, { color: messageColor }]}
            numberOfLines={1}
          >
            {data.messagePreview}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="close" size={ms(16)} color={messageColor} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: ms(12),
    right: ms(12),
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(12),
    borderRadius: ms(12),
    borderWidth: 1,
  },
  iconContainer: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ms(10),
  },
  content: {
    flex: 1,
    marginRight: ms(8),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ms(2),
  },
  orderText: {
    fontSize: ms(11),
    fontWeight: '600',
  },
  senderText: {
    fontSize: ms(13),
    fontWeight: '700',
    marginBottom: ms(1),
  },
  messageText: {
    fontSize: ms(12),
  },
});

export default ChatMessageToast;
