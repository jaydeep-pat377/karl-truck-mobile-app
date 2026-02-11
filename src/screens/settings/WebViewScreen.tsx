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


  const baseCSS = `
    html, body {
      margin: 0 !important;
      padding: 0 !important;
    }
    body > *:first-child {
      margin-top: 0 !important;
      padding-top: 0 !important;
    }
    a[href*="back"],
    a:contains("Back"),
    .back-button,
    .back-link,
    [class*="back"],
    a[onclick*="back"],
    a[href="javascript:history.back()"] {
      display: none !important;
    }
  `;

  const darkModeExtraCSS = `
    html {
      filter: invert(1) hue-rotate(180deg) !important;
      background-color: #ffffff !important;
    }
    body {
      background-color: #ffffff !important;
    }
    img, video, picture, svg, [style*="background-image"] {
      filter: invert(1) hue-rotate(180deg) !important;
    }
  `;

  const injectedJS = `
    (function() {
      var style = document.createElement('style');
      style.type = 'text/css';
      style.innerHTML = \`${baseCSS}${isDark ? darkModeExtraCSS : ''}\`;
      document.documentElement.appendChild(style);

      setTimeout(function() {
        var links = document.querySelectorAll('a');
        links.forEach(function(link) {
          if (link.textContent.trim().toLowerCase().includes('back')) {
            link.style.display = 'none';
          }
        });
      }, 100);
    })();
    true;
  `;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <SafeAreaView style={[styles.safeAreaTop,
      { backgroundColor }]} edges={['top']}>
        <View style={[styles.header,
        {
          borderBottomColor: borderColor,
          backgroundColor
        }]}>
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
          injectedJavaScriptBeforeContentLoaded={injectedJS}
          injectedJavaScript={injectedJS}
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

      <SafeAreaView style={[styles.safeAreaBottom,
      { backgroundColor, paddingBottom: ms(50) }]} edges={['bottom']} />
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
    paddingBottom: vs(2),
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
