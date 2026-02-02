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

import { ImageAttachment } from '../../api/services/chatService';
export type { ImageAttachment };

interface MessageInputProps {
  onSend: (message: string, images?: ImageAttachment[]) => Promise<void>;
  onTyping?: () => void;
  isSending?: boolean;
  placeholder?: string;
}

// Image Picker Modal
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

  const bgColor = isDark ? '#1F2C34' : '#FFFFFF';
  const textColor = isDark ? '#E9EDEF' : '#111B21';
  const hintColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';

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
          <Text style={[styles.modalTitle, { color: textColor }]}>Share</Text>

          <View style={styles.modalOptions}>
            <TouchableOpacity style={styles.modalOption} onPress={() => { onClose(); setTimeout(onCameraPress, 300); }}>
              <View style={[styles.modalOptionIcon, { backgroundColor: '#00A884' }]}>
                <Icon name="camera" size={ms(24)} color="#FFF" />
              </View>
              <Text style={[styles.modalOptionText, { color: textColor }]}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={() => { onClose(); setTimeout(onGalleryPress, 300); }}>
              <View style={[styles.modalOptionIcon, { backgroundColor: '#7C3AED' }]}>
                <Icon name="image-multiple" size={ms(24)} color="#FFF" />
              </View>
              <Text style={[styles.modalOptionText, { color: textColor }]}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={onClose}>
              <View style={[styles.modalOptionIcon, { backgroundColor: '#EF4444' }]}>
                <Icon name="file-document-outline" size={ms(24)} color="#FFF" />
              </View>
              <Text style={[styles.modalOptionText, { color: textColor }]}>Document</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

// Main Component
export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onTyping,
  isSending = false,
  placeholder = 'Message',
}) => {
  const { isDark } = useTheme();
  const [message, setMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState<ImageAttachment[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const sendAnim = useRef(new Animated.Value(1)).current;

  // Colors
  const inputBg = isDark ? '#1F2C34' : '#FFFFFF';
  const containerBg = isDark ? '#0B141A' : '#F0F2F5';
  const textColor = isDark ? '#E9EDEF' : '#111B21';
  const hintColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
  const iconColor = isDark ? '#8696A0' : '#54656F';

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
        Alert.alert('Error', 'Failed to open camera');
      }
    }
  }, []);

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
        Alert.alert('Error', 'Failed to open gallery');
      }
    }
  }, []);

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
      Alert.alert('Error', error?.message || 'Failed to send');
    } finally {
      setIsUploading(false);
    }
  }, [message, selectedImages, isSending, isUploading, onSend, sendAnim]);

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

      {/* Image Preview */}
      {selectedImages.length > 0 && (
        <View style={styles.previewRow}>
          {selectedImages.map((img, index) => (
            <View key={`${img.uri}-${index}`} style={styles.previewItem}>
              <Image source={{ uri: img.uri }} style={styles.previewImage} />
              <TouchableOpacity style={styles.previewRemove} onPress={() => removeImage(index)}>
                <Icon name="close" size={ms(12)} color="#FFF" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Input Row */}
      <View style={styles.inputRow}>
        {/* Attachment */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setShowImageModal(true)}
          disabled={isProcessing}
        >
          <Icon name="plus" size={ms(24)} color={iconColor} />
        </TouchableOpacity>

        {/* Input Field */}
        <View style={[styles.inputContainer, { backgroundColor: inputBg }]}>
          <TouchableOpacity style={styles.emojiBtn}>
            <Icon name="emoticon-outline" size={ms(24)} color={iconColor} />
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { color: textColor }]}
            placeholder={placeholder}
            placeholderTextColor={hintColor}
            value={message}
            onChangeText={handleChangeText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            multiline
            maxLength={1000}
            editable={!isProcessing}
          />

          <TouchableOpacity style={styles.cameraBtn} onPress={openCamera} disabled={isProcessing}>
            <Icon name="camera-outline" size={ms(22)} color={iconColor} />
          </TouchableOpacity>
        </View>

        {/* Send / Mic Button */}
        <Animated.View style={{ transform: [{ scale: sendAnim }] }}>
          {canSend ? (
            <TouchableOpacity onPress={handleSend} activeOpacity={0.8}>
              <LinearGradient
                colors={['#00A884', '#008069']}
                style={styles.sendBtn}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Icon name="send" size={ms(20)} color="#FFF" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={[styles.micBtn, { backgroundColor: isDark ? '#00A884' : '#00A884' }]}>
              <Icon name="microphone" size={ms(22)} color="#FFF" />
            </View>
          )}
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    paddingBottom: Platform.OS === 'ios' ? spacing.xs : spacing.xs,
  },
  previewRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  previewItem: {
    position: 'relative',
  },
  previewImage: {
    width: ms(60),
    height: ms(60),
    borderRadius: ms(10),
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  previewRemove: {
    position: 'absolute',
    top: -ms(6),
    right: -ms(6),
    width: ms(20),
    height: ms(20),
    borderRadius: ms(10),
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  iconBtn: {
    width: ms(44),
    height: ms(44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: ms(24),
    paddingHorizontal: spacing.xs,
    paddingVertical: Platform.OS === 'ios' ? spacing.xs : ms(2),
    minHeight: ms(48),
    maxHeight: ms(120),
  },
  emojiBtn: {
    width: ms(36),
    height: ms(36),
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: ms(16),
    lineHeight: ms(22),
    paddingVertical: Platform.OS === 'ios' ? spacing.xs : ms(6),
    maxHeight: ms(100),
  },
  cameraBtn: {
    width: ms(36),
    height: ms(36),
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtn: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  micBtn: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    backgroundColor: 'rgba(128,128,128,0.3)',
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
