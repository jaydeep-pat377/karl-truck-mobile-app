import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon } from '../../components/common';
import { ChatRoomCard } from '../../components/chat';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing, ms } from '../../utils/responsive';
import { TAB_BAR_HEIGHT } from '../../components/navigation';
import { useChatRooms } from '../../hooks/useChatRooms';
import { ChatStackParamList } from '../../navigation/types';
import { ChatRoom } from '../../types/chat';

type NavigationProp = NativeStackNavigationProp<ChatStackParamList>;

export const ChatListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { rooms, isLoading, refetch, isRefetching, isConfigured } = useChatRooms();

  const themeColors = isDark ? colors.dark : colors.light;

  if (!isConfigured) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: themeColors.background }]}
        edges={['top', 'bottom']}
      >
        <View style={styles.header}>
          <Text variant="h2">{t('chat.title', 'Messages')}</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Icon name="cog-outline" size={ms(64)} color={themeColors.text.hint} />
          <Text variant="h4" color="secondary" style={styles.emptyTitle}>
            Setup Required
          </Text>
          <Text variant="body" color="hint" style={styles.emptySubtitle}>
            Chat feature requires Supabase configuration. Please add SUPABASE_URL and SUPABASE_ANON_KEY to your environment variables.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleRoomPress = useCallback(
    (room: ChatRoom) => {
      navigation.navigate('ChatRoom', {
        roomId: room.id,
        roomName: room.name,
        chatId: Number(room.id),
        orderId: room.order_id,
        orderDate: room.order_date,
        customerName: room.customer_name,
        projectName: room.project_name,
        deliveryAddress: room.delivery_address,
      });
    },
    [navigation]
  );

  const renderRoom = useCallback(
    ({ item }: { item: ChatRoom }) => (
      <ChatRoomCard room={item} onPress={() => handleRoomPress(item)} />
    ),
    [handleRoomPress]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="chat-outline" size={ms(64)} color={themeColors.text.hint} />
      <Text variant="h4" color="secondary" style={styles.emptyTitle}>
        {t('chat.noChats', 'No Conversations')}
      </Text>
      <Text variant="body" color="hint" style={styles.emptySubtitle}>
        {t('chat.noOrderChats', 'Chats are created when orders have discussions. Visit an order to start chatting.')}
      </Text>
    </View>
  );

  if (isLoading && rooms.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: themeColors.background }]}
        edges={['top', 'bottom']}
      >
        <View style={styles.header}>
          <Text variant="h2">{t('chat.title', 'Messages')}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.header}>
        <Text variant="h2">{t('chat.title', 'Messages')}</Text>
      </View>

      <FlatList
        data={rooms}
        renderItem={renderRoom}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          rooms.length === 0 && styles.emptyList,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary.main}
            colors={[colors.primary.main]}
          />
        }
        ListEmptyComponent={renderEmpty}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: TAB_BAR_HEIGHT + spacing.lg,
  },
  emptyList: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

export default ChatListScreen;
