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
  PermissionsAndroid,
} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon, Text } from '../common';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';

import { ImageAttachment, AudioAttachment } from '../../api/services/chatService';
export type { ImageAttachment };

interface MessageInputProps {
  onSend: (message: string, images?: ImageAttachment[], audio?: AudioAttachment) => Promise<void>;
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

const audioRecorderPlayer = AudioRecorderPlayer;

const formatRecordingTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordingPathRef = useRef<string>('');

  // Speech recognition state
  const [transcribedText, setTranscribedText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const transcribedTextRef = useRef('');

  const inputBg = themeColors.card;
  const containerBg = themeColors.background;
  const textColor = themeColors.text.primary;
  const hintColor = themeColors.text.hint;
  const iconColor = themeColors.text.secondary;

  // Speech recognition event handlers
  useEffect(() => {
    const onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        const text = e.value[0] || '';
        setTranscribedText(text);
        transcribedTextRef.current = text;
      }
    };

    const onSpeechPartialResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        const text = e.value[0] || '';
        setTranscribedText(text);
        transcribedTextRef.current = text;
      }
    };

    const onSpeechError = (e: SpeechErrorEvent) => {
      console.log('[Voice] Speech recognition error:', e.error);
      setIsTranscribing(false);
    };

    const onSpeechEnd = () => {
      setIsTranscribing(false);
    };

    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechEnd = onSpeechEnd;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  // Pulse animation for recording indicator
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

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

  const startSpeechRecognition = useCallback(async () => {
    try {
      setTranscribedText('');
      transcribedTextRef.current = '';
      setIsTranscribing(true);
      await Voice.start('en-US');
    } catch (error) {
      console.log('[Voice] Failed to start speech recognition:', error);
      setIsTranscribing(false);
    }
  }, []);

  const stopSpeechRecognition = useCallback(async () => {
    try {
      await Voice.stop();
    } catch (error) {
      console.log('[Voice] Failed to stop speech recognition:', error);
    }
    setIsTranscribing(false);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Request microphone permission on Android
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: t('chat.micPermissionTitle') || 'Microphone Permission',
            message: t('chat.micPermissionMessage') || 'This app needs access to your microphone to record voice messages.',
            buttonPositive: t('common.ok') || 'OK',
            buttonNegative: t('common.cancel') || 'Cancel',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(t('common.error'), 'Microphone permission is required to record voice messages.');
          return;
        }
      }

      const result = await audioRecorderPlayer.startRecorder(undefined, undefined, true);
      recordingPathRef.current = result;
      setIsRecording(true);
      setRecordingDuration(0);

      audioRecorderPlayer.addRecordBackListener((e) => {
        setRecordingDuration(e.currentPosition);
      });

      // Start speech recognition in parallel
      startSpeechRecognition();
    } catch (error) {
      Alert.alert(t('common.error'), t('chat.errors.recordingFailed'));
    }
  }, [t, startSpeechRecognition]);

  const stopRecording = useCallback(async (): Promise<AudioAttachment | null> => {
    try {
      await stopSpeechRecognition();
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      const duration = recordingDuration;
      setIsRecording(false);
      setRecordingDuration(0);

      if (duration < 1000) {
        setTranscribedText('');
        transcribedTextRef.current = '';
        return null;
      }

      const ext = Platform.OS === 'ios' ? 'm4a' : 'mp4';
      return {
        uri: result,
        type: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4',
        name: `voice_${Date.now()}.${ext}`,
        duration,
      };
    } catch (error) {
      setIsRecording(false);
      setRecordingDuration(0);
      setTranscribedText('');
      transcribedTextRef.current = '';
      return null;
    }
  }, [recordingDuration, stopSpeechRecognition]);

  const cancelRecording = useCallback(async () => {
    try {
      await stopSpeechRecognition();
      await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
    } catch {}
    setIsRecording(false);
    setRecordingDuration(0);
    setTranscribedText('');
    transcribedTextRef.current = '';
  }, [stopSpeechRecognition]);

  const handleSendVoice = useCallback(async () => {
    const spokenText = transcribedTextRef.current.trim();
    const audio = await stopRecording();
    if (!audio) return;

    try {
      setIsUploading(true);
      await onSend(spokenText, undefined, audio);
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('chat.errors.sendFailed'));
    } finally {
      setIsUploading(false);
      setTranscribedText('');
      transcribedTextRef.current = '';
    }
  }, [stopRecording, onSend, t]);

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
  const showMicButton = message.trim().length === 0 && selectedImages.length === 0 && !isProcessing;

  if (isRecording) {
    return (
      <View style={[styles.wrapper, { backgroundColor: containerBg }]}>
        {transcribedText.length > 0 && (
          <View style={[styles.transcriptionContainer, { backgroundColor: inputBg }]}>
            <Icon name="text-recognition" size={ms(14)} color={hintColor} />
            <Text style={[styles.transcriptionText, { color: textColor }]} numberOfLines={3}>
              {transcribedText}
            </Text>
          </View>
        )}
        <View style={styles.recordingRow}>
          <TouchableOpacity onPress={cancelRecording} style={styles.cancelBtn}>
            <Icon name="delete" size={ms(22)} color={colors.error.main} />
          </TouchableOpacity>

          <View style={styles.recordingInfo}>
            <Animated.View style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={[styles.recordingTimer, { color: textColor }]}>
              {formatRecordingTime(recordingDuration)}
            </Text>
            {isTranscribing && (
              <Text style={[styles.transcribingLabel, { color: hintColor }]}>
                {t('chat.transcribing')}
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={handleSendVoice}
            style={[styles.sendBtn, { backgroundColor: colors.primary.main }]}
          >
            <Icon name="send" size={ms(18)} color={colors.common.white} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
          {showMicButton ? (
            <TouchableOpacity
              onPress={startRecording}
              activeOpacity={0.8}
              style={[styles.sendBtn, { backgroundColor: colors.primary.main }]}
            >
              <Icon name="microphone" size={ms(20)} color={colors.common.white} />
            </TouchableOpacity>
          ) : (
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
          )}
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
  // Recording UI
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: ms(44),
  },
  cancelBtn: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recordingDot: {
    width: ms(10),
    height: ms(10),
    borderRadius: ms(5),
    backgroundColor: colors.error.main,
  },
  recordingTimer: {
    fontSize: ms(16),
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  transcribingLabel: {
    fontSize: ms(12),
    fontStyle: 'italic',
  },
  transcriptionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
    borderRadius: ms(8),
  },
  transcriptionText: {
    flex: 1,
    fontSize: ms(14),
    lineHeight: ms(18),
  },
  // Modal
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
