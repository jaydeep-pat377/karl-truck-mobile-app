import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Image, TouchableOpacity, Modal, Dimensions, Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon } from '../common';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';
import { Message } from '../../types/chat';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BUBBLE_COLORS = {
  sent: {
    light: colors.chat.light.sentBubble,
    dark: colors.chat.dark.sentBubble,
  },
  received: {
    light: colors.chat.light.receivedBubble,
    dark: colors.chat.dark.receivedBubble,
  },
};

interface Attachment {
  url?: string;
  type?: string;
  name?: string;
  file_url?: string;
  image_url?: string;
  path?: string;
}

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showAvatar?: boolean;
  showSenderName?: boolean;
  showDateSeparator?: boolean;
  dateSeparatorText?: string;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'read';
  isNewMessage?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage,
  showAvatar = true,
  showSenderName = true,
  showDateSeparator = false,
  dateSeparatorText = '',
  isFirstInGroup = true,
  isLastInGroup = true,
  deliveryStatus = 'sent',
  isNewMessage = false,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const fadeAnim = useRef(new Animated.Value(isNewMessage ? 0 : 1)).current;
  const scaleAnim = useRef(new Animated.Value(isNewMessage ? 0.8 : 1)).current;
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<Set<string>>(new Set());

  const bubbleColor = isOwnMessage
    ? (isDark ? BUBBLE_COLORS.sent.dark : BUBBLE_COLORS.sent.light)
    : (isDark ? BUBBLE_COLORS.received.dark : BUBBLE_COLORS.received.light);

  const textColor = isDark ? colors.chat.dark.textPrimary : colors.chat.light.textPrimary;
  const timeColor = isDark ? colors.chat.dark.timeText : colors.chat.light.timeText;

  const getAudioInfo = (): { url: string; duration: number } | null => {
    if (message.message_type !== 'audio' || !message.attachments || !Array.isArray(message.attachments)) {
      return null;
    }
    const attachment = message.attachments[0] as any;
    if (!attachment) return null;
    const url = attachment.url || attachment.file_url || attachment.path || '';
    const duration = attachment.duration || 0;
    if (!url) return null;
    return { url, duration };
  };

  const audioInfo = getAudioInfo();

  const getImageUrls = (): string[] => {
    if (message.message_type === 'audio') return [];
    if (!message.attachments || !Array.isArray(message.attachments)) {
      return [];
    }
    return message.attachments
      .map((attachment: Attachment | string) => {
        if (typeof attachment === 'string') return attachment;
        return attachment.url || attachment.file_url || attachment.image_url || attachment.path || null;
      })
      .filter((url): url is string => {
        if (!url) return false;
        const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)($|\?)/i.test(url) ||
          url.includes('/storage/') || url.includes('supabase') || message.message_type === 'image';
        return isImage;
      });
  };

  const imageUrls = getImageUrls();

  useEffect(() => {
    if (isNewMessage) {
      Animated.parallel([
        Animated.spring(fadeAnim, {
          toValue: 1,
          damping: 15,
          stiffness: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 12,
          stiffness: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isNewMessage, fadeAnim, scaleAnim]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => {
    if (!name || name === 'Unknown' || name === 'User') return '?';
    return name.split(' ').map((n) => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || '?';
  };

  const getDeliveryIcon = () => {
    const iconColor = isOwnMessage
      ? (deliveryStatus === 'read' ? colors.chat.readTick : timeColor)
      : timeColor;

    switch (deliveryStatus) {
      case 'sending':
        return <Icon name="clock-outline" size={ms(14)} color={timeColor} />;
      case 'sent':
        return <Icon name="check" size={ms(14)} color={iconColor} />;
      case 'delivered':
      case 'read':
        return <Icon name="check-all" size={ms(14)} color={iconColor} />;
      default:
        return null;
    }
  };

  const getBubbleRadius = () => {
    const radius = ms(16);
    const smallRadius = ms(4);

    if (isOwnMessage) {
      return {
        borderTopLeftRadius: radius,
        borderTopRightRadius: radius,
        borderBottomLeftRadius: radius,
        borderBottomRightRadius: isLastInGroup ? smallRadius : radius,
      };
    }
    return {
      borderTopLeftRadius: radius,
      borderTopRightRadius: radius,
      borderBottomLeftRadius: isLastInGroup ? smallRadius : radius,
      borderBottomRightRadius: radius,
    };
  };

  if (message.message_type === 'system') {
    return (
      <View style={styles.systemContainer}>
        <View style={[styles.systemBadge, { backgroundColor: isDark ? colors.chat.dark.inputBg : colors.chat.light.inputBg }]}>
          <Text style={[styles.systemText, { color: isDark ? colors.text.lightMuted : colors.semiTransparent.black50 }]}>
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      {showDateSeparator && (
        <View style={styles.dateSeparatorContainer}>
          <View style={[styles.dateSeparatorBadge, { backgroundColor: isDark ? colors.chat.dark.inputBg : colors.chat.light.inputBg }]}>
            <Text style={[styles.dateSeparatorText, { color: isDark ? colors.headerOverlay.textBright : colors.semiTransparent.black50 }]}>
              {dateSeparatorText}
            </Text>
          </View>
        </View>
      )}

      <Animated.View
        style={[
          styles.container,
          isOwnMessage ? styles.ownContainer : styles.otherContainer,
          !isLastInGroup && styles.groupedContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {isFirstInGroup && showSenderName && (
          <View style={[
            styles.senderNameRow,
            isOwnMessage ? styles.senderNameRowOwn : styles.senderNameRowOther,
          ]}>
            <Text style={[
              styles.senderName,
              isOwnMessage ? styles.senderNameOwn : styles.senderNameOther,
              { color: isOwnMessage ? colors.primary.main : colors.secondary.main },
            ]}>
              {isOwnMessage ? `${message.sender_name} (you)` : message.sender_name}
            </Text>
          </View>
        )}

        <View style={[
          styles.messageRow,
          isOwnMessage ? styles.messageRowOwn : styles.messageRowOther,
        ]}>
          {!isOwnMessage && (
            <View style={styles.avatarContainer}>
              {isLastInGroup ? (
                <View style={[styles.avatar, { backgroundColor: colors.secondary.main }]}>
                  <Text style={styles.avatarText}>{getInitials(message.sender_name)}</Text>
                </View>
              ) : (
                <View style={styles.avatarPlaceholder} />
              )}
            </View>
          )}

          <View style={[styles.bubbleWrapper, isOwnMessage ? styles.ownBubbleWrapper : styles.otherBubbleWrapper]}>
            <View style={[styles.bubble, { backgroundColor: bubbleColor }, getBubbleRadius()]}>
              {imageUrls.length > 0 && (
                <View style={styles.imagesContainer}>
                  {imageUrls.map((imageUrl, index) => (
                    <TouchableOpacity
                      key={`${imageUrl}-${index}`}
                      onPress={() => setSelectedImage(imageUrl)}
                      activeOpacity={0.9}
                    >
                      {imageError.has(imageUrl) ? (
                        <View style={[styles.imageError, { backgroundColor: isDark ? colors.chat.dark.inputBg : colors.semiTransparent.black05 }]}>
                          <Icon name="image-off-outline" size={ms(28)} color={timeColor} />
                        </View>
                      ) : (
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.messageImage}
                          resizeMode="cover"
                          onError={() => setImageError(prev => new Set(prev).add(imageUrl))}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {audioInfo && (
                <VoiceMessagePlayer
                  audioUrl={audioInfo.url}
                  duration={audioInfo.duration}
                  isOwnMessage={isOwnMessage}
                />
              )}

              {message.content && message.content.trim().length > 0 && (
                <Text style={[styles.content, { color: textColor }, imageUrls.length > 0 && styles.contentWithImage]}>
                  {message.content}
                </Text>
              )}

              <View style={styles.metaRow}>
                <Text style={[styles.time, { color: timeColor }]}>
                  {formatTime(message.created_at)}
                </Text>
                {isOwnMessage && (
                  <View style={styles.statusIcon}>
                    {getDeliveryIcon()}
                  </View>
                )}
              </View>
            </View>
          </View>

          {isOwnMessage && (
            <View style={styles.avatarContainerOwn}>
              {isLastInGroup ? (
                <View style={[styles.avatar, { backgroundColor: colors.primary.main }]}>
                  <Text style={styles.avatarText}>{getInitials(message.sender_name)}</Text>
                </View>
              ) : (
                <View style={styles.avatarPlaceholder} />
              )}
            </View>
          )}
        </View>
      </Animated.View>

      <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedImage(null)}>
            <View style={styles.modalCloseBtn}>
              <Icon name="close" size={ms(24)} color={colors.common.white} />
            </View>
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    marginBottom: ms(16),
    width: '100%',
  },
  groupedContainer: {
    marginBottom: ms(4),
  },
  ownContainer: {
    alignItems: 'flex-end',
  },
  otherContainer: {
    alignItems: 'flex-start',
  },
  senderNameRow: {
    flexDirection: 'row',
    marginBottom: ms(2),
    paddingHorizontal: spacing.sm,
  },
  senderNameRowOwn: {
    justifyContent: 'flex-end',
    paddingRight: ms(38) + spacing.sm,
  },
  senderNameRowOther: {
    justifyContent: 'flex-start',
    paddingLeft: ms(38) + spacing.sm,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: ms(32),
    marginRight: ms(6),
  },
  avatarContainerOwn: {
    width: ms(32),
    marginLeft: ms(6),
  },
  avatar: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: ms(28),
    height: ms(28),
  },
  avatarText: {
    color: colors.common.white,
    fontSize: ms(11),
    fontWeight: '600',
  },
  bubbleWrapper: {
    maxWidth: '75%',
  },
  ownBubbleWrapper: {
    alignItems: 'flex-end',
  },
  otherBubbleWrapper: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: ms(12),
    fontWeight: '600',
  },
  senderNameOwn: {
    textAlign: 'right',
  },
  senderNameOther: {
    textAlign: 'left',
  },
  bubble: {
    paddingHorizontal: ms(6),
    paddingTop: ms(6),
    paddingBottom: ms(2),
    minWidth: ms(70),
    ...Platform.select({
      ios: {
        shadowColor: colors.common.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  content: {
    fontSize: ms(15),
    lineHeight: ms(20),
    letterSpacing: -0.1,
  },
  contentWithImage: {
    marginTop: ms(6),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: ms(3),
    gap: ms(4),
  },
  time: {
    fontSize: ms(11),
    fontWeight: '400',
  },
  statusIcon: {
    marginLeft: ms(2),
  },

  imagesContainer: {
    marginBottom: ms(4),
    gap: ms(4),
  },
  messageImage: {
    width: ms(240),
    height: ms(180),
    borderRadius: ms(10),
    backgroundColor: colors.semiTransparent.black10,
  },
  imageError: {
    width: ms(240),
    height: ms(120),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
  },

  systemContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  systemBadge: {
    paddingHorizontal: ms(14),
    paddingVertical: ms(6),
    borderRadius: ms(18),
  },
  systemText: {
    fontSize: ms(12),
    fontWeight: '500',
  },

  dateSeparatorContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dateSeparatorBadge: {
    paddingHorizontal: ms(14),
    paddingVertical: ms(6),
    borderRadius: ms(18),
  },
  dateSeparatorText: {
    fontSize: ms(12),
    fontWeight: '600',
  },

  modalContainer: {
    flex: 1,
    backgroundColor: colors.semiTransparent.black95,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: ms(50),
    right: ms(16),
    zIndex: 10,
  },
  modalCloseBtn: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    backgroundColor: colors.semiTransparent.white20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
});

export default MessageBubble;
