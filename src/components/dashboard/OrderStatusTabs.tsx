import React, { useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../common';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';
import { fontFamily } from '../../theme/typography';

export type OrderStatusFilter = 'all' | 'saved' | 'scheduled' | 'active' | 'completed' | 'cancelled' | 'requested';

export interface OrderStatusCount {
  all: number;
  saved: number;
  scheduled: number;
  active: number;
  completed: number;
  cancelled: number;
  requested: number;
}

interface OrderStatusTabsProps {
  selectedStatus: OrderStatusFilter;
  onStatusChange: (status: OrderStatusFilter) => void;
  counts?: Partial<OrderStatusCount>;
}

const statusOptions: { key: OrderStatusFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'orderTabs.all' },
  { key: 'saved', labelKey: 'orderTabs.saved' },
  { key: 'scheduled', labelKey: 'orderTabs.scheduled' },
  { key: 'active', labelKey: 'orderTabs.active' },
  { key: 'completed', labelKey: 'orderTabs.completed' },
  { key: 'cancelled', labelKey: 'orderTabs.cancelled' },
  { key: 'requested', labelKey: 'orderTabs.requested' },
];

const defaultCounts: OrderStatusCount = {
  all: 0,
  saved: 0,
  scheduled: 0,
  active: 0,
  completed: 0,
  cancelled: 0,
  requested: 0,
};

export const OrderStatusTabs: React.FC<OrderStatusTabsProps> = ({
  selectedStatus,
  onStatusChange,
  counts = {},
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const themeColors = isDark ? colors.dark : colors.light;
  const scrollViewRef = useRef<ScrollView>(null);
  const tabPositions = useRef<Record<string, { x: number; width: number }>>({});
  const underlineAnim = useRef(new Animated.Value(0)).current;
  const underlineWidth = useRef(new Animated.Value(0)).current;

  const mergedCounts = { ...defaultCounts, ...counts };

  const scrollToTab = useCallback((tabId: string) => {
    const position = tabPositions.current[tabId];
    if (position && scrollViewRef.current) {
      const screenWidth = Dimensions.get('window').width;
      const scrollX = Math.max(0, position.x - (screenWidth / 2) + (position.width / 2));
      scrollViewRef.current.scrollTo({ x: scrollX, animated: true });
    }
  }, []);

  const handleTabPress = useCallback((status: OrderStatusFilter) => {
    onStatusChange(status);
    scrollToTab(status);
  }, [onStatusChange, scrollToTab]);


  useEffect(() => {
    const position = tabPositions.current[selectedStatus];
    if (position) {
      Animated.parallel([
        Animated.spring(underlineAnim, {
          toValue: position.x,
          useNativeDriver: false,
          damping: 20,
          stiffness: 200,
        }),
        Animated.spring(underlineWidth, {
          toValue: position.width,
          useNativeDriver: false,
          damping: 20,
          stiffness: 200,
        }),
      ]).start();
    }
  }, [selectedStatus, underlineAnim, underlineWidth]);


  useEffect(() => {

    const timer = setTimeout(() => {
      scrollToTab(selectedStatus);
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedStatus, scrollToTab]);

  const tabBackgroundColor = isDark ? colors.grey[80] : colors.grey[5];

  return (
    <View style={[styles.wrapper, { backgroundColor: tabBackgroundColor, borderBottomColor: themeColors.border }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {statusOptions.map((option) => {
          const isSelected = selectedStatus === option.key;
          const count = mergedCounts[option.key];

          return (
            <TouchableOpacity
              key={option.key}
              onLayout={(event) => {
                const { x, width } = event.nativeEvent.layout;
                tabPositions.current[option.key] = { x, width };

                if (isSelected) {
                  underlineAnim.setValue(x);
                  underlineWidth.setValue(width);
                }
              }}
              style={styles.tab}
              onPress={() => handleTabPress(option.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isSelected
                      ? colors.primary.main
                      : themeColors.text.secondary,
                    fontFamily: isSelected ? fontFamily.semiBold : fontFamily.medium,
                  },
                ]}
              >
                {t(option.labelKey)} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}


        <Animated.View
          style={[
            styles.underline,
            {
              backgroundColor: colors.primary.main,
              left: underlineAnim,
              width: underlineWidth,
            },
          ]}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  tab: {
    paddingHorizontal: ms(16),
    paddingVertical: ms(12),
  },
  tabLabel: {
    fontSize: ms(14),
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    height: ms(2),
    borderRadius: ms(1),
  },
});

export default OrderStatusTabs;
