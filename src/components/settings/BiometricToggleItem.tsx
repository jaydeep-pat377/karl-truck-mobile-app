import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, Icon } from '../common';
import { colors } from '../../theme/colors';
import { ms } from '../../utils/responsive';
import { useTheme } from '../../contexts/ThemeContext';
import { useBiometrics } from '../../hooks/useBiometrics';

interface BiometricToggleItemProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

const COMPACT_SPACING = {
  itemPaddingVertical: ms(10),
  itemPaddingHorizontal: ms(14),
  iconSize: ms(32),
  iconRadius: ms(8),
  iconTextGap: ms(12),
} as const;

export const BiometricToggleItem: React.FC<BiometricToggleItemProps> = ({
  onSuccess,
  onError,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const themeColors = isDark ? colors.dark : colors.light;
  const {
    isAvailable,
    isEnabled,
    isLoading,
    enableBiometrics,
    disableBiometrics,
    getBiometryTypeName,
    biometryType,
    openBiometricSettings,
  } = useBiometrics();
  const [isToggling, setIsToggling] = useState(false);


  if (isLoading) {
    return null;
  }

  const handleToggle = async () => {

    if (!isAvailable) {
      openBiometricSettings();
      return;
    }

    setIsToggling(true);

    try {
      if (isEnabled) {
        await disableBiometrics();
        onSuccess?.();
      } else {
        const result = await enableBiometrics();
        if (result.success) {
          onSuccess?.();
        } else if (result.error) {
          onError?.(result.error);
        }
      }
    } catch (error: any) {
      onError?.(error?.message || 'An error occurred');
    } finally {
      setIsToggling(false);
    }
  };

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
    <TouchableOpacity
      style={styles.container}
      onPress={handleToggle}
      activeOpacity={0.7}
      disabled={isToggling}>
      <View style={[
        styles.iconContainer,
        { backgroundColor: (isAvailable ? colors.success.main : colors.warning.main) + '20' }
      ]}>
        <Icon
          name={isAvailable ? getBiometricIcon() : 'shield-lock-outline'}
          size={ms(20)}
          color={isAvailable ? colors.success.main : colors.warning.main}
        />
      </View>

      <View style={styles.content}>
        <Text variant="bodySmall" style={{ fontWeight: '600' }}>
          {isAvailable ? getBiometryTypeName() : t('biometric.title')}
        </Text>
        <Text variant="caption" color={isAvailable ? 'secondary' : 'error'}>
          {isAvailable
            ? t('biometric.unlockWith', { method: getBiometryTypeName().toLowerCase() })
            : t('biometric.notSetUp')}
        </Text>
      </View>

      {!isAvailable ? (
        <Icon name="chevron-right" size={ms(22)} color={themeColors.text.hint} />
      ) : isToggling ? (
        <ActivityIndicator size="small" color={colors.primary.main} />
      ) : (
        <TouchableOpacity
          onPress={handleToggle}
          activeOpacity={0.8}
          style={[
            styles.toggleSwitch,
            { backgroundColor: isEnabled ? colors.primary.main : themeColors.border }
          ]}>
          <View style={[
            styles.toggleKnob,
            {
              left: isEnabled ? ms(22) : ms(2),
              backgroundColor: colors.common.white,
            }
          ]}>
            <Icon
              name={isEnabled ? 'check' : 'close'}
              size={ms(12)}
              color={isEnabled ? colors.primary.main : themeColors.text.hint}
            />
          </View>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ms(44),
    paddingVertical: COMPACT_SPACING.itemPaddingVertical,
    paddingHorizontal: COMPACT_SPACING.itemPaddingHorizontal,
  },
  iconContainer: {
    width: COMPACT_SPACING.iconSize,
    height: COMPACT_SPACING.iconSize,
    borderRadius: COMPACT_SPACING.iconRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: COMPACT_SPACING.iconTextGap,
    gap: ms(1),
  },
  toggleSwitch: {
    width: ms(46),
    height: ms(26),
    borderRadius: ms(13),
    justifyContent: 'center',
  },
  toggleKnob: {
    position: 'absolute',
    width: ms(22),
    height: ms(22),
    borderRadius: ms(11),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
});

export default BiometricToggleItem;
