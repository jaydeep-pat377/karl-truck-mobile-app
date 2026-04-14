import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Keyboard,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
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
import { initMessageSound, playMessageSound, isSoundReady } from '../../utils/notificationSound';

type RouteParams = RouteProp<RootStackParamList, 'ChatRoom'>;

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

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());

  const previousMessageCountRef = useRef(0);
  const lastMessageIdRef = useRef<string | null>(null);

  const { roomId, roomName, chatId, orderId, orderDate, customerName, projectName, deliveryAddress } = route.params;
  const { messages, isLoading, sendMessage, isSending, loadMore, refetch } = useChatMessages({
    chatId,
    orderId,
  });
  const { typingUsers, setTyping } = useTypingIndicator(roomId);
  const themeColors = isDark ? colors.dark : colors.light;

  useEffect(() => {
    initMessageSound().then((success) => {
    });
  }, []);


  const prevMessagesLengthRef = useRef(messages?.length || 0);
  useEffect(() => {
    if (!messages) return;
    if (messages.length > prevMessagesLengthRef.current) {
      const newMessages = messages.slice(prevMessagesLengthRef.current);

      newMessages.forEach((msg) => {
        if (msg.sender_id !== user?.id && !msg.id.startsWith('temp-')) {
          playMessageSound();
        }
      });
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages, user?.id]);

  // Scroll the message list to the end when the keyboard appears, so the
  // most recent messages stay visible above the keyboard. Keyboard layout
  // itself is handled entirely by Android's windowSoftInputMode="adjustResize"
  // (and the OS on iOS) — no manual padding toggling here. Mixing manual
  // padding with adjustResize + KeyboardAvoidingView caused double/triple
  // compensation and device-specific layout glitches.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const showSubscription = Keyboard.addListener(showEvent, () => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => {
      showSubscription.remove();
    };
  }, []);

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

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}>
        <StatusBar backgroundColor={themeColors.background} barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ChatHeader
          title={roomName}
          onBack={() => navigation.goBack()}
          orderDate={orderDate}
          customerName={customerName}
          projectName={projectName}
          deliveryAddress={deliveryAddress}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text variant="body" color="hint" style={styles.loadingText}>Loading messages...</Text>
        </View>
      </View>
    );
  }

  const chatContent = (
    <>
      <View style={[styles.messagesWrapper, { backgroundColor: isDark ? colors.chat.dark.messageArea : colors.chat.light.messageArea }]}>
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
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
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
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
        {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}
      </View>
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: themeColors.background,
            // Only padding we need is the home-indicator safe area. The
            // keyboard itself is handled by adjustResize; don't toggle
            // this with a state, that was the root cause of the glitch.
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <MessageInput
          onSend={handleSend}
          onTyping={handleTyping}
          isSending={isSending}
        />
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar
        backgroundColor={colors.primary.main}
        barStyle="light-content"
      />
      <View style={[styles.statusBarBackground, { height: insets.top, backgroundColor: colors.primary.main }]} />
      {/*
        Using react-native-keyboard-controller's KeyboardAvoidingView.
        Unlike React Native's built-in KAV (which uses JS-thread state
        and races with Android's adjustResize), this one runs on the
        native thread via Reanimated, so it stays perfectly in sync
        with the keyboard animation on every device and both platforms.
      */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <ChatHeader
          title={roomName}
          onBack={() => navigation.goBack()}
          orderDate={orderDate}
          customerName={customerName}
          projectName={projectName}
          deliveryAddress={deliveryAddress}
        />
        {chatContent}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBarBackground: {
    width: '100%',
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
    borderTopColor: colors.semiTransparent.black10,
  },
});

export default ChatRoomScreen;
