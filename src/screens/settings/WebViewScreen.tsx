import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon } from '../../components/common';
import { colors } from '../../theme/colors';
import { ms, vs, spacing } from '../../utils/responsive';
import { SettingsStackParamList } from '../../navigation/SettingsNavigator';

type WebViewScreenRouteProp = RouteProp<SettingsStackParamList, 'WebView'>;

export const WebViewScreen: React.FC = () => {
  const { isDark } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<WebViewScreenRouteProp>();
  const { url, title } = route.params;
  const [isLoading, setIsLoading] = useState(true);

  const themeColors = isDark ? colors.dark : colors.light;
  const backgroundColor = themeColors.background;
  const textColor = themeColors.text.primary;
  const borderColor = themeColors.border;
  const cardColor = themeColors.card;

  const handleBack = () => {
    navigation.goBack();
  };

  // Inject CSS for dark mode - use filter to invert colors
  const darkModeCSS = `
    (function() {
      var style = document.createElement('style');
      style.type = 'text/css';
      style.innerHTML = \`
        html {
          filter: invert(1) hue-rotate(180deg) !important;
          background-color: #000000 !important;
        }
        img, video, picture, svg, [style*="background-image"] {
          filter: invert(1) hue-rotate(180deg) !important;
        }
      \`;
      document.documentElement.appendChild(style);
    })();
    true;
  `;

  const injectedCSS = isDark ? darkModeCSS : '';

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <SafeAreaView style={[styles.safeAreaTop, { backgroundColor }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: cardColor }]}
            onPress={handleBack}
            activeOpacity={0.7}>
            <Icon name="arrow-left" size={ms(24)} color={textColor} />
          </TouchableOpacity>
          <Text variant="h4" color="primary" style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <View style={[styles.webViewContainer, { backgroundColor }]}>
        <WebView
          source={{ uri: url }}
          style={[styles.webView, { backgroundColor, opacity: isLoading ? 0 : 1 }]}
          containerStyle={{ backgroundColor }}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          injectedJavaScriptBeforeContentLoaded={injectedCSS}
          injectedJavaScript={injectedCSS}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          {...(Platform.OS === 'android' && {
            androidLayerType: 'hardware',
            overScrollMode: 'never',
          })}
          {...(Platform.OS === 'ios' && {
            allowsInlineMediaPlayback: true,
          })}
        />
        {isLoading && (
          <View style={[styles.loadingOverlay, { backgroundColor }]}>
            <ActivityIndicator size="large" color={colors.primary.main} />
          </View>
        )}
      </View>

      <SafeAreaView style={[styles.safeAreaBottom, { backgroundColor }]} edges={['bottom']} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeAreaTop: {
    flexShrink: 0,
  },
  safeAreaBottom: {
    flexShrink: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: vs(12),
    borderBottomWidth: 1,
  },
  backButton: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ms(10),
  },
  headerTitle: {
    flex: 1,
  },
  headerSpacer: {
    width: ms(40),
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default WebViewScreen;
