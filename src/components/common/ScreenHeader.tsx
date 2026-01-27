import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { spacing, ms } from '../../utils/responsive';
import { Icon } from './Icon';
import { Text } from './Text';
import { MainTabParamList } from '../../navigation/types';

interface ScreenHeaderProps {
  title: string;
  showBackButton?: boolean;
  showRefreshButton?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onBackPress?: () => void;
  rightElement?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  showBackButton = true,
  showRefreshButton = false,
  onRefresh,
  isRefreshing = false,
  onBackPress,
  rightElement,
}) => {
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const themeColors = isDark ? colors.dark : colors.light;

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home' as any);
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.background,
          paddingTop: insets.top + spacing.sm,
        },
      ]}
    >
      <View style={styles.header}>
        {showBackButton ? (
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: themeColors.surface }]}
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={ms(22)} color={themeColors.text.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}

        <Text variant="h2" style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {showRefreshButton ? (
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: themeColors.surface }]}
            onPress={handleRefresh}
            activeOpacity={0.7}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={colors.primary.main} />
            ) : (
              <Icon name="refresh" size={ms(22)} color={themeColors.text.primary} />
            )}
          </TouchableOpacity>
        ) : rightElement ? (
          rightElement
        ) : (
          <View style={styles.headerButton} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  headerButton: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
});

export default ScreenHeader;
