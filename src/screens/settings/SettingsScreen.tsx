import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { SettingsStackParamList } from '../../navigation/SettingsNavigator';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Card, LogoutModal, Icon } from '../../components/common';
import { Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing, ms } from '../../utils/responsive';
import { TAB_BAR_HEIGHT } from '../../components/navigation';
import { useLogout } from '../../hooks/useLogout';
import { useProfile } from '../../hooks/useProfile';
import { MainTabParamList } from '../../navigation/types';
import { BiometricToggleItem } from '../../components/settings/BiometricToggleItem';

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

interface ThemeToggleItemProps {
  onToggle: () => void;
}

const ThemeToggleItem: React.FC<ThemeToggleItemProps> = ({ onToggle }) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const { t } = useTranslation();

  return (
    <View style={styles.themeToggleItem}>
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

      <View style={styles.themeToggleContent}>
        <Text variant="bodySmall" style={{ fontWeight: '600' }}>
          {t('settings.theme')}
        </Text>
        <Text variant="caption" color="secondary">
          {isDark ? t('settings.darkMode') : t('settings.lightMode')}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={1}
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
    </View>
  );
};

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<SettingsStackParamList & MainTabParamList>>();
  const { toggleTheme, isDark } = useTheme();
  const { t } = useTranslation();
  const { logout, isLoading: isLoggingOut } = useLogout();
  const { profile, isLoading: isProfileLoading, refetch: refetchProfile } = useProfile();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const themeColors = isDark ? colors.dark : colors.light;

  const handleGoBack = () => {

    navigation.navigate('Home' as any);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchProfile();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getInitials = (name: string | undefined): string => {
    if (!name) return '';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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

  const handleNavigateToNotifications = () => {
    navigation.navigate('Notifications' as any);
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleNavigateToPrivacyPolicy = () => {
    navigation.navigate('WebView', {
      url: 'https://dolese.truckast.ai/privacy-policy',
      title: t('settings.privacyPolicy'),
    });
  };

  const handleNavigateToTermsOfService = () => {
    navigation.navigate('WebView', {
      url: 'https://dolese.truckast.ai/terms-of-service',
      title: t('settings.termsOfService'),
    });
  };

  const performLogout = async () => {
    await logout();
    setShowLogoutModal(false);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: themeColors.surface }]}
            onPress={handleGoBack}
            activeOpacity={1}
          >
            <Icon name="arrow-left" size={ms(22)} color={themeColors.text.primary} />
          </TouchableOpacity>
          <Text variant="h2">{t('settings.title')}</Text>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: isDark ? colors.semiTransparent.white08 : colors.semiTransparent.black04 }]}
            onPress={handleRefresh}
            activeOpacity={1}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={colors.primary.main} />
            ) : (
              <Icon name="refresh" size={ms(18)} color={colors.primary.main} />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity activeOpacity={1} onPress={handleNavigateToEditProfile}>
          <Card padding="sm" style={styles.profileCard}>
            <View style={styles.profileContent}>
              <View style={[styles.avatar, { backgroundColor: colors.primary.main }]}>
                {isProfileLoading ? (
                  <ActivityIndicator size="small" color={colors.common.white} />
                ) : profile?.avatarUrl ? (
                  <Image
                    source={{ uri: profile.avatarUrl }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text variant="body" color="white" style={{ fontWeight: '600' }}>
                    {getInitials(profile?.fullName)}
                  </Text>
                )}
              </View>
              <View style={styles.profileInfo}>
                {isProfileLoading ? (
                  <>
                    <View style={[styles.skeletonText, { width: ms(120), backgroundColor: themeColors.border }]} />
                    <View style={[styles.skeletonText, { width: ms(160), backgroundColor: themeColors.border }]} />
                    <View style={[styles.skeletonText, { width: ms(80), backgroundColor: themeColors.border }]} />
                  </>
                ) : (
                  <>
                    <View style={styles.profileNameRow}>
                      <Text variant="body" style={{ fontWeight: '600', flex: 1 }}>
                        {profile?.fullName || ''}
                      </Text>
                      {profile?.active && (
                        <View style={[styles.activeBadge, { backgroundColor: colors.success.main + '20' }]}>
                          <View style={[styles.activeDot, { backgroundColor: colors.success.main }]} />
                          <Text variant="captionSmall" style={{ color: colors.success.main }}>
                            Active
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text variant="caption" color="secondary">
                      {profile?.email || ''}
                    </Text>
                    {profile?.phone ? (
                      <View style={styles.profileDetailRow}>
                        <Icon name="phone-outline" size={ms(12)} color={themeColors.text.hint} />
                        <Text variant="caption" color="hint" style={{ marginLeft: ms(4) }}>
                          {profile.phone}
                        </Text>
                      </View>
                    ) : null}
                    {profile?.title ? (
                      <View style={styles.profileDetailRow}>
                        <Icon name="briefcase-outline" size={ms(12)} color={themeColors.text.hint} />
                        <Text variant="caption" color="hint" style={{ marginLeft: ms(4) }}>
                          {profile.title}
                        </Text>
                      </View>
                    ) : null}
                    {profile?.company ? (
                      <View style={styles.profileDetailRow}>
                        <Icon name="office-building-outline" size={ms(12)} color={themeColors.text.hint} />
                        <Text variant="caption" color="hint" style={{ marginLeft: ms(4) }}>
                          {profile.company}
                        </Text>
                      </View>
                    ) : null}
                  </>
                )}
              </View>
              <Icon name="chevron-right" size={ms(20)} color={themeColors.text.hint} />
            </View>
          </Card>
        </TouchableOpacity>

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
            <BiometricToggleItem
              onSuccess={() => {}}
              onError={(msg) => Alert.alert('Error', msg)}
            />
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            <SettingsItem
              icon="lock-outline"
              title={t('settings.changePassword')}
              onPress={handleNavigateToChangePassword}
            />
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
          </Card>
        </View>

        <View style={styles.section}>
          <Text variant="label" color="secondary" style={styles.sectionTitle}>
            {t('settings.appearance')}
          </Text>
          <Card padding="none">
            <ThemeToggleItem onToggle={toggleTheme} />
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
              onPress={handleNavigateToNotifications}
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
              onPress={handleNavigateToTermsOfService}
            />
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            <SettingsItem
              icon="shield-outline"
              title={t('settings.privacyPolicy')}
              onPress={handleNavigateToPrivacyPolicy}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <Card padding="none">
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerButton: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.md,
    gap: ms(2),
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(6),
    paddingVertical: ms(2),
    borderRadius: ms(10),
    marginLeft: ms(8),
  },
  activeDot: {
    width: ms(6),
    height: ms(6),
    borderRadius: ms(3),
    marginRight: ms(4),
  },
  profileDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ms(1),
  },
  skeletonText: {
    height: ms(14),
    borderRadius: ms(4),
    marginVertical: ms(2),
  },
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
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: COMPACT_SPACING.minTouchTarget,
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
  itemContent: {
    flex: 1,
    marginLeft: COMPACT_SPACING.iconTextGap,
    gap: ms(1),
  },
  divider: {
    height: 1,
    marginLeft: COMPACT_SPACING.dividerMarginLeft,
    opacity: 0.5,
  },
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
