import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { SettingsStackParamList } from '../../navigation/SettingsNavigator';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Card, Icon } from '../../components/common';
import { colors } from '../../theme/colors';
import { spacing, ms } from '../../utils/responsive';
import { useEmailTemplates } from '../../hooks/useEmailTemplates';
import { EmailTemplate, EmailTemplateDefault } from '../../types/emailTemplate';

interface TemplateRow {
  templateDefault: EmailTemplateDefault;
  customTemplate: EmailTemplate | undefined;
}

interface Section {
  title: string;
  data: TemplateRow[];
}

export const EmailTemplateListScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<SettingsStackParamList>>();
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const { templates, defaults, isLoading, isRefetching, refetch } = useEmailTemplates();

  const sections: Section[] = useMemo(() => {
    if (!defaults.length) return [];

    const categoryMap: Record<string, TemplateRow[]> = {};

    defaults.forEach((def) => {
      const category = def.category || 'General';
      if (!categoryMap[category]) {
        categoryMap[category] = [];
      }
      const customTemplate = templates.find((t) => t.template_key === def.template_key);
      categoryMap[category].push({
        templateDefault: def,
        customTemplate,
      });
    });

    return Object.entries(categoryMap).map(([title, data]) => ({ title, data }));
  }, [templates, defaults]);

  const handleTemplatePress = (item: TemplateRow) => {
    navigation.navigate('EmailTemplateEdit', {
      templateKey: item.templateDefault.template_key,
      templateId: item.customTemplate?.id,
      templateName: item.templateDefault.name,
    });
  };

  const getStatusBadge = (item: TemplateRow) => {
    if (item.customTemplate) {
      if (item.customTemplate.is_active) {
        return { label: t('emailTemplates.customized'), bgColor: colors.primary.main + '18', textColor: colors.primary.main };
      }
      return { label: t('common.inactive'), bgColor: themeColors.border + '60', textColor: themeColors.text.hint };
    }
    return { label: t('emailTemplates.default'), bgColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', textColor: themeColors.text.secondary };
  };

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={[styles.sectionHeader, { borderBottomColor: themeColors.border }]}>
      <Text variant="label" color="secondary" style={styles.sectionHeaderText}>
        {section.title}
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: TemplateRow }) => {
    const badge = getStatusBadge(item);
    const isCustomized = !!item.customTemplate;

    return (
      <Card padding="none" style={styles.templateCard}>
        {/* Header: Name + Badge */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text variant="body" style={styles.cardTitle} numberOfLines={1}>
              {item.templateDefault.name}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: badge.bgColor }]}>
              <Text variant="caption" style={[styles.badgeText, { color: badge.textColor }]}>
                {badge.label}
              </Text>
            </View>
          </View>
          <Text variant="bodySmall" color="hint" style={styles.cardDescription} numberOfLines={2}>
            {item.templateDefault.description}
          </Text>
        </View>

        {/* Subject */}
        <View style={styles.cardSection}>
          <Text variant="caption" color="hint" style={styles.cardSectionLabel}>
            {t('emailTemplates.subject')}
          </Text>
          <Text variant="bodySmall" numberOfLines={1} style={styles.subjectText}>
            {item.customTemplate?.subject || item.templateDefault.default_subject}
          </Text>
        </View>

        {/* Font info (only if customized) */}
        {isCustomized && item.customTemplate && (
          <View style={styles.fontInfoRow}>
            <Text variant="caption" color="hint">
              {t('emailTemplates.font')}: {(item.customTemplate.font_family || 'Arial').split(',')[0]}
            </Text>
            <Text variant="caption" color="hint" style={styles.fontInfoSize}>
              {t('emailTemplates.size')}: {item.customTemplate.font_size || '14px'}
            </Text>
          </View>
        )}

        {/* Variables */}
        <View style={styles.cardSection}>
          <Text variant="caption" color="hint" style={styles.cardSectionLabel}>
            {t('emailTemplates.variables')}
          </Text>
          <View style={styles.variablesRow}>
            {item.templateDefault.variables.map((v) => (
              <View key={v} style={[styles.variableChip, styles.variableChipBg]}>
                <Text variant="caption" style={styles.variableText}>
                  {v}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={[styles.cardActions, styles.cardActionsBorder]}>
          {isCustomized && item.customTemplate ? (
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnOutline, styles.actionBtnBorder]}
                onPress={() => handleTemplatePress(item)}
                activeOpacity={0.7}>
                <Icon name="pencil-outline" size={ms(16)} color={themeColors.text.primary} />
                <Text variant="caption" style={styles.editBtnText}>
                  {t('common.edit')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, styles.customizeBtn]}
              onPress={() => handleTemplatePress(item)}
              activeOpacity={0.7}>
              <Icon name="plus" size={ms(20)} color={colors.common.white} />
              <Text variant="h4" style={styles.customizeBtnText}>
                {t('emailTemplates.customize')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text variant="bodySmall" color="secondary" style={styles.emptyText}>
            {t('emailTemplates.loading')}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.centered}>
        <Icon name="email-off-outline" size={ms(48)} color={themeColors.text.hint} />
        <Text variant="bodySmall" color="secondary" style={styles.emptyText}>
          {t('emailTemplates.empty')}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: themeColors.surface }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Icon name="arrow-left" size={ms(22)} color={themeColors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text variant="h2">{t('settings.emailTemplates')}</Text>
          <Text variant="caption" color="secondary" style={styles.headerSubtitle}>
            {t('settings.emailTemplatesSubtitle')}
          </Text>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.templateDefault.template_key}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary.main}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backButton: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: ms(2),
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: ms(100),
  },
  sectionHeader: {
    paddingTop: ms(20),
    paddingBottom: ms(8),
    borderBottomWidth: 1,
    marginBottom: ms(12),
  },
  sectionHeaderText: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  templateCard: {
    marginBottom: ms(14),
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: ms(14),
    paddingTop: ms(14),
    paddingBottom: ms(10),
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ms(4),
  },
  cardTitle: {
    fontWeight: '600',
    flex: 1,
    marginRight: ms(8),
  },
  statusBadge: {
    paddingHorizontal: ms(8),
    paddingVertical: ms(3),
    borderRadius: ms(10),
  },
  cardDescription: {
    lineHeight: ms(16),
  },
  cardSection: {
    paddingHorizontal: ms(14),
    paddingBottom: ms(10),
  },
  cardSectionLabel: {
    fontWeight: '600',
    marginBottom: ms(3),
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontSize: ms(11),
  },
  fontInfoRow: {
    flexDirection: 'row',
    paddingHorizontal: ms(14),
    paddingBottom: ms(10),
  },
  variablesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(5),
  },
  variableChip: {
    paddingHorizontal: ms(7),
    paddingVertical: ms(3),
    borderRadius: ms(4),
  },
  variableChipBg: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  variableText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: ms(11),
    color: colors.grey[60],
  },
  cardActions: {
    borderTopWidth: 1,
    paddingHorizontal: ms(14),
    paddingVertical: ms(10),
  },
  cardActionsBorder: {
    borderTopColor: colors.grey[10],
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: ms(8),
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(14),
    paddingVertical: ms(8),
    borderRadius: ms(6),
    flex: 1,
  },
  actionBtnOutline: {
    borderWidth: 1,
  },
  actionBtnBorder: {
    borderColor: colors.grey[15],
  },
  editBtnText: {
    fontWeight: '600',
    marginLeft: ms(6),
  },
  customizeBtn: {
    backgroundColor: colors.primary.main,
  },
  customizeBtnText: {
    color: colors.common.white,
    fontWeight: '700',
    marginLeft: ms(6),
  },
  badgeText: {
    fontWeight: '600',
  },
  subjectText: {
    color: colors.grey[85],
  },
  fontInfoSize: {
    marginLeft: ms(16),
  },
  headerSubtitle: {
    marginTop: ms(2),
  },
  emptyText: {
    marginTop: spacing.md,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ms(60),
  },
});

export default EmailTemplateListScreen;
