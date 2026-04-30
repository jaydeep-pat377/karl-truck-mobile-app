import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import Pdf from 'react-native-pdf';
import { useTranslation } from 'react-i18next';
import { Text, Icon } from '../../components/common';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { spacing, ms } from '../../utils/responsive';
import { SettingsStackParamList } from '../../navigation/SettingsNavigator';

type RouteProps = RouteProp<SettingsStackParamList, 'PdfViewer'>;

export const PdfViewerScreen: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const { filePath, title } = route.params;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: themeColors.surface }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={ms(22)} color={themeColors.text.primary} />
        </TouchableOpacity>
        <Text variant="h2" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
          {title || t('pdfViewer.title')}
        </Text>
        <View style={styles.headerButton} />
      </View>

      <Pdf
        source={{ uri: filePath }}
        style={styles.pdf}
        enablePaging
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  headerButton: {
    width: ms(32), height: ms(32), borderRadius: ms(8),
    justifyContent: 'center', alignItems: 'center',
  },
  pdf: { flex: 1 },
});

export default PdfViewerScreen;
