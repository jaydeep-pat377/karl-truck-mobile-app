import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
  Image,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import ImagePicker from 'react-native-image-crop-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon, Text } from '../common';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';

// Re-export from chatService to maintain single source of truth
import { ImageAttachment } from '../../api/services/chatService';
export type { ImageAttachment };

interface MessageInputProps {
  onSend: (message: string, images?: ImageAttachment[]) => Promise<void>;
  onTyping?: () => void;
  isSending?: boolean;
  placeholder?: string;
}

// Custom Image Picker Modal Component
interface ImagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onCameraPress: () => void;
  onGalleryPress: () => void;
}

const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
  visible,
  onClose,
  onCameraPress,
  onGalleryPress,
}) => {
  const { isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Theme colors
  const modalColors = {
    background: isDark ? '#1C1C1E' : '#FFFFFF',
    surface: isDark ? '#2C2C2E' : '#F5F5F7',
    surfaceHover: isDark ? '#3A3A3C' : '#EBEBED',
    text: isDark ? '#FFFFFF' : '#1C1C1E',
    textSecondary: isDark ? '#8E8E93' : '#6E6E73',
    border: isDark ? '#38383A' : '#E5E5EA',
    divider: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
  };

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          damping: 25,
          stiffness: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 20,
          stiffness: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim, scaleAnim]);

  const modalTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  const handleCameraPress = () => {
    onClose();
    setTimeout(onCameraPress, 350);
  };

  const handleGalleryPress = () => {
    onClose();
    setTimeout(onGalleryPress, 350);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        {/* Backdrop */}
        <Animated.View
          style={[
            modalStyles.backdrop,
            { opacity: backdropAnim },
          ]}
        >
          <Pressable style={modalStyles.backdropPressable} onPress={onClose} />
        </Animated.View>

        {/* Modal Content */}
        <Animated.View
          style={[
            modalStyles.container,
            {
              backgroundColor: modalColors.background,
              transform: [
                { translateY: modalTranslateY },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          {/* Handle Bar */}
          <View style={modalStyles.handleContainer}>
            <View style={[modalStyles.handle, { backgroundColor: modalColors.border }]} />
          </View>

          {/* Header */}
          <View style={modalStyles.header}>
            <View style={modalStyles.headerTextContainer}>
              <Text
                variant="h3"
                style={[modalStyles.title, { color: modalColors.text }]}
              >
                Share Media
              </Text>
              <Text
                variant="body"
                style={[modalStyles.subtitle, { color: modalColors.textSecondary }]}
              >
                Select an option to add images
              </Text>
            </View>
            <TouchableOpacity
              style={[modalStyles.closeButton, { backgroundColor: modalColors.surface }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Icon name="close" size={ms(18)} color={modalColors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={modalStyles.optionsContainer}>
            {/* Camera Option */}
            <TouchableOpacity
              style={[modalStyles.optionCard, { backgroundColor: modalColors.surface }]}
              onPress={handleCameraPress}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#007AFF', '#0055D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={modalStyles.optionIconGradient}
              >
                <Icon name="camera" size={ms(26)} color="#FFFFFF" />
              </LinearGradient>
              <View style={modalStyles.optionContent}>
                <Text
                  variant="body"
                  style={[modalStyles.optionTitle, { color: modalColors.text }]}
                >
                  Camera
                </Text>
                <Text
                  variant="caption"
                  style={[modalStyles.optionDescription, { color: modalColors.textSecondary }]}
                >
                  Take a new photo
                </Text>
              </View>
              <View style={[modalStyles.optionArrow, { backgroundColor: modalColors.surfaceHover }]}>
                <Icon name="chevron-right" size={ms(18)} color={modalColors.textSecondary} />
              </View>
            </TouchableOpacity>

            {/* Gallery Option */}
            <TouchableOpacity
              style={[modalStyles.optionCard, { backgroundColor: modalColors.surface }]}
              onPress={handleGalleryPress}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#34C759', '#248A3D']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={modalStyles.optionIconGradient}
              >
                <Icon name="image-multiple" size={ms(26)} color="#FFFFFF" />
              </LinearGradient>
              <View style={modalStyles.optionContent}>
                <Text
                  variant="body"
                  style={[modalStyles.optionTitle, { color: modalColors.text }]}
                >
                  Photo Library
                </Text>
                <Text
                  variant="caption"
                  style={[modalStyles.optionDescription, { color: modalColors.textSecondary }]}
                >
                  Choose up to 5 photos
                </Text>
              </View>
              <View style={[modalStyles.optionArrow, { backgroundColor: modalColors.surfaceHover }]}>
                <Icon name="chevron-right" size={ms(18)} color={modalColors.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Info Text */}
          <View style={modalStyles.infoContainer}>
            <Icon name="information-outline" size={ms(16)} color={modalColors.textSecondary} />
            <Text
              variant="caption"
              style={[modalStyles.infoText, { color: modalColors.textSecondary }]}
            >
              Images will be compressed for faster upload
            </Text>
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            style={[
              modalStyles.cancelButton,
              {
                backgroundColor: isDark ? 'rgba(255,59,48,0.15)' : 'rgba(255,59,48,0.1)',
              },
            ]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text
              variant="body"
              style={[modalStyles.cancelText, { color: '#FF3B30' }]}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  backdropPressable: {
    flex: 1,
  },
  container: {
    borderTopLeftRadius: ms(28),
    borderTopRightRadius: ms(28),
    paddingBottom: Platform.OS === 'ios' ? ms(40) : ms(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 24,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: ms(12),
    paddingBottom: ms(8),
  },
  handle: {
    width: ms(36),
    height: ms(5),
    borderRadius: ms(3),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: ms(20),
    paddingTop: ms(8),
    paddingBottom: ms(20),
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: ms(24),
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: ms(15),
    marginTop: ms(4),
  },
  closeButton: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: ms(12),
  },
  optionsContainer: {
    paddingHorizontal: ms(16),
    gap: ms(12),
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(16),
    borderRadius: ms(16),
  },
  optionIconGradient: {
    width: ms(52),
    height: ms(52),
    borderRadius: ms(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
    marginLeft: ms(14),
  },
  optionTitle: {
    fontSize: ms(17),
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: ms(13),
    marginTop: ms(2),
  },
  optionArrow: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ms(16),
    gap: ms(6),
  },
  infoText: {
    fontSize: ms(13),
  },
  cancelButton: {
    marginHorizontal: ms(16),
    paddingVertical: ms(16),
    borderRadius: ms(14),
    alignItems: 'center',
  },
  cancelText: {
    fontSize: ms(17),
    fontWeight: '600',
  },
});

// Main MessageInput Component
export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onTyping,
  isSending = false,
  placeholder = 'Type a message...',
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const [message, setMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState<ImageAttachment[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleChangeText = useCallback(
    (text: string) => {
      setMessage(text);
      if (text.length > 0 && onTyping) {
        onTyping();
      }
    },
    [onTyping]
  );

  const openCamera = useCallback(async () => {
    try {
      const image = await ImagePicker.openCamera({
        width: 1200,
        height: 1200,
        cropping: false,
        compressImageQuality: 0.8,
        mediaType: 'photo',
      });

      const attachment: ImageAttachment = {
        uri: image.path,
        type: image.mime || 'image/jpeg',
        name: image.filename || `photo_${Date.now()}.jpg`,
        width: image.width,
        height: image.height,
      };

      setSelectedImages(prev => [...prev, attachment]);
    } catch (error: any) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        console.log('Camera error:', error);
        Alert.alert('Error', 'Failed to open camera. Please check permissions.');
      }
    }
  }, []);

  const openGallery = useCallback(async () => {
    try {
      const images = await ImagePicker.openPicker({
        multiple: true,
        maxFiles: 5,
        width: 1200,
        height: 1200,
        cropping: false,
        compressImageQuality: 0.8,
        mediaType: 'photo',
      });

      const attachments: ImageAttachment[] = images.map((image) => ({
        uri: image.path,
        type: image.mime || 'image/jpeg',
        name: image.filename || `photo_${Date.now()}.jpg`,
        width: image.width,
        height: image.height,
      }));

      setSelectedImages(prev => [...prev, ...attachments].slice(0, 5));
    } catch (error: any) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        console.log('Gallery error:', error);
        Alert.alert('Error', 'Failed to open gallery. Please check permissions.');
      }
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSend = useCallback(async () => {
    const trimmedMessage = message.trim();
    const hasContent = trimmedMessage.length > 0 || selectedImages.length > 0;

    if (!hasContent || isSending || isUploading) {
      return;
    }

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

    const imagesToSend = [...selectedImages];
    setMessage('');
    setSelectedImages([]);

    try {
      setIsUploading(true);
      await onSend(trimmedMessage, imagesToSend.length > 0 ? imagesToSend : undefined);
    } catch (error: any) {
      setMessage(trimmedMessage);
      setSelectedImages(imagesToSend);
      console.error('[MessageInput] Failed to send message:', error);
      Alert.alert('Error', error?.message || 'Failed to send message. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [message, selectedImages, isSending, isUploading, onSend, scaleAnim]);

  const canSend = (message.trim().length > 0 || selectedImages.length > 0) && !isSending && !isUploading;
  const isProcessing = isSending || isUploading;

  return (
    <View style={{ backgroundColor: themeColors.background }}>
      {/* Custom Image Picker Modal */}
      <ImagePickerModal
        visible={showImageModal}
        onClose={() => setShowImageModal(false)}
        onCameraPress={openCamera}
        onGalleryPress={openGallery}
      />

      {/* Selected images preview */}
      {selectedImages.length > 0 && (
        <View style={[styles.previewContainer, { borderTopColor: themeColors.border }]}>
          {selectedImages.map((image, index) => (
            <View key={`${image.uri}-${index}`} style={styles.previewImageContainer}>
              <Image source={{ uri: image.uri }} style={styles.previewImage} />
              <TouchableOpacity
                style={[
                  styles.removeImageButton,
                  { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' },
                ]}
                onPress={() => removeImage(index)}
              >
                <Icon name="close" size={ms(14)} color="#FF3B30" />
              </TouchableOpacity>
              {index === 0 && selectedImages.length > 1 && (
                <View style={styles.imageCountBadge}>
                  <Text style={styles.imageCountText}>{selectedImages.length}</Text>
                </View>
              )}
            </View>
          ))}
          {selectedImages.length < 5 && (
            <TouchableOpacity
              style={[
                styles.addMoreButton,
                {
                  backgroundColor: isDark ? '#2C2C2E' : '#F5F5F7',
                  borderColor: isDark ? '#3A3A3C' : '#E5E5EA',
                },
              ]}
              onPress={() => setShowImageModal(true)}
            >
              <Icon name="plus" size={ms(24)} color={isDark ? '#8E8E93' : '#6E6E73'} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <View
        style={[
          styles.container,
          {
            backgroundColor: themeColors.background,
            borderTopColor: themeColors.border,
          },
        ]}
      >
        {/* Image picker button */}
        <TouchableOpacity
          style={[
            styles.attachButton,
            {
              backgroundColor: isDark ? '#2C2C2E' : '#F5F5F7',
            },
          ]}
          onPress={() => setShowImageModal(true)}
          disabled={isProcessing}
        >
          <Icon
            name="image-outline"
            size={ms(22)}
            color={isProcessing ? (isDark ? '#48484A' : '#C7C7CC') : '#007AFF'}
          />
        </TouchableOpacity>

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: isDark ? '#2C2C2E' : '#F5F5F7',
              borderColor: isFocused ? '#007AFF' : 'transparent',
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                color: isDark ? '#FFFFFF' : '#1C1C1E',
              },
            ]}
            placeholder={placeholder}
            placeholderTextColor={isDark ? '#8E8E93' : '#6E6E73'}
            value={message}
            onChangeText={handleChangeText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            multiline
            maxLength={1000}
            editable={!isProcessing}
          />
        </View>

        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: canSend ? '#007AFF' : (isDark ? '#3A3A3C' : '#E5E5EA'),
              },
            ]}
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.7}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Icon
                name="send"
                size={ms(20)}
                color={canSend ? '#FFFFFF' : (isDark ? '#8E8E93' : '#C7C7CC')}
              />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  previewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
  },
  previewImageContainer: {
    position: 'relative',
  },
  previewImage: {
    width: ms(72),
    height: ms(72),
    borderRadius: ms(12),
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  removeImageButton: {
    position: 'absolute',
    top: -ms(6),
    right: -ms(6),
    width: ms(22),
    height: ms(22),
    borderRadius: ms(11),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: ms(4),
    right: ms(4),
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: ms(6),
    paddingVertical: ms(2),
    borderRadius: ms(8),
  },
  imageCountText: {
    color: '#FFFFFF',
    fontSize: ms(11),
    fontWeight: '600',
  },
  addMoreButton: {
    width: ms(72),
    height: ms(72),
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  attachButton: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: ms(20),
    borderWidth: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    minHeight: ms(44),
    maxHeight: ms(120),
  },
  input: {
    flex: 1,
    fontSize: ms(16),
    lineHeight: ms(22),
    paddingTop: Platform.OS === 'ios' ? ms(2) : spacing.xs,
    paddingBottom: Platform.OS === 'ios' ? ms(2) : spacing.xs,
  },
  sendButton: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(14),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
});

export default MessageInput;
