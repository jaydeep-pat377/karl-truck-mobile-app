import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, AppState, AppStateStatus } from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon, Text } from '../common';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration?: number;
  isOwnMessage: boolean;
}

const audioRecorderPlayer = AudioRecorderPlayer;

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const isPlayingRef = useRef(false);

  const stopPlayback = useCallback(async () => {
    if (!isPlayingRef.current) return;
    try {
      await audioRecorderPlayer.stopPlayer();
      audioRecorderPlayer.removePlayBackListener();
    } catch {}
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentPosition(0);
    progressAnim.setValue(0);
  }, [progressAnim]);

  // Stop playback when component unmounts (navigate back)
  useEffect(() => {
    return () => {
      if (isPlayingRef.current) {
        audioRecorderPlayer.stopPlayer().catch(() => {});
        audioRecorderPlayer.removePlayBackListener();
      }
    };
  }, []);

  // Stop playback when app goes to background
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState !== 'active' && isPlayingRef.current) {
        stopPlayback();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [stopPlayback]);

  // Stop playback when navigating away (screen blur)
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      if (isPlayingRef.current) {
        stopPlayback();
      }
    });
    return unsubscribe;
  }, [navigation, stopPlayback]);

  const handlePlayPause = useCallback(async () => {
    try {
      if (isPlaying) {
        await stopPlayback();
      } else {
        await audioRecorderPlayer.startPlayer(audioUrl);
        isPlayingRef.current = true;
        setIsPlaying(true);

        audioRecorderPlayer.addPlayBackListener((e) => {
          const pos = e.currentPosition;
          const dur = e.duration;
          setCurrentPosition(pos);
          if (dur > 0) {
            setTotalDuration(dur);
            progressAnim.setValue(pos / dur);
          }
          if (pos >= dur - 100) {
            audioRecorderPlayer.stopPlayer().catch(() => {});
            audioRecorderPlayer.removePlayBackListener();
            setIsPlaying(false);
            isPlayingRef.current = false;
            setCurrentPosition(0);
            progressAnim.setValue(0);
          }
        });
      }
    } catch (error) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      setCurrentPosition(0);
      progressAnim.setValue(0);
    }
  }, [isPlaying, audioUrl, progressAnim, stopPlayback]);

  const iconColor = isDark ? colors.chat.dark.textPrimary : colors.chat.light.textPrimary;
  const barBgColor = isOwnMessage
    ? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)')
    : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)');
  const barFillColor = isOwnMessage ? colors.common.white : colors.primary.main;
  const timeColor = isDark ? colors.chat.dark.timeText : colors.chat.light.timeText;

  const displayDuration = isPlaying ? currentPosition : totalDuration;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handlePlayPause} style={[styles.playBtn, { backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.2)' : colors.primary.light }]}>
        <Icon
          name={isPlaying ? 'pause' : 'play'}
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
