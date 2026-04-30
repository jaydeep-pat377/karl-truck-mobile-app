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
import ImagePicker from 'react-native-image-crop-picker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon, Text } from '../common';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';

import { ImageAttachment } from '../../api/services/chatService';
export type { ImageAttachment };

interface MessageInputProps {
  onSend: (message: string, images?: ImageAttachment[]) => Promise<void>;
  onTyping?: () => void;
  isSending?: boolean;
  placeholder?: string;
}

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
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(0)).current;

  const bgColor = isDark ? colors.chat.dark.receivedBubble : colors.chat.light.receivedBubble;
  const textColor = isDark ? colors.chat.dark.textPrimary : colors.chat.light.textPrimary;
  const hintColor = isDark ? colors.chat.dark.timeText : colors.semiTransparent.black50;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 1 : 0,
      damping: 20,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Animated.View style={[styles.modalSheet, { backgroundColor: bgColor, transform: [{ translateY }] }]}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: textColor }]}>{t('chat.share')}</Text>

          <View style={styles.modalOptions}>
            <TouchableOpacity style={styles.modalOption} onPress={() => { onClose(); setTimeout(onCameraPress, 300); }}>
              <View style={[styles.modalOptionIcon, { backgroundColor: colors.chat.whatsappGreen }]}>
                <Icon name="camera" size={ms(24)} color={colors.common.white} />
              </View>
              <Text style={[styles.modalOptionText, { color: textColor }]}>{t('chat.camera')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={() => { onClose(); setTimeout(onGalleryPress, 300); }}>
              <View style={[styles.modalOptionIcon, { backgroundColor: colors.statusBadge.purple.text }]}>
                <Icon name="image-multiple" size={ms(24)} color={colors.common.white} />
              </View>
              <Text style={[styles.modalOptionText, { color: textColor }]}>{t('chat.gallery')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onTyping,
  isSending = false,
  placeholder,
}) => {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('chat.messagePlaceholder');
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const [message, setMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState<ImageAttachment[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const sendAnim = useRef(new Animated.Value(1)).current;

  const inputBg = themeColors.card;
  const containerBg = themeColors.background;
  const textColor = themeColors.text.primary;
  const hintColor = themeColors.text.hint;
  const iconColor = themeColors.text.secondary;

  const handleChangeText = useCallback((text: string) => {
    setMessage(text);
    if (text.length > 0 && onTyping) onTyping();
  }, [onTyping]);

  const openCamera = useCallback(async () => {
    try {
      const image = await ImagePicker.openCamera({
        width: 1200,
        height: 1200,
        cropping: false,
        compressImageQuality: 0.8,
        mediaType: 'photo',
      });
      setSelectedImages(prev => [...prev, {
        uri: image.path,
        type: image.mime || 'image/jpeg',
        name: image.filename || `photo_${Date.now()}.jpg`,
        width: image.width,
        height: image.height,
      }]);
    } catch (error: any) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        Alert.alert(t('common.error'), t('chat.errors.openCameraFailed'));
      }
    }
  }, [t]);

  const openGallery = useCallback(async () => {
    try {
      const images = await ImagePicker.openPicker({
        multiple: true,
        maxFiles: 5,
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
        Alert.alert(t('common.error'), t('chat.errors.openGalleryFailed'));
      }
    }
  }, [t]);

  const removeImage = useCallback((index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = message.trim();
    if ((!trimmed && selectedImages.length === 0) || isSending || isUploading) return;

    Animated.sequence([
      Animated.timing(sendAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.timing(sendAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    const images = [...selectedImages];
    setMessage('');
    setSelectedImages([]);

    try {
      setIsUploading(true);
      await onSend(trimmed, images.length > 0 ? images : undefined);
    } catch (error: any) {
      setMessage(trimmed);
      setSelectedImages(images);
      Alert.alert(t('common.error'), error?.message || t('chat.errors.sendFailed'));
    } finally {
      setIsUploading(false);
    }
  }, [message, selectedImages, isSending, isUploading, onSend, sendAnim, t]);

  const canSend = (message.trim().length > 0 || selectedImages.length > 0) && !isSending && !isUploading;
  const isProcessing = isSending || isUploading;

  return (
    <View style={[styles.wrapper, { backgroundColor: containerBg }]}>
      <ImagePickerModal
        visible={showImageModal}
        onClose={() => setShowImageModal(false)}
        onCameraPress={openCamera}
        onGalleryPress={openGallery}
      />

      {selectedImages.length > 0 && (
        <View style={styles.previewRow}>
          {selectedImages.map((img, index) => (
            <View key={`${img.uri}-${index}`} style={styles.previewItem}>
              <Image source={{ uri: img.uri }} style={styles.previewImage} />
              <TouchableOpacity style={styles.previewRemove} onPress={() => removeImage(index)}>
                <Icon name="close" size={ms(12)} color={colors.common.white} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.inputRow}>

        <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor: isFocused ? colors.primary.main : (isDark ? colors.chat.dark.inputBg : colors.semiTransparent.black10) }]}>

          <TouchableOpacity
            style={styles.attachBtn}
            onPress={() => setShowImageModal(true)}
            disabled={isProcessing}
          >
            <Icon name="paperclip" size={ms(20)} color={iconColor} />
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { color: textColor }]}
            placeholder={resolvedPlaceholder}
            placeholderTextColor={hintColor}
            value={message}
            onChangeText={handleChangeText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            multiline
            maxLength={1000}
            editable={!isProcessing}
            textAlignVertical="center"
            scrollEnabled={true}
            blurOnSubmit={false}
            autoCorrect={true}
            autoCapitalize="sentences"
          />

          <TouchableOpacity style={styles.cameraBtn} onPress={openCamera} disabled={isProcessing}>
            <Icon name="camera-outline" size={ms(20)} color={iconColor} />
          </TouchableOpacity>
        </View>

        <Animated.View style={{ transform: [{ scale: sendAnim }] }}>
          <TouchableOpacity
            onPress={handleSend}
            activeOpacity={0.8}
            disabled={!canSend}
            style={[
              styles.sendBtn,
              { backgroundColor: canSend ? colors.primary.main : (isDark ? colors.chat.dark.inputBg : colors.semiTransparent.black10) }
            ]}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={colors.common.white} />
            ) : (
              <Icon name="send" size={ms(18)} color={canSend ? colors.common.white : iconColor} />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  previewRow: {
    flexDirection: 'row',
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  previewItem: {
    position: 'relative',
  },
  previewImage: {
    width: ms(56),
    height: ms(56),
    borderRadius: ms(8),
    backgroundColor: colors.semiTransparent.black10,
  },
  previewRemove: {
    position: 'absolute',
    top: -ms(6),
    right: -ms(6),
    width: ms(20),
    height: ms(20),
    borderRadius: ms(10),
    backgroundColor: colors.error.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: ms(12),
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    minHeight: ms(44),
    maxHeight: ms(120),
  },
  attachBtn: {
    width: ms(36),
    height: ms(36),
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: ms(15),
    lineHeight: ms(20),
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : ms(8),
    maxHeight: ms(100),
  },
  cameraBtn: {
    width: ms(36),
    height: ms(36),
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtn: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.semiTransparent.black50,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: ms(20),
    borderTopRightRadius: ms(20),
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? ms(40) : spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  modalHandle: {
    width: ms(40),
    height: ms(4),
    backgroundColor: colors.semiTransparent.gray30,
    borderRadius: ms(2),
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: ms(18),
    fontWeight: '600',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalOption: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalOptionIcon: {
    width: ms(56),
    height: ms(56),
    borderRadius: ms(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOptionText: {
    fontSize: ms(13),
    fontWeight: '500',
  },
});

export default MessageInput;
