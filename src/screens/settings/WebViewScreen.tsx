import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon } from '../../components/common';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';
import { RootStackParamList } from '../../navigation/types';

type WebViewScreenRouteProp = RouteProp<RootStackParamList, 'WebView'>;

export const WebViewScreen: React.FC = () => {
  const { isDark } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<WebViewScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { url, title } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

  const themeColors = isDark ? colors.dark : colors.light;
  const backgroundColor = themeColors.background;
  const textColor = themeColors.text.primary;
  const borderColor = themeColors.border;
  const cardColor = themeColors.card;

  const handleBack = () => {
    navigation.goBack();
  };


  const injectedJS = `
    (function() {
      var style = document.createElement('style');
      style.innerHTML = 'a[href*="back"], a:contains("Back"), [class*="back"], .back-link, .back-button, a[onclick*="back"], button:contains("Back") { display: none !important; } a svg { display: none !important; }';
      document.head.appendChild(style);

      // Hide elements containing "Back" text at the top
      var links = document.querySelectorAll('a');
      links.forEach(function(link) {
        if (link.textContent.trim() === 'Back' || link.textContent.trim() === '← Back') {
          link.style.display = 'none';
        }
      });

      // Also try to hide by checking for back navigation patterns
      var allElements = document.querySelectorAll('a, button, div');
      allElements.forEach(function(el) {
        var text = el.textContent.trim();
        if ((text === 'Back' || text === '← Back' || text === '< Back') && el.tagName !== 'BODY') {
          el.style.display = 'none';
        }
      });
    })();
    true;
  `;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={backgroundColor} />


      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, backgroundColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: isDark ? colors.grey[80] : colors.grey[10] }]}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={ms(20)} color={textColor} />
        </TouchableOpacity>
        <Text variant="h4" style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>


      {isLoading && loadProgress > 0 && loadProgress < 1 && (
        <View style={[styles.progressBarContainer, { backgroundColor: isDark ? colors.grey[80] : colors.grey[20] }]}>
          <View style={[styles.progressBar, { width: `${loadProgress * 100}%`, backgroundColor: colors.primary.main }]} />
        </View>
      )}


      <View style={styles.webViewContainer}>
        <WebView
          source={{ uri: url }}
          style={[styles.webView, { opacity: isLoading ? 0.3 : 1 }]}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onLoadProgress={({ nativeEvent }) => setLoadProgress(nativeEvent.progress)}
          injectedJavaScript={injectedJS}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
          scalesPageToFit
          originWhitelist={['*']}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          {...(Platform.OS === 'android' && {
            androidLayerType: 'hardware',
            overScrollMode: 'never',
            mixedContentMode: 'compatibility',
          })}
          {...(Platform.OS === 'ios' && {
            allowsBackForwardNavigationGestures: true,
          })}
        />
        {isLoading && (
          <View style={[styles.loadingOverlay, { backgroundColor: isDark ? colors.semiTransparent.black80 : colors.semiTransparent.white80 }]}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text variant="caption" color="secondary" style={styles.loadingText}>
              Loading...
            </Text>
          </View>
        )}
      </View>


      <View style={{ height: insets.bottom, backgroundColor }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: ms(16),
    fontWeight: '600',
  },
  headerSpacer: {
    width: ms(36),
  },
  progressBarContainer: {
    height: 2,
  },
  progressBar: {
    height: '100%',
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
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
  loadingText: {
    marginTop: spacing.sm,
  },
});

export default WebViewScreen;
