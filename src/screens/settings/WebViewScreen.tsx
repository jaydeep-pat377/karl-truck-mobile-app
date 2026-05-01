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

  // Detect PDF URLs — PDFs must not have injected CSS/JS
  const isPdf = /\.pdf(\?.*)?$/i.test(url);

  const themeColors = isDark ? colors.dark : colors.light;
  const backgroundColor = themeColors.background;
  const textColor = themeColors.text.primary;
  const borderColor = themeColors.border;
  const cardColor = themeColors.card;

  const handleBack = () => {
    navigation.goBack();
  };


  // Get theme colors as simple strings
  const darkBg = colors.dark.background;
  const darkText = colors.dark.text.primary;
  const darkSecondary = colors.dark.text.secondary;
  const darkBorder = colors.dark.border;
  const lightBg = colors.light.background;
  const lightText = colors.light.text.primary;
  const lightSecondary = colors.light.text.secondary;
  const primaryColor = colors.primary.main;

  // Build CSS strings without template literals for iOS compatibility
  const hideBackCSS = 'a[href="/sms-optin"], a[href*="sms-optin"], .lucide-arrow-left, svg.lucide-arrow-left, [class*="lucide-arrow-left"], [class*="arrow-left"], a.inline-flex.items-center, a[class*="inline-flex"][class*="items-center"] { display: none !important; visibility: hidden !important; }';

  const darkThemeCSS = 'html, body, div, section, article, main, header, footer, nav, aside { background-color: ' + darkBg + ' !important; } * { color: ' + darkText + ' !important; } h1, h2, h3, h4, h5, h6, p, span, li, ul, ol, td, th, label, strong, em, b, i, blockquote, pre, code { color: ' + darkText + ' !important; } a, a:visited, a:hover, a:active { color: ' + primaryColor + ' !important; } .text-muted-foreground, [class*="muted"], [class*="secondary"], small { color: ' + darkSecondary + ' !important; }';

  const lightThemeCSS = 'html, body, div, section, article, main, header, footer, nav, aside { background-color: ' + lightBg + ' !important; } * { color: ' + lightText + ' !important; } h1, h2, h3, h4, h5, h6, p, span, li, ul, ol, td, th, label, strong, em, b, i, blockquote, pre, code { color: ' + lightText + ' !important; } a, a:visited, a:hover, a:active { color: ' + primaryColor + ' !important; } .text-muted-foreground, [class*="muted"], [class*="secondary"], small { color: ' + lightSecondary + ' !important; }';

  const themeCSS = isDark ? darkThemeCSS : lightThemeCSS;

  const getInjectedJS = () => {
    const fullCSS = hideBackCSS + ' ' + themeCSS;
    return '(function() { var style = document.createElement("style"); style.type = "text/css"; style.id = "app-theme-style"; var css = "' + fullCSS.replace(/"/g, '\\"') + '"; style.appendChild(document.createTextNode(css)); (document.head || document.documentElement).appendChild(style); function hideBackElements() { var links = document.querySelectorAll("a"); for (var i = 0; i < links.length; i++) { var link = links[i]; var href = link.getAttribute("href") || ""; var text = link.textContent || ""; if (href.indexOf("sms-optin") !== -1 || text.trim() === "Back") { link.style.cssText = "display: none !important;"; if (link.parentElement) { link.parentElement.style.cssText = "display: none !important;"; } } } var svgs = document.querySelectorAll("svg"); for (var j = 0; j < svgs.length; j++) { var svg = svgs[j]; var className = svg.getAttribute("class") || ""; if (className.indexOf("arrow-left") !== -1 || className.indexOf("lucide") !== -1) { svg.style.cssText = "display: none !important;"; var parent = svg.parentElement; if (parent && parent.tagName === "A") { parent.style.cssText = "display: none !important;"; } } } } hideBackElements(); document.addEventListener("DOMContentLoaded", hideBackElements); setTimeout(hideBackElements, 100); setTimeout(hideBackElements, 500); setTimeout(hideBackElements, 1000); })(); true;';
  };

  const injectedJS = getInjectedJS();

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundColor}
        translucent={Platform.OS === 'android'}
      />

      {/* Status bar background for iOS */}
      {Platform.OS === 'ios' && (
        <View style={[styles.statusBarBackground, { height: insets.top, backgroundColor }]} />
      )}

      <View style={[
        styles.header,
        {
          paddingTop: Platform.OS === 'ios' ? spacing.sm : insets.top + spacing.sm,
          backgroundColor,
          borderBottomColor: borderColor,
        },
      ]}>
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
          key={isPdf ? 'pdf' : isDark ? 'dark' : 'light'}
          source={{ uri: url }}
          style={[styles.webView, { opacity: isLoading ? 0.3 : 1 }]}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onLoadProgress={({ nativeEvent }) => setLoadProgress(nativeEvent.progress)}
          {...(!isPdf && {
            injectedJavaScriptBeforeContentLoaded: injectedJS,
            injectedJavaScript: injectedJS,
          })}
          injectedJavaScriptForMainFrameOnly={true}
          javaScriptEnabled={!isPdf}
          domStorageEnabled={true}
          startInLoadingState={false}
          scalesPageToFit={true}
          originWhitelist={['*']}
          allowsFullscreenVideo={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          cacheEnabled={isPdf}
          incognito={!isPdf}
          {...(Platform.OS === 'android' && {
            androidLayerType: 'hardware',
            overScrollMode: 'never',
            mixedContentMode: 'compatibility',
          })}
          {...(Platform.OS === 'ios' && {
            allowsBackForwardNavigationGestures: false,
            allowsLinkPreview: false,
            sharedCookiesEnabled: false,
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


      <View style={{ height: insets.bottom + spacing.xxxl, backgroundColor }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBarBackground: {
    width: '100%',
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
