/**
 * Sentry Debug View
 * In-app component to test and verify Sentry integration in production
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import * as Sentry from '@sentry/react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from '../common';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';
import { SENTRY_DSN, APP_ENV } from '@env';

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'error';
  message: string;
}

export const SentryDebugView: React.FC = () => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const addLog = (type: LogEntry['type'], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, type, message }]);
  };

  useEffect(() => {
    // Initial status check
    checkSentryStatus();
  }, []);

  const checkSentryStatus = () => {
    setLogs([]);
    addLog('info', 'Checking Sentry configuration...');

    const dsnConfigured = !!SENTRY_DSN && SENTRY_DSN !== 'your_sentry_dsn_here';

    if (dsnConfigured) {
      addLog('success', 'DSN is configured');
      addLog('info', `DSN: ${SENTRY_DSN.substring(0, 50)}...`);
    } else {
      addLog('error', 'DSN is NOT configured');
    }

    addLog('info', `Environment: ${APP_ENV || 'unknown'}`);
    addLog('info', `Platform: ${Platform.OS} ${Platform.Version}`);
  };

  const sendTestMessage = async () => {
    setIsTesting(true);
    addLog('info', 'Sending test message to Sentry...');

    try {
      const eventId = Sentry.captureMessage(
        `[Test] Sentry test message from ${Platform.OS} - ${new Date().toISOString()}`,
        'info'
      );

      if (eventId) {
        addLog('success', `Message sent! Event ID: ${eventId}`);
      } else {
        addLog('error', 'Message sent but no event ID returned');
      }
    } catch (error: any) {
      addLog('error', `Failed to send message: ${error.message}`);
    }

    setIsTesting(false);
  };

  const sendTestError = async () => {
    setIsTesting(true);
    addLog('info', 'Sending test error to Sentry...');

    try {
      const testError = new Error(
        `[Test] Sentry test error from ${Platform.OS} - ${new Date().toISOString()}`
      );

      const eventId = Sentry.captureException(testError);

      if (eventId) {
        addLog('success', `Error captured! Event ID: ${eventId}`);
        addLog('info', 'Check Sentry dashboard for this error');
      } else {
        addLog('error', 'Error sent but no event ID returned');
      }
    } catch (error: any) {
      addLog('error', `Failed to send error: ${error.message}`);
    }

    setIsTesting(false);
  };

  const sendTestCrash = () => {
    Alert.alert(
      'Test Native Crash',
      'This will cause a native crash to test crash reporting. The app will close.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Crash App',
          style: 'destructive',
          onPress: () => {
            addLog('info', 'Triggering native crash...');
            Sentry.nativeCrash();
          },
        },
      ]
    );
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return colors.success.main;
      case 'error':
        return colors.error.main;
      default:
        return themeColors.text.secondary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text variant="h3" style={styles.title}>Sentry Debug</Text>

      {/* Status Section */}
      <View style={[styles.statusCard, { backgroundColor: themeColors.card }]}>
        <View style={styles.statusRow}>
          <Text variant="body" style={{ color: themeColors.text.secondary }}>
            Environment:
          </Text>
          <Text variant="body" style={{ color: colors.primary.main, fontWeight: '600' }}>
            {APP_ENV || 'unknown'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text variant="body" style={{ color: themeColors.text.secondary }}>
            DSN Configured:
          </Text>
          <Text
            variant="body"
            style={{
              color: SENTRY_DSN ? colors.success.main : colors.error.main,
              fontWeight: '600',
            }}>
            {SENTRY_DSN ? 'Yes' : 'No'}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary.main }]}
          onPress={checkSentryStatus}
          disabled={isTesting}>
          <Text variant="body" style={styles.buttonText}>Check Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.info.main }]}
          onPress={sendTestMessage}
          disabled={isTesting}>
          <Text variant="body" style={styles.buttonText}>Send Test Message</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.warning.main }]}
          onPress={sendTestError}
          disabled={isTesting}>
          <Text variant="body" style={styles.buttonText}>Send Test Error</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.error.main }]}
          onPress={sendTestCrash}
          disabled={isTesting}>
          <Text variant="body" style={styles.buttonText}>Test Native Crash</Text>
        </TouchableOpacity>
      </View>

      {/* Logs Section */}
      <View style={styles.logsHeader}>
        <Text variant="body" style={{ fontWeight: '600' }}>Logs</Text>
        <TouchableOpacity onPress={clearLogs}>
          <Text variant="caption" style={{ color: colors.primary.main }}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={[styles.logsContainer, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}
        contentContainerStyle={styles.logsContent}>
        {logs.length === 0 ? (
          <Text variant="caption" color="secondary" style={styles.emptyText}>
            No logs yet. Tap a button to test Sentry.
          </Text>
        ) : (
          logs.map((log, index) => (
            <View key={index} style={styles.logEntry}>
              <Text variant="caption" style={{ color: themeColors.text.hint }}>
                {log.timestamp}
              </Text>
              <Text
                variant="caption"
                style={[styles.logMessage, { color: getLogColor(log.type) }]}>
                {log.type === 'success' ? '✓ ' : log.type === 'error' ? '✗ ' : '• '}
                {log.message}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <Text variant="caption" color="hint" style={styles.footer}>
        Check results at: sentry.io → Issues
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  title: {
    marginBottom: spacing.md,
  },
  statusCard: {
    padding: spacing.md,
    borderRadius: ms(12),
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  buttonContainer: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  button: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: ms(8),
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  logsContainer: {
    flex: 1,
    borderRadius: ms(8),
    marginBottom: spacing.sm,
  },
  logsContent: {
    padding: spacing.sm,
  },
  logEntry: {
    marginBottom: spacing.xs,
  },
  logMessage: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: ms(12),
  },
  emptyText: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  footer: {
    textAlign: 'center',
  },
});

export default SentryDebugView;
