import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Text } from '../../components/common/Text';
import { Card } from '../../components/common/Card';
import { LogoutModal } from '../../components/common';
import { ms, vs, spacing } from '../../utils/responsive';
import { colors } from '../../theme/colors';

interface ProfileScreenProps {
  navigation?: any;
}

const mockUser = {
  name: 'John Anderson',
  email: 'john.anderson@dolese.com',
  phone: '+1 (405) 555-0123',
  role: 'Dispatch Manager',
  department: 'Operations',
  employeeId: 'EMP-2024-0156',
  joinDate: 'March 2022',
  avatar: null,
};

const mockStats = [
  { label: 'Orders', value: '1,234', icon: 'clipboard-text' },
  { label: 'Deliveries', value: '956', icon: 'truck-delivery' },
  { label: 'Rating', value: '4.9', icon: 'star' },
];
interface MenuItemProps {
  icon: string;
  label: string;
  value?: string;
  onPress: () => void;
  showChevron?: boolean;
  iconColor?: string;
  disabled?: boolean;
  rightElement?: React.ReactNode;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  label,
  value,
  onPress,
  showChevron = true,
  iconColor,
  disabled = false,
  rightElement,
}) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        { borderBottomColor: theme.colors.border },
        disabled && styles.menuItemDisabled,
      ]}
      onPress={onPress}
      activeOpacity={disabled ? 1 : 0.7}
      disabled={disabled}>
      <View
        style={[
          styles.menuIconContainer,
          { backgroundColor: (iconColor || theme.colors.primary.main) + '15' },
          disabled && { opacity: 0.5 },
        ]}>
        <Icon
          name={icon}
          size={ms(20)}
          color={iconColor || theme.colors.primary.main}
        />
      </View>
      <View style={styles.menuContent}>
        <Text variant="body" color={disabled ? 'hint' : 'primary'}>
          {label}
        </Text>
        {value && (
          <Text variant="bodySmall" color={disabled ? 'hint' : 'secondary'}>
            {value}
          </Text>
        )}
      </View>
      {rightElement}
      {showChevron && !rightElement && !disabled && (
        <Icon name="chevron-right" size={ms(24)} color={theme.colors.secondary.main} />
      )}
    </TouchableOpacity>
  );
};

// Read-only theme status indicator (non-interactive)
const ThemeStatusItem: React.FC = () => {
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.menuItem, styles.menuItemDisabled, { borderBottomColor: theme.colors.border }]}>
      <View
        style={[
          styles.menuIconContainer,
          { backgroundColor: theme.colors.secondary.main + '15', opacity: 0.6 },
        ]}>
        <Icon
          name="theme-light-dark"
          size={ms(20)}
          color={theme.colors.secondary.main}
        />
      </View>
      <View style={styles.menuContent}>
        <Text variant="body" color="hint">
          Theme
        </Text>
        <Text variant="caption" color="hint">
          {isDark ? 'Dark mode enabled' : 'Light mode enabled'}
        </Text>
      </View>
      <View style={styles.themeStatusBadge}>
        <Icon
          name={isDark ? 'weather-night' : 'white-balance-sunny'}
          size={ms(14)}
          color={theme.colors.text.hint}
        />
        <Text variant="caption" color="hint" style={{ marginLeft: ms(4) }}>
          {isDark ? 'Dark' : 'Light'}
        </Text>
      </View>
    </View>
  );
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleEditProfile = () => {
    navigation?.navigate('EditProfile');
  };

  const handleChangePassword = () => {
    navigation?.navigate('ChangePassword');
  };

  const handleChangePIN = () => {
    navigation?.navigate('ChangePIN');
  };

  const handleSettings = () => {
    navigation?.goBack()
  };

  const handleHelp = () => { };

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
      navigation?.dispatch(
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

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text variant="h2" color="primary">
            Profile
          </Text>
          <TouchableOpacity
            onPress={handleSettings}
            activeOpacity={0.7}
            style={[styles.settingsButton, { backgroundColor: theme.colors.card }]}>
            <Icon name="cog-outline" size={ms(24)} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <Card variant="elevated" style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {mockUser.avatar ? (
                <Image source={{ uri: mockUser.avatar }} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    { backgroundColor: theme.colors.primary.main },
                  ]}>
                  <Text variant="h2" style={{ color: theme.colors.primary.contrast }}>
                    {getInitials(mockUser.name)}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.editAvatarButton, { backgroundColor: theme.colors.primary.main }]}
                onPress={handleEditProfile}
                activeOpacity={0.7}>
                <Icon name="camera" size={ms(14)} color={theme.colors.primary.contrast} />
              </TouchableOpacity>
            </View>

            <View style={styles.userInfo}>
              <Text variant="h3" color="primary" style={styles.userName}>
                {mockUser.name}
              </Text>
              <Text variant="bodySmall" color="secondary" style={styles.userRole}>
                {mockUser.role}
              </Text>
              <View style={styles.badgeContainer}>
                <View style={[styles.badge, { backgroundColor: theme.colors.success.background }]}>
                  <Icon name="check-decagram" size={ms(14)} color={theme.colors.success.main} />
                  <Text
                    variant="captionSmall"
                    style={{ color: theme.colors.success.main, marginLeft: ms(4) }}>
                    Verified
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.editProfileButton, { borderColor: theme.colors.primary.main }]}
            onPress={handleEditProfile}
            activeOpacity={0.7}>
            <Icon name="pencil-outline" size={ms(18)} color={theme.colors.primary.main} />
            <Text
              variant="buttonSmall"
              style={{ color: theme.colors.primary.main, marginLeft: ms(8) }}>
              Edit Profile
            </Text>
          </TouchableOpacity>
        </Card>

        <Card variant="default" style={styles.statsCard}>
          <View style={styles.statsRow}>
            {mockStats.map((stat, index) => (
              <View
                key={stat.label}
                style={[
                  styles.statItem,
                  index < mockStats.length - 1 && {
                    borderRightWidth: 1,
                    borderRightColor: theme.colors.border,
                  },
                ]}>
                <Icon name={stat.icon} size={ms(24)} color={theme.colors.primary.main} />
                <Text variant="h3" color="primary" style={styles.statValue}>
                  {stat.value}
                </Text>
                <Text variant="caption" color="secondary">
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <Card variant="default" style={styles.infoCard}>
          <Text variant="label" color="secondary" style={styles.sectionTitle}>
            ACCOUNT INFORMATION
          </Text>

          <View style={styles.infoRow}>
            <Icon name="email-outline" size={ms(20)} color={theme.colors.secondary.main} />
            <View style={styles.infoContent}>
              <Text variant="caption" color="hint">
                Email
              </Text>
              <Text variant="body" color="primary">
                {mockUser.email}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Icon name="phone-outline" size={ms(20)} color={theme.colors.secondary.main} />
            <View style={styles.infoContent}>
              <Text variant="caption" color="hint">
                Phone
              </Text>
              <Text variant="body" color="primary">
                {mockUser.phone}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Icon name="badge-account-outline" size={ms(20)} color={theme.colors.secondary.main} />
            <View style={styles.infoContent}>
              <Text variant="caption" color="hint">
                Employee ID
              </Text>
              <Text variant="body" color="primary">
                {mockUser.employeeId}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Icon name="office-building-outline" size={ms(20)} color={theme.colors.secondary.main} />
            <View style={styles.infoContent}>
              <Text variant="caption" color="hint">
                Department
              </Text>
              <Text variant="body" color="primary">
                {mockUser.department}
              </Text>
            </View>
          </View>
        </Card>

        <Card variant="default" style={styles.menuCard}>
          <Text variant="label" color="secondary" style={styles.sectionTitle}>
            PREFERENCES
          </Text>

          {/* Read-only theme status - change theme via Settings */}
          <ThemeStatusItem />

          <Text variant="label" color="secondary" style={[styles.sectionTitle, { marginTop: vs(16) }]}>
            ACCOUNT SETTINGS
          </Text>

          <MenuItem
            icon="lock-outline"
            label="Change Password"
            onPress={handleChangePassword} />
          <MenuItem
            icon="numeric"
            label="Change PIN"
            onPress={handleChangePIN} />
          <MenuItem
            icon="help-circle-outline"
            label="Help & Support"
            onPress={handleHelp} />
          <MenuItem
            icon="logout"
            label={t('auth.logout') || 'Sign Out'}
            onPress={handleLogout}
            showChevron={false}
            iconColor={theme.colors.error.main} />
        </Card>

        <View style={styles.versionContainer}>
          <Text variant="caption" color="hint">
            Member since {mockUser.joinDate}
          </Text>
          <Text variant="captionSmall" color="hint" style={styles.versionText}>
            Version 1.0.0
          </Text>
        </View>
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
// Compact Spacing for Profile Screen
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: vs(10),
    paddingBottom: vs(20),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(12),
  },
  settingsButton: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    marginBottom: vs(10),
    padding: spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(10),
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: ms(70),
    height: ms(70),
    borderRadius: ms(35),
  },
  avatarPlaceholder: {
    width: ms(70),
    height: ms(70),
    borderRadius: ms(35),
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: ms(26),
    height: ms(26),
    borderRadius: ms(13),
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    marginBottom: vs(1),
  },
  userRole: {
    marginBottom: vs(4),
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(6),
    paddingVertical: vs(2),
    borderRadius: ms(10),
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(8),
    borderRadius: ms(8),
    borderWidth: 1.5,
  },
  statsCard: {
    marginBottom: vs(10),
    padding: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: vs(4),
  },
  statValue: {
    marginTop: vs(4),
    marginBottom: vs(1),
  },
  infoCard: {
    marginBottom: vs(10),
    padding: spacing.md,
  },
  sectionTitle: {
    marginBottom: vs(10),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(8),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  infoContent: {
    marginLeft: ms(12),
    flex: 1,
  },
  menuCard: {
    marginBottom: vs(10),
    padding: spacing.md,
    paddingBottom: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(10),
    borderBottomWidth: 1,
  },
  menuItemDisabled: {
    opacity: 0.7,
  },
  menuIconContainer: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: ms(10),
  },
  themeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(8),
    paddingVertical: vs(3),
    borderRadius: ms(10),
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: vs(4),
  },
  versionText: {
    marginTop: vs(2),
  },
});

export default ProfileScreen;
