import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, NavigationProp } from '@react-navigation/native';
import { Camera, CameraType } from 'react-native-camera-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, Icon } from '../../components/common';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { spacing, ms } from '../../utils/responsive';
import { STORAGE_KEYS } from '../../utils/storage';
import { SettingsStackParamList } from '../../navigation/SettingsNavigator';

export interface TicketScanRecord {
  id: string;
  qrData: string;
  scannedAt: string;
  ticketCode?: string;
  orderCode?: string;
}

export const TicketScanScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<SettingsStackParamList>>();
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const [isScanning, setIsScanning] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  // Reset scanning state when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setIsScanning(true);
      setIsProcessing(false);
      processingRef.current = false;
    }, [])
  );

  const saveScanToHistory = async (qrData: string) => {
    try {
      const historyStr = await AsyncStorage.getItem(STORAGE_KEYS.TICKET_SCAN_HISTORY);
      const history: TicketScanRecord[] = historyStr ? JSON.parse(historyStr) : [];

      // Try to parse ticket info from QR data
      let ticketCode: string | undefined;
      let orderCode: string | undefined;
      try {
        const parsed = JSON.parse(qrData);
        ticketCode = parsed.ticket_code || parsed.ticketCode || parsed.ticket_number;
        orderCode = parsed.order_code || parsed.orderCode;
      } catch {
        // QR data might be a plain string (ticket code itself)
        ticketCode = qrData;
      }

      const record: TicketScanRecord = {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        qrData,
        scannedAt: new Date().toISOString(),
        ticketCode,
        orderCode,
      };

      // Add to beginning, keep max 100 records
      history.unshift(record);
      if (history.length > 100) {
        history.splice(100);
      }

      await AsyncStorage.setItem(STORAGE_KEYS.TICKET_SCAN_HISTORY, JSON.stringify(history));
      return record;
    } catch (error) {
      console.error('[TicketScan] Failed to save scan history:', error);
      return null;
    }
  };

  const handleBarCodeRead = async (event: any) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    setIsScanning(false);

    const qrData = event.nativeEvent?.codeStringValue || event.codeStringValue || '';

    const record = await saveScanToHistory(qrData);

    Alert.alert(
      'QR Code Scanned',
      record?.ticketCode
        ? `Ticket: ${record.ticketCode}${record.orderCode ? `\nOrder: ${record.orderCode}` : ''}`
        : `Data: ${qrData.substring(0, 100)}${qrData.length > 100 ? '...' : ''}`,
      [
        {
          text: 'Scan Again',
          onPress: () => {
            setIsScanning(true);
            setIsProcessing(false);
            processingRef.current = false;
          },
        },
        {
          text: 'Done',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleViewHistory = () => {
    navigation.navigate('TicketScanHistory');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.common.black }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleGoBack}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={ms(22)} color={colors.common.white} />
        </TouchableOpacity>
        <Text variant="h2" style={{ color: colors.common.white }}>Scan Ticket QR</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleViewHistory}
          activeOpacity={0.7}
        >
          <Icon name="history" size={ms(20)} color={colors.common.white} />
        </TouchableOpacity>
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        {isScanning && (
          <Camera
            style={styles.camera}
            cameraType={CameraType.Back}
            scanBarcode={true}
            onReadCode={handleBarCodeRead}
            showFrame={false}
          />
        )}

        {/* Scan overlay */}
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.scanFrame}>
              {/* Corner markers */}
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom}>
            <Text
              variant="bodySmall"
              style={styles.instructionText}
            >
              {isProcessing ? 'Processing...' : 'Align QR code within the frame'}
            </Text>
          </View>
        </View>

        {isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color={colors.primary.main} />
          </View>
        )}
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.common.white + '15' }]}
          onPress={handleViewHistory}
          activeOpacity={0.7}
        >
          <Icon name="history" size={ms(22)} color={colors.common.white} />
          <Text variant="caption" style={{ color: colors.common.white, marginTop: ms(4) }}>
            History
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const SCAN_FRAME_SIZE = ms(250);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerButton: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTop: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: SCAN_FRAME_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanFrame: {
    width: SCAN_FRAME_SIZE,
    height: SCAN_FRAME_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: ms(24),
    height: ms(24),
    borderColor: colors.primary.main,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: ms(4),
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: ms(4),
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: ms(4),
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: ms(4),
  },
  overlayBottom: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  instructionText: {
    color: colors.common.white,
    textAlign: 'center',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: ms(12),
    minWidth: ms(80),
  },
});

export default TicketScanScreen;
