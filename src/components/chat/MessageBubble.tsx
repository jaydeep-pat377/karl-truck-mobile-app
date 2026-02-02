import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Image, TouchableOpacity, Modal, Dimensions, Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon } from '../common';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';
import { Message } from '../../types/chat';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Message bubble colors
const BUBBLE_COLORS = {
  sent: {
    light: '#DCF8C6',
    dark: '#005C4B',
  },
  received: {
    light: '#FFFFFF',
    dark: '#1F2C34',
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

  // Get bubble color based on sender and theme
  const bubbleColor = isOwnMessage
    ? (isDark ? BUBBLE_COLORS.sent.dark : BUBBLE_COLORS.sent.light)
    : (isDark ? BUBBLE_COLORS.received.dark : BUBBLE_COLORS.received.light);

  // Text color
  const textColor = isDark ? '#E9EDEF' : '#111B21';
  const timeColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)';

  // Extract image URLs from attachments
  const getImageUrls = (): string[] => {
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

  // Animate new messages
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
      ? (deliveryStatus === 'read' ? '#53BDEB' : timeColor)
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

  // Bubble corner radius - clean rounded corners
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

  // System message
  if (message.message_type === 'system') {
    return (
      <View style={styles.systemContainer}>
        <View style={[styles.systemBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
          <Text style={[styles.systemText, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }]}>
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      {/* Date Separator */}
      {showDateSeparator && (
        <View style={styles.dateSeparatorContainer}>
          <View style={[styles.dateSeparatorBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
            <Text style={[styles.dateSeparatorText, { color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)' }]}>
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
        {/* Avatar for received messages */}
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
          {/* Sender name */}
          {!isOwnMessage && isFirstInGroup && (
            <Text style={[styles.senderName, { color: colors.secondary.main }]}>
              {message.sender_name}
            </Text>
          )}

          {/* Bubble */}
          <View style={[styles.bubble, { backgroundColor: bubbleColor }, getBubbleRadius()]}>
            {/* Images */}
            {imageUrls.length > 0 && (
              <View style={styles.imagesContainer}>
                {imageUrls.map((imageUrl, index) => (
                  <TouchableOpacity
                    key={`${imageUrl}-${index}`}
                    onPress={() => setSelectedImage(imageUrl)}
                    activeOpacity={0.9}
                  >
                    {imageError.has(imageUrl) ? (
                      <View style={[styles.imageError, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
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

            {/* Text content */}
            {message.content && message.content.trim().length > 0 && (
              <Text style={[styles.content, { color: textColor }, imageUrls.length > 0 && styles.contentWithImage]}>
                {message.content}
              </Text>
            )}

            {/* Time and status */}
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
      </Animated.View>

      {/* Full screen image modal */}
      <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedImage(null)}>
            <View style={styles.modalCloseBtn}>
              <Icon name="close" size={ms(24)} color="#FFF" />
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
    flexDirection: 'row',
    marginBottom: ms(2),
    paddingHorizontal: spacing.sm,
    alignItems: 'flex-end',
  },
  groupedContainer: {
    marginBottom: ms(1),
  },
  ownContainer: {
    justifyContent: 'flex-end',
  },
  otherContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: ms(32),
    marginRight: ms(6),
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
    color: '#FFF',
    fontSize: ms(11),
    fontWeight: '600',
  },
  bubbleWrapper: {
    maxWidth: '80%',
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
    marginBottom: ms(2),
    marginLeft: ms(8),
  },
  bubble: {
    paddingHorizontal: ms(12),
    paddingTop: ms(8),
    paddingBottom: ms(6),
    minWidth: ms(70),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
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
  // Images
  imagesContainer: {
    marginBottom: ms(4),
    gap: ms(4),
  },
  messageImage: {
    width: ms(240),
    height: ms(180),
    borderRadius: ms(10),
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  imageError: {
    width: ms(240),
    height: ms(120),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  // System message
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
  // Date separator
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
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
});

export default MessageBubble;
