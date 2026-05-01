import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
  Vibration,
  Modal,
  Pressable,
  useWindowDimensions,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, NavigationProp } from '@react-navigation/native';
import { Camera, CameraType } from 'react-native-camera-kit';
import { Text, Icon } from '../../components/common';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing, ms } from '../../utils/responsive';
import { isTKQR, isTKPipeQR } from '../../utils/qrDetection';
import { verifyQRPayload } from '../../api/services/qrService';
import { saveScanRecord, getScanHistory } from '../../utils/scanStorage';
import type { ScanRecord } from '../../types/qrScan';
import { SettingsStackParamList } from '../../navigation/SettingsNavigator';

type FeedbackState = 'idle' | 'success' | 'error' | 'processing';

const CORNER_LENGTH = ms(28);
const CORNER_THICKNESS = 3;
const CORNER_RADIUS = ms(14);

export const TicketScanScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<SettingsStackParamList>>();
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const scannerTheme = isDark ? colors.scanner.dark : colors.scanner.light;
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { user } = useAuthStore();

  const [isActive, setIsActive] = useState(true);
  const [flashOn, setFlashOn] = useState(false);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('idle');
  const [historyCount, setHistoryCount] = useState(0);
  const isProcessing = useRef(false);
  const scanCooldownRef = useRef(false);
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SCAN_AREA_SIZE = Math.min(screenWidth * 0.65, ms(260));

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const cornerPulseAnim = useRef(new Animated.Value(0.6)).current;
  const feedbackScaleAnim = useRef(new Animated.Value(0.3)).current;
  const feedbackOpacityAnim = useRef(new Animated.Value(0)).current;
  const scanLineGlowAnim = useRef(new Animated.Value(0.5)).current;
  const historyBtnScale = useRef(new Animated.Value(1)).current;

  // Error sheet state
  const [errorSheetVisible, setErrorSheetVisible] = useState(false);
  const [errorSheetTitle, setErrorSheetTitle] = useState('');
  const [errorSheetMessage, setErrorSheetMessage] = useState('');
  const [errorSheetIcon, setErrorSheetIcon] = useState('alert-circle-outline');
  const [errorSheetDismissable, setErrorSheetDismissable] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (navTimeoutRef.current) {
        clearTimeout(navTimeoutRef.current);
        navTimeoutRef.current = null;
      }
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }

      setIsActive(true);

      scanCooldownRef.current = true;
      const cooldown = setTimeout(() => {
        scanCooldownRef.current = false;
        isProcessing.current = false;
        setFeedbackState('idle');
      }, 800);

      const loadCount = async () => {
        try {
          const result = await getScanHistory(1, 1);
          setHistoryCount(result?.pagination?.total ?? result?.records?.length ?? 0);
        } catch {
          setHistoryCount(0);
        }
      };
      loadCount();

      return () => {
        clearTimeout(cooldown);
        if (logoutTimerRef.current) {
          clearTimeout(logoutTimerRef.current);
          logoutTimerRef.current = null;
        }
        setIsActive(false);
        setErrorSheetVisible(false);
      };
    }, []),
  );

  // Scan line animation
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [scanLineAnim]);

  // Corner pulse animation
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(cornerPulseAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(cornerPulseAnim, {
          toValue: 0.5,
          duration: 1400,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [cornerPulseAnim]);

  // Scan line glow animation
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineGlowAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineGlowAnim, {
          toValue: 0.5,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [scanLineGlowAnim]);

  const showFeedback = useCallback(
    (state: 'success' | 'error') => {
      setFeedbackState(state);
      feedbackScaleAnim.setValue(0.3);
      feedbackOpacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(feedbackScaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(feedbackOpacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [feedbackScaleAnim, feedbackOpacityAnim],
  );

  const showErrorSheet = useCallback((title: string, message: string, icon = 'alert-circle-outline', dismissable = true) => {
    setFeedbackState('idle');
    setErrorSheetTitle(title);
    setErrorSheetMessage(message);
    setErrorSheetIcon(icon);
    setErrorSheetDismissable(dismissable);
    setErrorSheetVisible(true);
  }, []);

  const dismissErrorSheet = useCallback(() => {
    if (!errorSheetDismissable) return;
    setErrorSheetVisible(false);
    isProcessing.current = false;
    scanCooldownRef.current = false;
  }, [errorSheetDismissable]);

  const processScanResult = useCallback(
    async (data: string, type: string) => {
      try {
        const scanRecord: ScanRecord = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          data,
          type,
          timestamp: Date.now(),
        };

        const isTK = isTKQR(data);
        const isPipe = isTKPipeQR(data);

        if (isTK || isPipe) {
          setFeedbackState('processing');

          const result = await verifyQRPayload(data, (user as any)?.userRole);

          if (result.status === 'unauthorized') {
            showErrorSheet('Not Authorized', result.message || 'You are not authorized as a QR user.', 'lock-outline', false);
            logoutTimerRef.current = setTimeout(() => {
              logoutTimerRef.current = null;
              useAuthStore.getState().logout();
            }, 3000);
            return;
          }

          if (result.status === 'not_found') {
            showErrorSheet('Ticket Not Found', result.message || 'Ticket not found', 'magnify');
            return;
          }

          if (result.status === 'error') {
            showErrorSheet('Unable to Scan', result.message || 'Verification failed', 'alert-circle-outline');
            return;
          }

          if (result.status === 'offline') {
            showErrorSheet('No Connection', result.message || 'Network error', 'cloud-off-outline');
            return;
          }

          scanRecord.verified = result.status;
          if (result.qrData) scanRecord.tkData = result.qrData;
          if (result.apiData) scanRecord.apiData = result.apiData;

          showFeedback('success');
          await saveScanRecord(scanRecord);
          setHistoryCount(prev => prev + 1);

          scanCooldownRef.current = true;
          navTimeoutRef.current = setTimeout(() => {
            navTimeoutRef.current = null;
            navigation.navigate('ScanDetails', { scan: scanRecord });
          }, 650);
          return;
        }

        // Non-TK QR code
        showFeedback('success');
        await saveScanRecord(scanRecord);
        setHistoryCount(prev => prev + 1);

        scanCooldownRef.current = true;
        navTimeoutRef.current = setTimeout(() => {
          navTimeoutRef.current = null;
          navigation.navigate('ScanDetails', { scan: scanRecord });
        }, 650);
      } catch (err) {
        showErrorSheet('Something Went Wrong', 'Please try scanning again.', 'alert-circle-outline');
      }
    },
    [navigation, showFeedback, showErrorSheet, user],
  );

  const handleBarCodeRead = useCallback((event: any) => {
    if (isProcessing.current || scanCooldownRef.current) return;

    const qrData = event.nativeEvent?.codeStringValue || event.codeStringValue || '';
    if (!qrData) return;

    isProcessing.current = true;
    Vibration.vibrate(Platform.OS === 'ios' ? 10 : 50);
    processScanResult(qrData, 'qr');
  }, [processScanResult]);

  const handleGoBack = () => navigation.goBack();

  const handleViewHistory = () => navigation.navigate('TicketScanHistory');

  const onHistoryPressIn = useCallback(() => {
    Animated.spring(historyBtnScale, {
      toValue: 0.92,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [historyBtnScale]);

  const onHistoryPressOut = useCallback(() => {
    Animated.spring(historyBtnScale, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [historyBtnScale]);

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_AREA_SIZE - 4],
  });

  const isScanning = feedbackState === 'idle';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {isActive && (
        <Camera
          style={StyleSheet.absoluteFill}
          cameraType={CameraType.Back}
          scanBarcode={true}
          onReadCode={handleBarCodeRead}
          showFrame={false}
          torchMode={flashOn ? 'on' : 'off'}
        />
      )}

      <View style={styles.overlay}>
        {/* Top overlay */}
        <View style={styles.overlayTop}>
          {/* Top bar */}
          <View style={[styles.topBar, { paddingTop: insets.top + ms(8) }]}>
            <TouchableOpacity
              style={styles.topIconBtn}
              onPress={handleGoBack}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="arrow-left" size={ms(18)} color={colors.common.white} />
            </TouchableOpacity>

            <Text variant="body" style={styles.brandName}>
              Scan QR
            </Text>

            <View style={styles.topBarSpacer} />

            <Animated.View style={{ transform: [{ scale: historyBtnScale }] }}>
              <TouchableOpacity
                style={styles.topIconBtn}
                onPress={handleViewHistory}
                onPressIn={onHistoryPressIn}
                onPressOut={onHistoryPressOut}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="history" size={ms(18)} color={colors.common.white} />
                {historyCount > 0 && (
                  <View style={styles.topIconBadge}>
                    <Text variant="captionSmall" style={styles.topIconBadgeText}>
                      {historyCount > 99 ? '99+' : historyCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Instructions */}
          <View style={styles.instructionArea}>
            <Text variant="h2" style={styles.headerTitle}>Scan QR Code</Text>
            <Text variant="caption" style={styles.headerSubtitle}>
              Position the QR code within the frame
            </Text>
          </View>
        </View>

        {/* Middle row - scan area */}
        <View style={styles.overlayMiddleRow}>
          <View style={styles.overlaySide} />
          <View style={[styles.scanArea, { width: SCAN_AREA_SIZE, height: SCAN_AREA_SIZE }]}>
            {/* Animated corners */}
            <Animated.View style={[styles.corner, styles.cornerTL, { opacity: cornerPulseAnim }]} />
            <Animated.View style={[styles.corner, styles.cornerTR, { opacity: cornerPulseAnim }]} />
            <Animated.View style={[styles.corner, styles.cornerBL, { opacity: cornerPulseAnim }]} />
            <Animated.View style={[styles.corner, styles.cornerBR, { opacity: cornerPulseAnim }]} />

            {/* Scan line */}
            {isScanning && (
              <Animated.View
                style={[
                  styles.scanLineWrap,
                  { transform: [{ translateY: scanLineTranslateY }] },
                ]}
              >
                <Animated.View style={[styles.scanLineGlow, { opacity: scanLineGlowAnim }]} />
                <View style={styles.scanLine} />
              </Animated.View>
            )}

            {/* Processing indicator */}
            {feedbackState === 'processing' && (
              <View style={styles.feedbackCenter}>
                <ActivityIndicator size="large" color={colors.common.white} />
                <Text variant="caption" style={styles.feedbackLabel}>Verifying...</Text>
              </View>
            )}

            {/* Success feedback */}
            {feedbackState === 'success' && (
              <Animated.View
                style={[
                  styles.feedbackCenter,
                  {
                    opacity: feedbackOpacityAnim,
                    transform: [{ scale: feedbackScaleAnim }],
                  },
                ]}
              >
                <View style={styles.successCircle}>
                  <Icon name="check" size={ms(30)} color={colors.common.white} />
                </View>
                <Text variant="caption" style={styles.feedbackLabel}>Scanned!</Text>
              </Animated.View>
            )}
          </View>
          <View style={styles.overlaySide} />
        </View>

        {/* Bottom overlay */}
        <View style={styles.overlayBottom}>
          <TouchableOpacity
            style={[styles.flashBtn, flashOn && styles.flashBtnActive]}
            onPress={() => setFlashOn(prev => !prev)}
            activeOpacity={0.7}
          >
            <Icon
              name={flashOn ? 'flash' : 'flash-outline'}
              size={ms(18)}
              color={flashOn ? colors.common.black : colors.common.white}
            />
            <Text
              variant="caption"
              style={[styles.flashBtnLabel, flashOn && styles.flashBtnLabelActive]}
            >
              {flashOn ? 'On' : 'Flash'}
            </Text>
          </TouchableOpacity>

          <Text variant="captionSmall" style={styles.authHint}>
            Authorized scanning only
          </Text>
        </View>
      </View>

      {/* Error Bottom Sheet — theme-aware */}
      <Modal
        visible={errorSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={dismissErrorSheet}
      >
        <Pressable style={styles.errorSheetOverlay} onPress={dismissErrorSheet}>
          <Pressable
            style={[
              styles.errorSheetCard,
              {
                backgroundColor: themeColors.surface,
                paddingBottom: Math.max(insets.bottom, ms(24)),
              },
            ]}
            onPress={() => {}}
          >
            <View style={[styles.errorSheetHandle, { backgroundColor: scannerTheme.errorSheetHandle }]} />
            <View style={styles.errorSheetIconCircle}>
              <Icon name={errorSheetIcon} size={ms(32)} color={colors.common.white} />
            </View>
            <Text variant="h3" style={[styles.errorSheetTitle, { color: scannerTheme.errorSheetTitle }]}>
              {errorSheetTitle}
            </Text>
            <Text variant="body" style={[styles.errorSheetMessage, { color: scannerTheme.errorSheetMessage }]}>
              {errorSheetMessage}
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.common.black,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: colors.scanner.light.overlay,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  topIconBtn: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    backgroundColor: colors.scanner.light.controlBackground,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  topIconBadge: {
    position: 'absolute',
    top: -ms(5),
    right: -ms(5),
    backgroundColor: colors.primary.main,
    borderRadius: ms(9),
    minWidth: ms(18),
    height: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ms(4),
    borderWidth: 1.5,
    borderColor: colors.common.black,
  },
  topIconBadgeText: {
    fontSize: ms(9),
    color: colors.common.white,
    fontWeight: '700',
  },
  brandName: {
    color: colors.common.white,
    fontWeight: '700',
    marginLeft: spacing.sm,
    letterSpacing: 0.5,
  },
  topBarSpacer: {
    flex: 1,
  },
  instructionArea: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  headerTitle: {
    color: colors.common.white,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    color: colors.scanner.light.textSecondary,
    letterSpacing: 0.3,
  },
  overlayMiddleRow: {
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: colors.scanner.light.overlay,
  },
  scanArea: {
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: CORNER_LENGTH,
    height: CORNER_LENGTH,
    borderColor: colors.primary.main,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: CORNER_RADIUS,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: CORNER_RADIUS,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: CORNER_RADIUS,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: CORNER_RADIUS,
  },
  scanLineWrap: {
    position: 'absolute',
    left: CORNER_LENGTH / 2,
    right: CORNER_LENGTH / 2,
    height: ms(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLineGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ms(20),
    backgroundColor: colors.primary.main,
    opacity: 0.15,
    borderRadius: ms(10),
  },
  scanLine: {
    height: 2,
    width: '100%',
    backgroundColor: colors.primary.main,
    borderRadius: 1,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  feedbackCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.scanner.light.feedbackOverlay,
  },
  successCircle: {
    width: ms(68),
    height: ms(68),
    borderRadius: ms(34),
    backgroundColor: colors.success.main,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.success.main,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  feedbackLabel: {
    color: colors.common.white,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: colors.scanner.light.overlay,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  flashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.scanner.light.controlBackground,
    borderRadius: ms(20),
    paddingVertical: ms(8),
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  flashBtnActive: {
    backgroundColor: colors.scanner.light.flashlightActive,
  },
  flashBtnLabel: {
    color: colors.common.white,
    fontWeight: '600',
    fontSize: ms(13),
  },
  flashBtnLabelActive: {
    color: colors.common.black,
  },
  authHint: {
    color: colors.scanner.light.hintText,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  // Error sheet
  errorSheetOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.medium,
    justifyContent: 'flex-end',
  },
  errorSheetCard: {
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  errorSheetHandle: {
    width: ms(40),
    height: ms(4),
    borderRadius: ms(2),
    marginBottom: spacing.xl,
  },
  errorSheetIconCircle: {
    width: ms(68),
    height: ms(68),
    borderRadius: ms(34),
    backgroundColor: colors.error.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.error.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  errorSheetTitle: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorSheetMessage: {
    textAlign: 'center',
    lineHeight: ms(22),
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
});

export default TicketScanScreen;
