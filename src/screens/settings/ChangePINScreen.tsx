/**
 * ChangePINScreen
 *
 * Secure PIN change flow with:
 * - Step-by-step process (verify → create → confirm)
 * - Numeric keypad
 * - Visual PIN dots
 * - Error feedback with shake animation
 * - Theme-aware (light/dark)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from '../../components/common/Text';
import { ms, vs, spacing } from '../../utils/responsive';

interface ChangePINScreenProps {
  navigation?: any;
}

type Step = 'verify' | 'create' | 'confirm';

const PIN_LENGTH = 4;

export const ChangePINScreen: React.FC<ChangePINScreenProps> = ({
  navigation,
}) => {
  const { theme, isDark } = useTheme();

  const [step, setStep] = useState<Step>('verify');
  const [currentPIN, setCurrentPIN] = useState('');
  const [newPIN, setNewPIN] = useState('');
  const [confirmPIN, setConfirmPIN] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Animation refs
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const dotScales = useRef([...Array(PIN_LENGTH)].map(() => new Animated.Value(0))).current;

  const activePIN = step === 'verify' ? currentPIN : step === 'create' ? newPIN : confirmPIN;
  const setActivePIN = step === 'verify' ? setCurrentPIN : step === 'create' ? setNewPIN : setConfirmPIN;

  // Animate dots when PIN changes
  useEffect(() => {
    const pinLength = activePIN.length;
    if (pinLength > 0) {
      Animated.spring(dotScales[pinLength - 1], {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  }, [activePIN]);

  // Reset dot animations when step changes
  useEffect(() => {
    dotScales.forEach(scale => scale.setValue(0));
  }, [step]);

  const triggerShake = () => {
    Vibration.vibrate(100);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleKeyPress = async (key: string) => {
    if (activePIN.length >= PIN_LENGTH) return;

    const newValue = activePIN + key;
    setActivePIN(newValue);
    setError('');

    // Auto-submit when PIN is complete
    if (newValue.length === PIN_LENGTH) {
      await handlePINComplete(newValue);
    }
  };

  const handleDelete = () => {
    if (activePIN.length > 0) {
      const newLength = activePIN.length - 1;
      dotScales[newLength].setValue(0);
      setActivePIN(activePIN.slice(0, -1));
      setError('');
    }
  };

  const handlePINComplete = async (pin: string) => {
    if (step === 'verify') {
      // Verify current PIN (mock: 1234 is correct)
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsLoading(false);

      if (pin === '1234') {
        setStep('create');
      } else {
        setError('Incorrect PIN. Please try again.');
        triggerShake();
        setTimeout(() => {
          setCurrentPIN('');
          dotScales.forEach(scale => scale.setValue(0));
        }, 300);
      }
    } else if (step === 'create') {
      // Check for weak PINs
      const weakPINs = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321'];
      if (weakPINs.includes(pin)) {
        setError('This PIN is too easy to guess. Please choose a different PIN.');
        triggerShake();
        setTimeout(() => {
          setNewPIN('');
          dotScales.forEach(scale => scale.setValue(0));
        }, 300);
      } else {
        setStep('confirm');
      }
    } else if (step === 'confirm') {
      if (pin === newPIN) {
        // Save new PIN
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsLoading(false);

        Alert.alert(
          'PIN Changed',
          'Your PIN has been updated successfully.',
          [{ text: 'OK', onPress: () => navigation?.goBack() }]
        );
      } else {
        setError('PINs do not match. Please try again.');
        triggerShake();
        setTimeout(() => {
          setConfirmPIN('');
          dotScales.forEach(scale => scale.setValue(0));
        }, 300);
      }
    }
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('create');
      setConfirmPIN('');
    } else if (step === 'create') {
      setStep('verify');
      setNewPIN('');
    } else {
      navigation?.goBack();
    }
  };

  const getStepInfo = (): { title: string; subtitle: string; icon: string } => {
    switch (step) {
      case 'verify':
        return {
          title: 'Enter Current PIN',
          subtitle: 'Please enter your current PIN to continue',
          icon: 'lock-outline',
        };
      case 'create':
        return {
          title: 'Create New PIN',
          subtitle: 'Enter a 4-digit PIN that you will remember',
          icon: 'lock-plus-outline',
        };
      case 'confirm':
        return {
          title: 'Confirm New PIN',
          subtitle: 'Re-enter your new PIN to confirm',
          icon: 'lock-check-outline',
        };
    }
  };

  const stepInfo = getStepInfo();

  const renderKeypadButton = (value: string | 'delete' | 'empty', index: number) => {
    if (value === 'empty') {
      return <View key={index} style={styles.keypadButton} />;
    }

    const isDelete = value === 'delete';

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.keypadButton,
          { backgroundColor: isDark ? theme.colors.card : theme.colors.light.cardElevated },
        ]}
        onPress={() => (isDelete ? handleDelete() : handleKeyPress(value))}
        activeOpacity={0.7}
        disabled={isLoading}
      >
        {isDelete ? (
          <Icon name="backspace-outline" size={ms(28)} color={theme.colors.text} />
        ) : (
          <Text variant="h2" color="primary">
            {value}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.colors.card }]}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={ms(24)} color={theme.colors.text} />
        </TouchableOpacity>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          {['verify', 'create', 'confirm'].map((s, index) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                {
                  backgroundColor:
                    s === step
                      ? theme.colors.primary.main
                      : ['verify', 'create', 'confirm'].indexOf(step) > index
                      ? theme.colors.success.main
                      : isDark
                      ? theme.colors.dark.border
                      : theme.colors.light.border,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: theme.colors.primary.main + '15' },
          ]}
        >
          <Icon
            name={stepInfo.icon}
            size={ms(40)}
            color={theme.colors.primary.main}
          />
        </View>

        {/* Title & Subtitle */}
        <Text variant="h3" color="primary" style={styles.title}>
          {stepInfo.title}
        </Text>
        <Text variant="body" color="secondary" style={styles.subtitle}>
          {stepInfo.subtitle}
        </Text>

        {/* PIN Dots */}
        <Animated.View
          style={[
            styles.dotsContainer,
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          {[...Array(PIN_LENGTH)].map((_, index) => {
            const isFilled = index < activePIN.length;
            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isFilled
                      ? error
                        ? theme.colors.error.main
                        : theme.colors.primary.main
                      : 'transparent',
                    borderColor: error
                      ? theme.colors.error.main
                      : isFilled
                      ? theme.colors.primary.main
                      : theme.colors.secondary.main,
                    transform: [
                      {
                        scale: isFilled
                          ? dotScales[index].interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.5, 1],
                            })
                          : 1,
                      },
                    ],
                  },
                ]}
              />
            );
          })}
        </Animated.View>

        {/* Error Message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={ms(16)} color={theme.colors.error.main} />
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.error.main, marginLeft: ms(6) }}
            >
              {error}
            </Text>
          </View>
        ) : (
          <View style={styles.errorPlaceholder} />
        )}
      </View>

      {/* Numeric Keypad */}
      <View style={styles.keypad}>
        <View style={styles.keypadRow}>
          {['1', '2', '3'].map((key, i) => renderKeypadButton(key, i))}
        </View>
        <View style={styles.keypadRow}>
          {['4', '5', '6'].map((key, i) => renderKeypadButton(key, i + 3))}
        </View>
        <View style={styles.keypadRow}>
          {['7', '8', '9'].map((key, i) => renderKeypadButton(key, i + 6))}
        </View>
        <View style={styles.keypadRow}>
          {['empty', '0', 'delete'].map((key, i) =>
            renderKeypadButton(key as string, i + 9)
          )}
        </View>
      </View>

      {/* Forgot PIN Link (only on verify step) */}
      {step === 'verify' && (
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Forgot PIN?',
              'Please contact your administrator to reset your PIN.',
              [{ text: 'OK' }]
            );
          }}
          activeOpacity={0.7}
          style={styles.forgotLink}
        >
          <Text variant="body" style={{ color: theme.colors.primary.main }}>
            Forgot PIN?
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: vs(12),
  },
  backButton: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
    marginHorizontal: ms(4),
  },
  headerSpacer: {
    width: ms(44),
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: ms(80),
    height: ms(80),
    borderRadius: ms(40),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(24),
  },
  title: {
    marginBottom: vs(8),
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: vs(32),
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: vs(16),
  },
  dot: {
    width: ms(18),
    height: ms(18),
    borderRadius: ms(9),
    borderWidth: 2,
    marginHorizontal: ms(10),
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: vs(24),
  },
  errorPlaceholder: {
    height: vs(24),
  },
  keypad: {
    paddingHorizontal: spacing.xl,
    paddingBottom: vs(24),
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: vs(12),
  },
  keypadButton: {
    width: ms(72),
    height: ms(72),
    borderRadius: ms(36),
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: ms(12),
  },
  forgotLink: {
    alignItems: 'center',
    paddingVertical: vs(16),
    marginBottom: vs(16),
  },
});

export default ChangePINScreen;
