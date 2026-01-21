import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, CommonActions, NavigationProp } from '@react-navigation/native';
import { SettingsStackParamList } from '../../navigation/SettingsNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Card, LogoutModal } from '../../components/common';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing, ms, iconSizes } from '../../utils/responsive';
import { TAB_BAR_HEIGHT } from '../../components/navigation';

interface SettingsItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showArrow?: boolean;
  rightElement?: React.ReactNode;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  showArrow = true,
  rightElement,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <TouchableOpacity style={styles.settingsItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: colors.primary.main + '15' }]}>
        <Icon name={icon} size={ms(18)} color={colors.primary.main} />
      </View>
      <View style={styles.itemContent}>
        <Text variant="bodySmall" style={{ fontWeight: '500' }}>{title}</Text>
        {subtitle && (
          <Text variant="caption" color="secondary" style={{ lineHeight: ms(16) }}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement}
      {showArrow && !rightElement && (
        <Icon name="chevron-right" size={ms(20)} color={themeColors.text.hint} />
      )}
    </TouchableOpacity>
  );
};

// ============================================
// Theme Toggle Component - Primary Theme Control
// ============================================
interface ThemeToggleItemProps {
  onToggle: () => void;
}

const ThemeToggleItem: React.FC<ThemeToggleItemProps> = ({ onToggle }) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={styles.themeToggleItem}
      onPress={onToggle}
      activeOpacity={0.7}>
      {/* Theme Icon */}
      <View style={[
        styles.themeIconContainer,
        { backgroundColor: isDark ? colors.info.main + '20' : colors.warning.main + '20' }
      ]}>
        <Icon
          name={isDark ? 'weather-night' : 'white-balance-sunny'}
          size={ms(20)}
          color={isDark ? colors.info.main : colors.warning.main}
        />
      </View>

      {/* Content */}
      <View style={styles.themeToggleContent}>
        <Text variant="bodySmall" style={{ fontWeight: '600' }}>
          {t('settings.theme')}
        </Text>
        <Text variant="caption" color="secondary">
          {isDark ? t('settings.darkMode') : t('settings.lightMode')}
        </Text>
      </View>

      {/* Toggle Switch */}
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.8}
        style={[
          styles.themeToggleSwitch,
          { backgroundColor: isDark ? colors.primary.main : themeColors.border }
        ]}>
        <View style={[
          styles.themeToggleKnob,
          {
            left: isDark ? ms(22) : ms(2),
            backgroundColor: colors.common.white,
          }
        ]}>
          <Icon
            name={isDark ? 'weather-night' : 'white-balance-sunny'}
            size={ms(12)}
            color={isDark ? colors.primary.main : colors.warning.main}
          />
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<SettingsStackParamList>>();
  const { toggleTheme, isDark } = useTheme();
  const { t } = useTranslation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const themeColors = isDark ? colors.dark : colors.light;

  const handleNavigateToProfile = () => {
    navigation.navigate('Profile');
  };

  const handleNavigateToEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleNavigateToChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const handleNavigateToChangePIN = () => {
    navigation.navigate('ChangePIN');
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const performLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Clear stored user data
      await AsyncStorage.multiRemove([
        'userToken',
        'userData',
        'rememberMe',
      ]);

      // Reset navigation to Auth screen
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Auth' as never }],
        })
      );
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="h2">{t('settings.title')}</Text>
        </View>

        <Card padding="sm" style={styles.profileCard} onPress={handleNavigateToProfile}>
          <View style={styles.profileContent}>
            <View style={[styles.avatar, { backgroundColor: colors.primary.main }]}>
              <Text variant="body" color="white" style={{ fontWeight: '600' }}>
                JS
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text variant="body" style={{ fontWeight: '600' }}>John Smith</Text>
              <Text variant="caption" color="secondary">
                john.smith@dolese.com
              </Text>
              <Text variant="caption" color="hint" style={{ fontSize: ms(11) }}>
                Dispatcher
              </Text>
            </View>
            <Icon name="chevron-right" size={ms(20)} color={themeColors.text.hint} />
          </View>
        </Card>

        <View style={styles.section}>
          <Text variant="label" color="secondary" style={styles.sectionTitle}>
            {t('settings.account')}
          </Text>
          <Card padding="none">
            <SettingsItem
              icon="account-outline"
              title={t('profile.editProfile')}
              onPress={handleNavigateToEditProfile}
            />
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            <SettingsItem
              icon="lock-outline"
              title={t('settings.changePassword')}
              onPress={handleNavigateToChangePassword}
            />
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            <SettingsItem
              icon="numeric"
              title={t('settings.changePin')}
              onPress={handleNavigateToChangePIN}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <Text variant="label" color="secondary" style={styles.sectionTitle}>
            {t('settings.appearance')}
          </Text>
          <Card padding="none">
            {/* Primary Theme Control - Only place to change theme */}
            <ThemeToggleItem onToggle={toggleTheme} />
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            <SettingsItem
              icon="translate"
              title={t('settings.language')}
              subtitle="English"
              onPress={() => { }}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <Text variant="label" color="secondary" style={styles.sectionTitle}>
            {t('settings.notifications')}
          </Text>
          <Card padding="none">
            <SettingsItem
              icon="bell-outline"
              title={t('settings.notifications')}
              subtitle="Manage notification preferences"
              onPress={() => { }}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <Text variant="label" color="secondary" style={styles.sectionTitle}>
            {t('settings.security')}
          </Text>
          <Card padding="none">
            <SettingsItem
              icon="fingerprint"
              title={t('settings.biometricLogin')}
              onPress={() => { }}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <Text variant="label" color="secondary" style={styles.sectionTitle}>
            {t('settings.about')}
          </Text>
          <Card padding="none">
            <SettingsItem
              icon="information-outline"
              title={t('settings.version')}
              subtitle="1.0.0"
              onPress={() => { }}
              showArrow={false}
            />
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            <SettingsItem
              icon="file-document-outline"
              title={t('settings.termsOfService')}
              onPress={() => { }}
            />
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            <SettingsItem
              icon="shield-outline"
              title={t('settings.privacyPolicy')}
              onPress={() => { }}
            />
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            <SettingsItem
              icon="help-circle-outline"
              title={t('settings.contactSupport')}
              onPress={() => { }}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <Card padding="none">
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Icon name="logout" size={ms(18)} color={colors.error.main} />
              <Text variant="bodySmall" style={{ color: colors.error.main, marginLeft: spacing.sm, fontWeight: '500' }}>
                {t('auth.logout')}
              </Text>
            </TouchableOpacity>
          </Card>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={performLogout}
        isLoading={isLoggingOut}
      />
    </SafeAreaView>
  );
};

// ============================================
// Compact Spacing Tokens
// ============================================
const COMPACT_SPACING = {
  itemPaddingVertical: ms(10),
  itemPaddingHorizontal: ms(14),
  sectionMarginBottom: ms(16),
  iconSize: ms(32),
  iconRadius: ms(8),
  iconTextGap: ms(12),
  dividerMarginLeft: ms(56),
  minTouchTarget: ms(44),
} as const;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header - Reduced vertical padding
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  // Profile Card - Tighter margins
  profileCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.md,
    gap: ms(1),
  },
  // Sections - Reduced margins
  section: {
    marginHorizontal: spacing.lg,
    marginBottom: COMPACT_SPACING.sectionMarginBottom,
  },
  sectionTitle: {
    marginBottom: ms(6),
    marginLeft: ms(2),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Settings Items - Compact padding with min touch target
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: COMPACT_SPACING.minTouchTarget,
    paddingVertical: COMPACT_SPACING.itemPaddingVertical,
    paddingHorizontal: COMPACT_SPACING.itemPaddingHorizontal,
  },
  // Icon Container - Slightly smaller
  iconContainer: {
    width: COMPACT_SPACING.iconSize,
    height: COMPACT_SPACING.iconSize,
    borderRadius: COMPACT_SPACING.iconRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Item Content - Tighter spacing
  itemContent: {
    flex: 1,
    marginLeft: COMPACT_SPACING.iconTextGap,
    gap: ms(1),
  },
  // Divider - Aligned with text (1px visible line)
  divider: {
    height: 1,
    marginLeft: COMPACT_SPACING.dividerMarginLeft,
    opacity: 0.5,
  },
  // ============================================
  // Theme Toggle Item Styles
  // ============================================
  themeToggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: COMPACT_SPACING.minTouchTarget,
    paddingVertical: COMPACT_SPACING.itemPaddingVertical,
    paddingHorizontal: COMPACT_SPACING.itemPaddingHorizontal,
  },
  themeIconContainer: {
    width: COMPACT_SPACING.iconSize,
    height: COMPACT_SPACING.iconSize,
    borderRadius: COMPACT_SPACING.iconRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeToggleContent: {
    flex: 1,
    marginLeft: COMPACT_SPACING.iconTextGap,
    gap: ms(1),
  },
  themeToggleSwitch: {
    width: ms(46),
    height: ms(26),
    borderRadius: ms(13),
    justifyContent: 'center',
  },
  themeToggleKnob: {
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
  // Logout Button - Compact
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: COMPACT_SPACING.minTouchTarget,
    paddingVertical: COMPACT_SPACING.itemPaddingVertical,
    paddingHorizontal: COMPACT_SPACING.itemPaddingHorizontal,
  },
  bottomPadding: {
    height: TAB_BAR_HEIGHT,
  },
});

export default SettingsScreen;
