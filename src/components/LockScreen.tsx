import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../theme/colors';
import { Text, Icon } from './common';
import { ms, spacing } from '../utils/responsive';
import { useAppLock } from '../contexts/AppLockContext';
import { useBiometrics } from '../hooks/useBiometrics';
import { useAuthStore } from '../store/authStore';
import GreenTruck from '../assets/svgs/greenTruck.svg';

const { width, height } = Dimensions.get('window');

const TRUCK_WIDTH = 120;
const TRUCK_HEIGHT = (TRUCK_WIDTH * 86) / 157;

export const LockScreen: React.FC = () => {
  const { isLocked, unlock } = useAppLock();
  const { getBiometryTypeName, biometryType } = useBiometrics();
  const { isAuthenticated } = useAuthStore();
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = useCallback(async () => {
    setError(null);
    setIsUnlocking(true);

    try {
      const result = await unlock();
      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('Authentication failed');
    } finally {
      setIsUnlocking(false);
    }
  }, [unlock]);

  // Auto-prompt on mount
  useEffect(() => {
    if (isLocked && isAuthenticated) {
      const timer = setTimeout(() => {
        handleUnlock();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLocked, isAuthenticated]);

  if (!isLocked || !isAuthenticated) {
    return null;
  }

  const getBiometricIcon = (): string => {
    switch (biometryType) {
      case 'FaceID':
        return 'face-recognition';
      case 'TouchID':
        return 'fingerprint';
      default:
        return 'fingerprint';
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primary.dark, colors.primary.main, colors.primary.light]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />

        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={styles.truckShadow}>
              <GreenTruck width={TRUCK_WIDTH} height={TRUCK_HEIGHT} />
            </View>
          </View>

          <Text style={styles.title}>Truckast AI</Text>

          <View style={styles.lockIconContainer}>
            <Icon name="lock" size={ms(32)} color={colors.common.white} />
          </View>

          <Text style={styles.lockedText}>App Locked</Text>
          <Text style={styles.subtitleText}>
            Use {getBiometryTypeName()} to unlock
          </Text>

          {error && (
            <View style={styles.errorContainer}>
              <Icon name="alert-circle-outline" size={ms(16)} color={colors.error.light} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.unlockButton}
            onPress={handleUnlock}
            disabled={isUnlocking}
            activeOpacity={0.8}>
            {isUnlocking ? (
              <ActivityIndicator size="small" color={colors.primary.main} />
            ) : (
              <>
                <Icon name={getBiometricIcon()} size={ms(24)} color={colors.primary.main} />
                <Text style={styles.unlockButtonText}>
                  Unlock with {getBiometryTypeName()}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Powered by Truckast AI </Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -height * 0.15,
    right: -width * 0.2,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: colors.splash.decorativeCircle1,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -height * 0.1,
    left: -width * 0.3,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: colors.splash.decorativeCircle2,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoContainer: {
    marginBottom: ms(16),
  },
  truckShadow: {
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  title: {
    fontSize: ms(28),
    fontWeight: '700',
    color: colors.common.white,
    letterSpacing: 1,
    textShadowColor: colors.semiTransparent.black20,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: ms(32),
  },
  lockIconContainer: {
    width: ms(64),
    height: ms(64),
    borderRadius: ms(32),
    backgroundColor: colors.semiTransparent.white20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ms(16),
  },
  lockedText: {
    fontSize: ms(20),
    fontWeight: '600',
    color: colors.common.white,
    marginBottom: ms(8),
  },
  subtitleText: {
    fontSize: ms(14),
    color: colors.splash.subtitle,
    marginBottom: ms(32),
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.semiTransparent.white10,
    paddingHorizontal: ms(16),
    paddingVertical: ms(10),
    borderRadius: ms(8),
    marginBottom: ms(24),
  },
  errorText: {
    fontSize: ms(13),
    color: colors.error.light,
    marginLeft: ms(8),
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.common.white,
    paddingHorizontal: ms(32),
    paddingVertical: ms(16),
    borderRadius: ms(30),
    minWidth: ms(200),
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  unlockButtonText: {
    fontSize: ms(15),
    fontWeight: '600',
    color: colors.primary.main,
    marginLeft: ms(10),
  },
  footer: {
    position: 'absolute',
    bottom: ms(50),
    fontSize: ms(12),
    color: colors.splash.footer,
    letterSpacing: 0.5,
  },
});

export default LockScreen;
