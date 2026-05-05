import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon, Text } from '../common';
import { colors } from '../../theme/colors';
import { ms } from '../../utils/responsive';
import { useAudioStore } from '../../store/audioStore';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration?: number;
  isOwnMessage: boolean;
}

const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  audioUrl,
  duration = 0,
  isOwnMessage,
}) => {
  const { isDark } = useTheme();
  const navigation = useNavigation();
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Subscribe to only what this player needs from the global store
  const currentUrl = useAudioStore((s) => s.currentUrl);
  const status = useAudioStore((s) => s.status);
  const position = useAudioStore((s) => s.position);
  const storeDuration = useAudioStore((s) => s.duration);
  const play = useAudioStore((s) => s.play);
  const stop = useAudioStore((s) => s.stop);

  const isThisPlaying = currentUrl === audioUrl && (status === 'playing' || status === 'loading');

  // Sync progress animation
  useEffect(() => {
    if (isThisPlaying && storeDuration > 0) {
      progressAnim.setValue(position / storeDuration);
    } else if (!isThisPlaying) {
      progressAnim.setValue(0);
    }
  }, [isThisPlaying, position, storeDuration, progressAnim]);

  // Stop audio when navigating away
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      const { status: s, cleanup } = useAudioStore.getState();
      if (s === 'playing' || s === 'loading') {
        cleanup();
      }
    });
    return unsubscribe;
  }, [navigation]);

  const handlePress = useCallback(() => {
    play(audioUrl);
  }, [play, audioUrl]);

  const iconColor = isDark ? colors.chat.dark.textPrimary : colors.chat.light.textPrimary;
  const barBgColor = isOwnMessage
    ? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)')
    : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)');
  const barFillColor = isOwnMessage ? colors.common.white : colors.primary.main;
  const timeColor = isDark ? colors.chat.dark.timeText : colors.chat.light.timeText;

  const displayDuration = isThisPlaying ? position : (duration || storeDuration);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={[
          styles.playBtn,
          { backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.2)' : colors.primary.light },
        ]}
      >
        <Icon
          name={isThisPlaying ? 'pause' : 'play'}
          size={ms(20)}
          color={isOwnMessage ? colors.common.white : colors.primary.main}
        />
      </TouchableOpacity>

      <View style={styles.waveformContainer}>
        <View style={[styles.progressBar, { backgroundColor: barBgColor }]}>
          <Animated.View
            style={[
              styles.progressFill,
              { backgroundColor: barFillColor, width: progressWidth },
            ]}
          />
        </View>
        <Text style={[styles.durationText, { color: timeColor }]}>
          {formatDuration(displayDuration)}
        </Text>
      </View>

      <Icon name="microphone" size={ms(14)} color={timeColor} style={styles.micIcon} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: ms(200),
    paddingVertical: ms(6),
    paddingHorizontal: ms(4),
  },
  playBtn: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformContainer: {
    flex: 1,
    marginLeft: ms(8),
    justifyContent: 'center',
  },
  progressBar: {
    height: ms(4),
    borderRadius: ms(2),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: ms(2),
  },
  durationText: {
    fontSize: ms(11),
    marginTop: ms(3),
    fontVariant: ['tabular-nums'],
  },
  micIcon: {
    marginLeft: ms(8),
  },
});

export default VoiceMessagePlayer;
