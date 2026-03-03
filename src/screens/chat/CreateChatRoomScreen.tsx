import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon } from '../../components/common';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing, ms, vs } from '../../utils/responsive';
import { useChatRooms } from '../../hooks/useChatRooms';
import { ChatStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<ChatStackParamList>;
type RouteParams = RouteProp<ChatStackParamList, 'CreateChatRoom'>;

export const CreateChatRoomScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { getOrCreateRoom } = useChatRooms();

  const initialOrderId = route.params?.orderId?.toString() || '';
  const [orderId, setOrderId] = useState(initialOrderId);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const themeColors = isDark ? colors.dark : colors.light;

  const handleCreate = useCallback(async () => {
    const orderIdNum = parseInt(orderId.trim(), 10);
    if (!orderId.trim() || isNaN(orderIdNum)) {
      setError(t('chat.orderIdRequired', 'Order ID is required'));
      return;
    }

    setError('');
    setIsCreating(true);

    try {
      const room = await getOrCreateRoom(orderIdNum);

      navigation.replace('ChatRoom', {
        roomId: room.id,
        roomName: room.name,
        chatId: Number(room.id),
        orderId: room.order_id,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open chat';
      setError(errorMessage || t('chat.createError', 'Failed to open chat'));
      setIsCreating(false);
    }
  }, [orderId, getOrCreateRoom, navigation, t]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const canCreate = orderId.trim().length > 0 && !isCreating;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top', 'bottom']}
    >
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleCancel}
          disabled={isCreating}
          activeOpacity={0.7}
        >
          <Text
            variant="body"
            style={{
              color: isCreating
                ? themeColors.text.hint
                : colors.primary.main,
            }}
          >
            {t('chat.cancel', 'Cancel')}
          </Text>
        </TouchableOpacity>

        <Text variant="h4" color="primary">
          {t('chat.openOrderChat', 'Order Chat')}
        </Text>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleCreate}
          disabled={!canCreate}
          activeOpacity={0.7}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color={colors.primary.main} />
          ) : (
            <Text
              variant="body"
              style={{
                color: canCreate
                  ? colors.primary.main
                  : themeColors.text.hint,
                fontWeight: '600',
              }}
            >
              {t('chat.open', 'Open')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconContainer}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.primary.main + '20' },
              ]}
            >
              <Icon
                name="chat-plus-outline"
                size={ms(48)}
                color={colors.primary.main}
              />
            </View>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text variant="label" color="secondary" style={styles.label}>
                {t('chat.orderId', 'Order ID')} *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: themeColors.card,
                    borderColor: error ? colors.error.main : themeColors.border,
                    color: themeColors.text.primary,
                  },
                ]}
                placeholder={t('chat.orderIdPlaceholder', 'Enter order ID')}
                placeholderTextColor={themeColors.text.hint}
                value={orderId}
                onChangeText={(text) => {

                  const numericText = text.replace(/[^0-9]/g, '');
                  setOrderId(numericText);
                  setError('');
                }}
                maxLength={20}
                keyboardType="numeric"
                autoFocus
                editable={!isCreating}
              />
              {error ? (
                <Text variant="caption" style={styles.errorText}>
                  {error}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.info}>
            <Icon
              name="information-outline"
              size={ms(16)}
              color={themeColors.text.hint}
            />
            <Text variant="caption" color="hint" style={styles.infoText}>
              {t(
                'chat.orderChatInfo',
                'Enter an order ID to open or create a chat for that order. All order participants will be able to see the messages.'
              )}
            </Text>
          </View>
        </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: vs(12),
    borderBottomWidth: 1,
  },
  headerButton: {
    paddingVertical: vs(8),
    paddingHorizontal: spacing.sm,
    minWidth: ms(60),
    alignItems: 'center',
  },
  content: {
    padding: spacing.lg,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: ms(100),
    height: ms(100),
    borderRadius: ms(50),
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    gap: spacing.lg,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    marginLeft: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: ms(12),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: ms(15),
  },
  errorText: {
    color: colors.error.main,
    marginLeft: spacing.xs,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  infoText: {
    flex: 1,
    marginLeft: spacing.sm,
    lineHeight: ms(18),
  },
});

export default CreateChatRoomScreen;
