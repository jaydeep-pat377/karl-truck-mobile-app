/**
 * ChatRoomScreen - Production-Ready Chat with Keyboard Handling
 *
 * KEYBOARD HANDLING EXPLANATION:
 *
 * Problem: When keyboard opens, the TextInput at bottom gets hidden behind keyboard
 *
 * Solution differs by platform:
 *
 * iOS:
 * - Uses KeyboardAvoidingView with behavior="padding"
 * - keyboardVerticalOffset accounts for header height + safe area
 * - Uses 'keyboardWillShow'/'keyboardWillHide' for smoother animations
 * - Needs explicit paddingBottom for home indicator when keyboard is closed
 *
 * Android:
 * - Relies on android:windowSoftInputMode="adjustResize" in AndroidManifest.xml
 * - This automatically resizes the window when keyboard appears
 * - KeyboardAvoidingView with behavior="height" as fallback
 * - Uses 'keyboardDidShow'/'keyboardDidHide' events
 *
 * Key Props:
 * - keyboardShouldPersistTaps="handled" - allows tapping messages while keyboard open
 * - keyboardDismissMode="interactive" - smooth dismiss on scroll (iOS)
 */

import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Keyboard,
  StatusBar,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon } from '../../components/common';
import {
  MessageBubble,
  MessageInput,
  ChatHeader,
  TypingIndicator,
  ImageAttachment,
} from '../../components/chat';
import { colors } from '../../theme/colors';
import { spacing, ms } from '../../utils/responsive';
import { useChatMessages } from '../../hooks/useChatMessages';
import { useTypingIndicator } from '../../hooks/useTypingIndicator';
import { RootStackParamList } from '../../navigation/types';
import { Message } from '../../types/chat';
import { useAuthStore } from '../../store/authStore';

type RouteParams = RouteProp<RootStackParamList, 'ChatRoom'>;

// Header height constant - adjust if your header height differs
const HEADER_HEIGHT = ms(56);

const formatDateSeparator = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (messageDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }
};

const isDifferentDay = (date1: string, date2: string): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() !== d2.getFullYear() ||
    d1.getMonth() !== d2.getMonth() ||
    d1.getDate() !== d2.getDate()
  );
};

const shouldGroupMessages = (msg1: Message, msg2: Message): boolean => {
  if (msg1.sender_id !== msg2.sender_id) return false;
  const time1 = new Date(msg1.created_at).getTime();
  const time2 = new Date(msg2.created_at).getTime();
  const diffMinutes = Math.abs(time2 - time1) / (1000 * 60);
  return diffMinutes <= 2;
};

interface ProcessedMessage extends Message {
  showDateSeparator: boolean;
  dateSeparatorText: string;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  deliveryStatus: 'sending' | 'sent' | 'delivered' | 'read';
  isNewMessage: boolean;
}

export const ChatRoomScreen: React.FC = () => {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation();
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  // State
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Refs for tracking
  const previousMessageCountRef = useRef(0);
  const lastMessageIdRef = useRef<string | null>(null);

  // Animated value for smooth keyboard transitions (optional enhancement)
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  const { roomId, roomName, chatId, orderId } = route.params;
  const { messages, isLoading, sendMessage, isSending, loadMore, refetch } = useChatMessages({
    chatId,
    orderId,
  });
  const { typingUsers, setTyping } = useTypingIndicator(roomId);

  const themeColors = isDark ? colors.dark : colors.light;

  /**
   * KEYBOARD EVENT LISTENERS
   *
   * iOS: Uses 'keyboardWillShow/Hide' for animations that start BEFORE keyboard appears
   * Android: Uses 'keyboardDidShow/Hide' as 'will' events aren't reliable on Android
   *
   * We track keyboard visibility to:
   * 1. Adjust bottom padding for safe area
   * 2. Auto-scroll to latest message
   */
  useEffect(() => {
    const keyboardWillShowEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const keyboardWillHideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(keyboardWillShowEvent, (event) => {
      setIsKeyboardVisible(true);

      // Animate keyboard height for smooth transitions (iOS)
      if (Platform.OS === 'ios') {
        Animated.timing(keyboardHeight, {
          toValue: event.endCoordinates.height,
          duration: event.duration || 250,
          useNativeDriver: false,
        }).start();
      }

      // Auto-scroll to bottom when keyboard opens
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const hideSubscription = Keyboard.addListener(keyboardWillHideEvent, (event) => {
      setIsKeyboardVisible(false);

      // Animate keyboard height back to 0
      if (Platform.OS === 'ios') {
        Animated.timing(keyboardHeight, {
          toValue: 0,
          duration: event?.duration || 250,
          useNativeDriver: false,
        }).start();
      }
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [keyboardHeight]);

  // Process messages for display
  const processedMessages = useMemo((): ProcessedMessage[] => {
    if (!messages || messages.length === 0) return [];

    const result: ProcessedMessage[] = [];
    const currentNewMessageIds = new Set<string>();

    if (messages.length > previousMessageCountRef.current) {
      const newCount = messages.length - previousMessageCountRef.current;
      for (let i = messages.length - newCount; i < messages.length; i++) {
        if (messages[i] && !messages[i].id.startsWith('temp-')) {
          currentNewMessageIds.add(messages[i].id);
        }
      }
      previousMessageCountRef.current = messages.length;
    }

    messages.forEach((msg, index) => {
      const prevMsg = index > 0 ? messages[index - 1] : null;
      const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;

      const showDateSeparator = !prevMsg || isDifferentDay(prevMsg.created_at, msg.created_at);
      const dateSeparatorText = showDateSeparator ? formatDateSeparator(msg.created_at) : '';

      const isFirstInGroup = !prevMsg ||
        !shouldGroupMessages(prevMsg, msg) ||
        isDifferentDay(prevMsg.created_at, msg.created_at);
      const isLastInGroup = !nextMsg ||
        !shouldGroupMessages(msg, nextMsg) ||
        isDifferentDay(msg.created_at, nextMsg.created_at);

      let deliveryStatus: 'sending' | 'sent' | 'delivered' | 'read' = 'sent';
      if (msg.id.startsWith('temp-')) {
        deliveryStatus = 'sending';
      }

      result.push({
        ...msg,
        showDateSeparator,
        dateSeparatorText,
        isFirstInGroup,
        isLastInGroup,
        deliveryStatus,
        isNewMessage: currentNewMessageIds.has(msg.id) || newMessageIds.has(msg.id),
      });
    });

    if (currentNewMessageIds.size > 0) {
      setNewMessageIds(currentNewMessageIds);
      setTimeout(() => setNewMessageIds(new Set()), 500);
    }

    return result;
  }, [messages, newMessageIds]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.id !== lastMessageIdRef.current) {
        const isNewMessage = lastMessageIdRef.current !== null;
        lastMessageIdRef.current = lastMessage.id;
        if (isNewMessage) {
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
        }
      }
    }
  }, [messages]);

  // Handlers
  const handleSend = useCallback(
    async (content: string, images?: ImageAttachment[]) => {
      try {
        await sendMessage(content, images);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      } catch (error) {
        console.error('[ChatRoom] handleSend error:', error);
      }
    },
    [sendMessage]
  );

  const handleTyping = useCallback(() => setTyping(true), [setTyping]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const handleLoadMore = useCallback(async () => {
    await loadMore();
  }, [loadMore]);

  // Render functions
  const renderMessage = useCallback(
    ({ item }: { item: ProcessedMessage }) => {
      const isOwnMessage = item.sender_id === user?.id;
      return (
        <MessageBubble
          message={item}
          isOwnMessage={isOwnMessage}
          showAvatar={true}
          showSenderName={true}
          showDateSeparator={item.showDateSeparator}
          dateSeparatorText={item.dateSeparatorText}
          isFirstInGroup={item.isFirstInGroup}
          isLastInGroup={item.isLastInGroup}
          deliveryStatus={item.deliveryStatus}
          isNewMessage={item.isNewMessage}
        />
      );
    },
    [user?.id]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? colors.dark.card : colors.common.white }]}>
        <Icon name="chat-processing-outline" size={ms(48)} color={colors.primary.main} />
      </View>
      <Text variant="h3" style={[styles.emptyTitle, { color: themeColors.text.primary }]}>
        Start the Conversation
      </Text>
      <Text variant="body" color="secondary" style={styles.emptyText}>
        Send a message to begin chatting{'\n'}about this order
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {processedMessages.length > 0 && (
        <View style={styles.loadMoreContainer}>
          <Text variant="caption" color="hint">
            Pull down to load older messages
          </Text>
        </View>
      )}
    </View>
  );

  // Calculate keyboard vertical offset for iOS
  // This accounts for: status bar + safe area top + header height
  const keyboardVerticalOffset = Platform.OS === 'ios' ? insets.top + HEADER_HEIGHT : 0;

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}>
        <StatusBar backgroundColor={themeColors.background} barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ChatHeader title={roomName} onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text variant="body" color="hint" style={styles.loadingText}>Loading messages...</Text>
        </View>
      </View>
    );
  }

  /**
   * MAIN RENDER
   *
   * Structure:
   * - Container (flex: 1, paddingTop for status bar)
   *   - ChatHeader (fixed at top)
   *   - KeyboardAvoidingView (flex: 1, handles keyboard)
   *     - Messages FlatList (flex: 1)
   *     - Input Wrapper (with safe area padding when keyboard closed)
   *
   * KeyboardAvoidingView behavior:
   * - iOS: "padding" - adds padding at bottom to push content up
   * - Android: "height" - adjusts height (works with adjustResize)
   */
  return (
    <View style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}>
      <StatusBar
        backgroundColor={themeColors.background}
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />

      {/* Header - Outside KeyboardAvoidingView so it stays fixed */}
      <ChatHeader title={roomName} onBack={() => navigation.goBack()} />

      {/* KeyboardAvoidingView wraps content that should move with keyboard */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        {/* Messages Area */}
        <View style={[styles.messagesWrapper, { backgroundColor: isDark ? '#0D1117' : '#F0F2F5' }]}>
          <FlatList
            ref={flatListRef}
            data={processedMessages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.messageList,
              processedMessages.length === 0 && styles.emptyList,
            ]}
            showsVerticalScrollIndicator={false}
            // Important: Allows tapping on buttons/messages while keyboard is open
            keyboardShouldPersistTaps="handled"
            // iOS: Interactive dismiss allows dragging to dismiss keyboard
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            // Auto-scroll when content changes
            onContentSizeChange={() => {
              if (processedMessages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            ListEmptyComponent={renderEmpty}
            ListHeaderComponent={renderHeader}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary.main}
                colors={[colors.primary.main]}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.1}
            // Performance optimizations
            removeClippedSubviews={Platform.OS === 'android'}
            maxToRenderPerBatch={10}
            windowSize={10}
          />

          {/* Typing Indicator */}
          {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}
        </View>

        {/* Input Area */}
        {/* paddingBottom handles iPhone home indicator when keyboard is closed */}
        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: themeColors.background,
              // Only add bottom padding for home indicator when keyboard is NOT visible
              paddingBottom: isKeyboardVisible ? 0 : insets.bottom,
            },
          ]}
        >
          <MessageInput
            onSend={handleSend}
            onTyping={handleTyping}
            isSending={isSending}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  messagesWrapper: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    marginTop: spacing.sm,
  },
  messageList: {
    paddingVertical: spacing.md,
    flexGrow: 1,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: ms(100),
    height: ms(100),
    borderRadius: ms(28),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary.main,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  emptyTitle: {
    fontWeight: '700',
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: ms(20),
  },
  listHeader: {
    paddingBottom: spacing.sm,
  },
  loadMoreContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  inputWrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
});

export default ChatRoomScreen;
