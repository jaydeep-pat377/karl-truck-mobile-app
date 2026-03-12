import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from './Text';
import { Icon } from './Icon';
import { ms, spacing } from '../../utils/responsive';
import { colors } from '../../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: number | 'auto' | 'full';
  showHandle?: boolean;
  showCloseButton?: boolean;
  headerIcon?: string;
  headerIconColor?: string;
  closeOnBackdrop?: boolean;
  disableScroll?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  height = 'auto',
  showHandle = true,
  showCloseButton = true,
  headerIcon,
  headerIconColor = colors.primary.main,
  closeOnBackdrop = true,
  disableScroll = false,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const isClosing = useRef(false);

  const sheetHeight: number = height === 'full'
    ? SCREEN_HEIGHT - insets.top - ms(20)
    : height === 'auto'
      ? SCREEN_HEIGHT * 0.85
      : (height as number);

  const openSheet = useCallback(() => {
    isClosing.current = false;
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 12,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, backdropAnim]);

  const closeSheet = useCallback(() => {
    if (isClosing.current) return;
    isClosing.current = true;

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [slideAnim, backdropAnim, onClose]);

  useEffect(() => {
    if (visible) {

      slideAnim.setValue(SCREEN_HEIGHT);
      backdropAnim.setValue(0);
      openSheet();
    }
  }, [visible, openSheet, slideAnim, backdropAnim]);

  const handleBackdropPress = () => {
    if (closeOnBackdrop) {
      closeSheet();
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeSheet}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >

        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <Animated.View
            style={[
              styles.backdrop,
              { opacity: backdropAnim },
            ]}
          />
        </TouchableWithoutFeedback>


        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: themeColors.card,
              height: sheetHeight,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >

          {showHandle && (
            <View style={styles.handleContainer}>
              <View
                style={[
                  styles.handle,
                  { backgroundColor: isDark ? colors.grey[50] : colors.grey[25] },
                ]}
              />
            </View>
          )}


          {(title || showCloseButton) && (
            <View style={[
              styles.header,
              { borderBottomColor: isDark ? themeColors.border : colors.grey[10] }
            ]}>
              <View style={styles.headerLeft}>
                {headerIcon && (
                  <View
                    style={[
                      styles.headerIconContainer,
                      { backgroundColor: headerIconColor + '15' },
                    ]}
                  >
                    <Icon name={headerIcon} size={ms(20)} color={headerIconColor} />
                  </View>
                )}
                <View style={styles.headerTextContainer}>
                  {title && (
                    <Text
                      variant="h4"
                      color="primary"
                      style={styles.title}
                      numberOfLines={1}
                    >
                      {title}
                    </Text>
                  )}
                  {subtitle && (
                    <Text
                      variant="caption"
                      color="secondary"
                      numberOfLines={1}
                    >
                      {subtitle}
                    </Text>
                  )}
                </View>
              </View>
              {showCloseButton && (
                <TouchableOpacity
                  style={[
                    styles.closeButton,
                    { backgroundColor: isDark ? colors.grey[60] + '30' : colors.grey[10] },
                  ]}
                  onPress={closeSheet}
                  activeOpacity={0.7}
                >
                  <Icon
                    name="close"
                    size={ms(18)}
                    color={themeColors.text.secondary}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}


{disableScroll ? (
            <View
              style={[
                styles.scrollView,
                styles.contentContainer,
                { paddingBottom: insets.bottom + ms(32) }
              ]}
            >
              {children}
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={[
                styles.contentContainer,
                { paddingBottom: insets.bottom + ms(32) }
              ]}
              showsVerticalScrollIndicator={true}
              bounces={true}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay.medium,
  },
  sheet: {
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: ms(12),
  },
  handle: {
    width: ms(40),
    height: ms(4),
    borderRadius: ms(2),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: ms(16),
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: ms(12),
  },
  headerIconContainer: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    marginBottom: 0,
  },
  closeButton: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: ms(12),
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: ms(16),
  },
});

export default BottomSheet;
