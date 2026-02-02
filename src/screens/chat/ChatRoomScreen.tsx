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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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

// Helper to format date for separators
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

// Helper to check if two dates are on different days
const isDifferentDay = (date1: string, date2: string): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() !== d2.getFullYear() ||
    d1.getMonth() !== d2.getMonth() ||
    d1.getDate() !== d2.getDate()
  );
};

// Helper to check if messages should be grouped (same sender within 2 minutes)
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

  const { roomId, roomName, chatId, orderId } = route.params;
  const { messages, isLoading, sendMessage, isSending, loadMore, refetch, isRealtimeConnected } = useChatMessages({
    chatId,
    orderId,
  });
  const { typingUsers, setTyping } = useTypingIndicator(roomId);

  const themeColors = isDark ? colors.dark : colors.light;

  // Process messages to add grouping and date separators
  const processedMessages = useMemo((): ProcessedMessage[] => {
    if (!messages || messages.length === 0) return [];

    const result: ProcessedMessage[] = [];
    const currentNewMessageIds = new Set<string>();

    // Track new messages for animation
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

      // Check if we need a date separator
      const showDateSeparator = !prevMsg || isDifferentDay(prevMsg.created_at, msg.created_at);
      const dateSeparatorText = showDateSeparator ? formatDateSeparator(msg.created_at) : '';

      // Check grouping
      const isFirstInGroup = !prevMsg ||
        !shouldGroupMessages(prevMsg, msg) ||
        isDifferentDay(prevMsg.created_at, msg.created_at);
      const isLastInGroup = !nextMsg ||
        !shouldGroupMessages(msg, nextMsg) ||
        isDifferentDay(msg.created_at, nextMsg.created_at);

      // Determine delivery status for own messages
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

    // Update new message IDs and clear after animation
    if (currentNewMessageIds.size > 0) {
      setNewMessageIds(currentNewMessageIds);
      setTimeout(() => {
        setNewMessageIds(new Set());
      }, 500);
    }

    return result;
  }, [messages, newMessageIds]);

  // Auto-scroll to end when new messages arrive
  useEffect(() => {
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];

      // Check if this is a new message (different from last tracked message)
      if (lastMessage && lastMessage.id !== lastMessageIdRef.current) {
        const isNewMessage = lastMessageIdRef.current !== null; // Not the initial load
        lastMessageIdRef.current = lastMessage.id;

        if (isNewMessage) {
          // Scroll to end with a small delay to ensure the message is rendered
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 150);
        }
      }
    }
  }, [messages]);

  // Scroll to end when keyboard opens to ensure input is visible
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  const handleSend = useCallback(
    async (content: string, images?: ImageAttachment[]) => {
      console.log('[ChatRoom] handleSend called:', { content, imagesCount: images?.length });
      try {
        await sendMessage(content, images);
        console.log('[ChatRoom] Message sent successfully');
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } catch (error) {
        console.error('[ChatRoom] handleSend error:', error);
      }
    },
    [sendMessage]
  );

  const handleTyping = useCallback(() => {
    setTyping(true);
  }, [setTyping]);

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
      <View style={[styles.emptyIconContainer, { backgroundColor: themeColors.card }]}>
        <Icon name="chat-processing-outline" size={ms(56)} color={colors.primary.main} />
      </View>
      <Text variant="h4" style={[styles.emptyTitle, { color: themeColors.text.primary }]}>
        Start the Conversation
      </Text>
      <Text variant="body" color="hint" style={styles.emptyText}>
        Send a message to begin chatting about this order
      </Text>
      <View style={styles.emptyHints}>
        <View style={styles.emptyHint}>
          <Icon name="clock-outline" size={ms(16)} color={themeColors.text.hint} />
          <Text variant="caption" color="hint" style={styles.emptyHintText}>
            Messages are delivered in real-time
          </Text>
        </View>
        <View style={styles.emptyHint}>
          <Icon name="bell-outline" size={ms(16)} color={themeColors.text.hint} />
          <Text variant="caption" color="hint" style={styles.emptyHintText}>
            You'll be notified of new messages
          </Text>
        </View>
      </View>
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
      <SafeAreaView
        style={[styles.container, { backgroundColor: themeColors.background }]}
        edges={['top']}
      >
        <ChatHeader
          title={roomName}
          subtitle="Loading..."
          onBack={() => navigation.goBack()}
        />
        <View style={[styles.loadingContainer, { paddingBottom: insets.bottom }]}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text variant="body" color="hint" style={styles.loadingText}>
            Loading messages...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top']}
    >
      <ChatHeader
        title={roomName}
        subtitle={isRealtimeConnected ? 'Online' : 'Connecting...'}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
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
          onContentSizeChange={() => {
            if (processedMessages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          onLayout={() => {
            if (processedMessages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          ListEmptyComponent={renderEmpty}
          ListHeaderComponent={renderHeader}
          inverted={false}
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
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
          }}
        />

        {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}

        <View style={{ paddingBottom: insets.bottom }}>
          <MessageInput
            onSend={handleSend}
            onTyping={handleTyping}
            isSending={isSending}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
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
    paddingVertical: spacing.sm,
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
    borderRadius: ms(50),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyHints: {
    gap: spacing.sm,
  },
  emptyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyHintText: {
    fontSize: ms(12),
  },
  listHeader: {
    paddingBottom: spacing.sm,
  },
  loadMoreContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});

export default ChatRoomScreen;
