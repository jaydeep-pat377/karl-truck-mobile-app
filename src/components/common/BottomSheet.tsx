import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from './Text';
import { Icon } from './Icon';
import { ms, spacing } from '../../utils/responsive';
import { colors } from '../../theme/colors';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** 'content' wraps the children's height (capped at 90%); 'auto' = 85%; 'full' = near full-screen. */
  height?: number | 'auto' | 'full' | 'content';
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
  const { height: screenHeight } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const isClosing = useRef(false);

  const isContent = height === 'content';
  const maxSheetHeight = screenHeight - insets.top - ms(20);
  const sheetHeight: number = height === 'full'
    ? maxSheetHeight
    : height === 'auto'
      ? screenHeight * 0.85
      : isContent
        ? 0 // unused — content mode wraps the children instead
        : (height as number);

  const openSheet = useCallback(() => {
    isClosing.current = false;
    Animated.parallel([
      // slideAnim uses the JS driver so it can follow the finger during a
      // swipe-to-close drag (setValue on a native-driven value won't move it).
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: false,
        tension: 50,
        friction: 12,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [slideAnim, backdropAnim]);

  const closeSheet = useCallback(() => {
    if (isClosing.current) return;
    isClosing.current = true;

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(() => {
      onClose();
    });
  }, [slideAnim, backdropAnim, onClose, screenHeight]);

  // Swipe-down-to-close: attached to the handle + header so it never fights
  // the scrollable content below.
  const closeRef = useRef(closeSheet);
  closeRef.current = closeSheet;
  const springBack = useCallback(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 60,
      friction: 12,
    }).start();
  }, [slideAnim]);
  const dragResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e: any, g: { dx: number; dy: number }) =>
        g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onMoveShouldSetPanResponderCapture: (_e: any, g: { dx: number; dy: number }) =>
        g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e: any, g: { dy: number }) => {
        if (g.dy > 0) slideAnim.setValue(g.dy);
      },
      onPanResponderRelease: (_e: any, g: { dy: number; vy: number }) => {
        if (g.dy > 90 || g.vy > 0.8) closeRef.current();
        else springBack();
      },
      onPanResponderTerminate: () => springBack(),
    }),
  ).current;

  useEffect(() => {
    if (visible) {

      slideAnim.setValue(screenHeight);
      backdropAnim.setValue(0);
      openSheet();
    }
  }, [visible, openSheet, slideAnim, backdropAnim, screenHeight]);

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
              transform: [{ translateY: slideAnim }],
            },
            isContent ? { maxHeight: maxSheetHeight } : { height: sheetHeight },
          ]}
        >

          <View {...dragResponder.panHandlers}>
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
          </View>

          {disableScroll ? (
            <View
              style={[
                !isContent && styles.scrollView,
                styles.contentContainer,
                { paddingBottom: insets.bottom + ms(16) }
              ]}
            >
              {children}
            </View>
          ) : (
            <ScrollView
              style={isContent ? styles.scrollViewContent : styles.scrollView}
              contentContainerStyle={[
                styles.contentContainer,
                { paddingBottom: insets.bottom + ms(16) }
              ]}
              showsVerticalScrollIndicator={!isContent}
              bounces={!isContent}
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
  scrollViewContent: {
    flexGrow: 0,
    flexShrink: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: ms(16),
  },
});

export default BottomSheet;
