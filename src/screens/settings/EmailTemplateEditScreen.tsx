import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import Clipboard from '@react-native-clipboard/clipboard';
import { useTranslation } from 'react-i18next';
import { SettingsStackParamList } from '../../navigation/SettingsNavigator';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Card, Icon, Button, AlertModal } from '../../components/common';
import type { AlertType, AlertButton } from '../../components/common/AlertModal';
import { colors } from '../../theme/colors';
import { spacing, ms, vs } from '../../utils/responsive';
import {
  useEmailTemplates,
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
  useDeleteEmailTemplate,
} from '../../hooks/useEmailTemplates';
import { EmailTemplateCreateInput } from '../../types/emailTemplate';

type EditScreenRouteProp = RouteProp<SettingsStackParamList, 'EmailTemplateEdit'>;

const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Trebuchet MS', value: "'Trebuchet MS', Helvetica, sans-serif" },
  { label: 'Courier New', value: "'Courier New', Courier, monospace" },
  { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
];

const getFontLabel = (value: string) =>
  FONT_FAMILIES.find((f) => f.value === value)?.label || value.split(',')[0].replace(/'/g, '');

const FONT_SIZES = ['12px', '13px', '14px', '15px', '16px', '18px', '20px'];

export const EmailTemplateEditScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<EditScreenRouteProp>();
  const { templateKey, templateId, templateName } = route.params;
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const { templates, defaults } = useEmailTemplates();
  const createMutation = useCreateEmailTemplate();
  const updateMutation = useUpdateEmailTemplate();
  const deleteMutation = useDeleteEmailTemplate();

  const templateDefault = useMemo(
    () => defaults.find((d) => d.template_key === templateKey),
    [defaults, templateKey]
  );

  const existingTemplate = useMemo(
    () => (templateId ? templates.find((t) => t.id === templateId) : undefined),
    [templates, templateId]
  );

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyContent, setBodyContent] = useState('');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState('14px');
  const [footerText, setFooterText] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showFontFamilyPicker, setShowFontFamilyPicker] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message?: string;
    buttons?: AlertButton[];
  }>({ visible: false, type: 'info', title: '' });

  const showModal = useCallback((type: AlertType, title: string, message?: string, buttons?: AlertButton[]) => {
    setAlertModal({ visible: true, type, title, message, buttons });
  }, []);

  const hideModal = useCallback(() => {
    setAlertModal((prev) => ({ ...prev, visible: false }));
  }, []);

  const isEditing = !!existingTemplate;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (existingTemplate) {
      setName(existingTemplate.name);
      setSubject(existingTemplate.subject);
      setBodyContent(existingTemplate.body_content || '');
      setFontFamily(existingTemplate.font_family || 'Arial');
      setFontSize(existingTemplate.font_size || '14px');
      setFooterText(existingTemplate.footer_text || '');
      setIsActive(existingTemplate.is_active);
    } else if (templateDefault) {
      setName(templateDefault.name);
      setSubject(templateDefault.default_subject);
      setBodyContent(templateDefault.body_content || '');
      setFontFamily('Arial, Helvetica, sans-serif');
      setFontSize('14px');
      setFooterText('This is an automated notification from Truckast. Please do not reply to this email.');
      setIsActive(true);
    }
  }, [existingTemplate, templateDefault]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      showModal('warning', t('emailTemplate.edit.validationError'), t('emailTemplate.edit.errors.nameRequired'));
      return;
    }
    if (!subject.trim()) {
      showModal('warning', t('emailTemplate.edit.validationError'), t('emailTemplate.edit.errors.subjectRequired'));
      return;
    }

    const input: EmailTemplateCreateInput = {
      template_key: templateKey,
      name: name.trim(),
      subject: subject.trim(),
      body_content: bodyContent.trim(),
      font_family: fontFamily,
      font_size: fontSize,
      footer_text: footerText.trim(),
      is_active: isActive,
    };

    try {
      if (isEditing && existingTemplate) {
        await updateMutation.mutateAsync({ id: existingTemplate.id, input });
      } else {
        await createMutation.mutateAsync(input);
      }
      showModal('success', t('common.success'), t('emailTemplate.edit.savedSuccessfully'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      const msg = error?.response?.data?.message || t('emailTemplate.edit.errors.saveFailed');
      showModal('error', t('common.error'), msg);
    }
  }, [
    name, subject, bodyContent, fontFamily, fontSize, footerText, isActive,
    templateKey, isEditing, existingTemplate, createMutation, updateMutation, navigation, showModal,
  ]);

  const handleDelete = useCallback(() => {
    if (!existingTemplate) return;

    showModal('confirm', t('emailTemplate.edit.deleteTitle'),
      t('emailTemplate.edit.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            hideModal();
            try {
              await deleteMutation.mutateAsync(existingTemplate.id);
              showModal('success', t('emailTemplate.edit.deletedTitle'), t('emailTemplate.edit.deletedMessage'), [
                { text: t('common.ok'), onPress: () => navigation.goBack() },
              ]);
            } catch (error: any) {
              const msg = error?.response?.data?.message || t('emailTemplate.edit.errors.deleteFailed');
              showModal('error', t('common.error'), msg);
            }
          },
        },
      ]
    );
  }, [existingTemplate, deleteMutation, navigation, showModal, hideModal]);

  const handleResetToDefaults = useCallback(() => {
    if (!templateDefault) return;

    showModal('confirm', t('emailTemplate.edit.resetTitle'),
      t('emailTemplate.edit.resetMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('emailTemplate.edit.resetButton'),
          onPress: () => {
            setName(templateDefault.name);
            setSubject(templateDefault.default_subject);
            setBodyContent(templateDefault.body_content || '');
            setFontFamily('Arial, Helvetica, sans-serif');
            setFontSize('14px');
            setFooterText('This is an automated notification from Truckast. Please do not reply to this email.');
            setIsActive(true);
          },
        },
      ]
    );
  }, [templateDefault, showModal]);

  const handleCopyVariable = useCallback((variable: string) => {
    // Variables already come as {{name}} from backend
    const formatted = variable.startsWith('{{') ? variable : `{{${variable}}}`;
    Clipboard.setString(formatted);
    // Also append to body content like web does
    setBodyContent((prev) => prev + formatted);
    showModal('success', t('emailTemplate.edit.copiedTitle'), t('emailTemplate.edit.copiedMessage', { value: formatted }));
  }, [showModal, t]);

  // Sample variables for preview — matches web exactly (page.tsx lines 65-83)
  const SAMPLE_VARIABLES: Record<string, string> = {
    '{{email}}': 'user@example.com',
    '{{reset_link}}': '#',
    '{{invitation_link}}': '#',
    '{{code}}': '123-456',
    '{{creator_name}}': 'John Doe',
    '{{updater_name}}': 'John Doe',
    '{{company_name}}': 'Acme Corp',
    '{{order_code}}': 'OE-ABC123',
    '{{order_url}}': '#',
    '{{recipient_name}}': 'Jane Smith',
    '{{status}}': 'approved',
    '{{status_label}}': 'Accepted',
    '{{order_count}}': '3',
    '{{passkey}}': 'ABCD1234',
    '{{share_url}}': '#',
    '{{expiration_time}}': '24 hours',
    '{{expiration_datetime}}': 'Mar 18, 2026 at 3:00 PM',
  };

  const replaceWithSamples = (text: string) => {
    let result = text;
    for (const [key, value] of Object.entries(SAMPLE_VARIABLES)) {
      const placeholder = key.startsWith('{{') ? key : `{{${key}}}`;
      result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    }
    return result;
  };

  const toEmailSafeHtml = (html: string, ff: string, fs: string) => {
    const baseStyle = `font-family: ${ff}; font-size: ${fs}; color: #333333; line-height: 1.6;`;
    return html
      .replace(/<p>/g, `<p style="margin: 0 0 12px; ${baseStyle}">`)
      .replace(/<ul>/g, `<ul style="margin: 0 0 12px; padding-left: 24px; list-style-type: disc; ${baseStyle}">`)
      .replace(/<ol>/g, `<ol style="margin: 0 0 12px; padding-left: 24px; list-style-type: decimal; ${baseStyle}">`)
      .replace(/<li>/g, `<li style="margin: 0 0 4px; display: list-item; ${baseStyle}">`)
      .replace(/<strong>/g, '<strong style="font-weight: 700;">')
      .replace(/<em>/g, '<em style="font-style: italic;">')
      .replace(/<u>/g, '<u style="text-decoration: underline;">');
  };

  const buildOrderSubmittedPreview = (body: string, footer: string, ff: string, fs: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:${ff};font-size:${fs};background-color:#ffffff;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;"><tr><td align="center">
<table cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;">
<tr><td style="padding:14px 24px;text-align:center;border-bottom:1px solid #eee;">
<p style="margin:0;color:#ef4444;font-size:12px;font-style:italic;">Please do not reply to this email. In order to respond, please reply in Truckast by clicking on the link <a href="#" style="color:#ef4444;font-weight:700;">#OE-ABC123</a>.</p>
</td></tr>
<tr><td style="padding:28px 24px 6px;text-align:center;">
<h2 style="margin:0;color:#111;font-size:17px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">Acme Corp</h2>
<p style="margin:4px 0 0;color:#444;font-size:12px;font-weight:600;text-transform:uppercase;">Plant #1</p>
</td></tr>
<tr><td style="padding:22px 24px 6px;">
<a href="#" style="color:#22c55e;text-decoration:none;font-size:19px;font-weight:800;">Request #OE-ABC123 - SUBMITTED</a>
</td></tr>
<tr><td style="padding:10px 24px 18px;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;border-left:4px solid #999;">
<tr><td style="padding:16px 18px;font-size:${fs};color:#333;line-height:1.8;font-family:${ff};">
${body}
<p style="margin:10px 0 0;color:#666;font-size:12px;">— Mar 17 @ 2:00 PM</p>
</td></tr></table>
</td></tr>
<tr><td style="padding:0 24px 14px;">
<table cellpadding="0" cellspacing="0" style="width:100%;">
<tr>
<td style="background-color:#1e293b;padding:10px 18px;text-align:center;border-right:2px solid #fff;width:33%;"><div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">STATUS</div><div style="font-size:20px;font-weight:900;color:#fff;margin-top:2px;">PENDING</div></td>
<td style="background-color:#1e293b;padding:10px 18px;text-align:center;border-right:2px solid #fff;width:33%;"><div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">ON JOB</div><div style="font-size:20px;font-weight:900;color:#fff;margin-top:2px;">3/18</div><div style="font-size:11px;color:#94a3b8;">7:00 AM</div></td>
<td style="background-color:#1e293b;padding:10px 18px;text-align:center;width:33%;"><div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">RATE</div><div style="font-size:20px;font-weight:900;color:#fff;margin-top:2px;">10 CY/HR</div></td>
</tr></table>
</td></tr>
<tr><td style="padding:0 24px 10px;"><table width="90%" cellpadding="0" cellspacing="0" style="background-color:#3b82f6;border-radius:4px;"><tr><td style="padding:14px 18px;">
<p style="margin:0;color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;">USAGE: Flatwork</p>
<p style="margin:5px 0 0;color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;">POUR METHOD: Pump</p>
<p style="margin:5px 0 0;color:#dbeafe;font-size:12px;">PO: PO-12345</p>
</td></tr></table></td></tr>
<tr><td style="padding:0 24px 10px;"><table width="90%" cellpadding="0" cellspacing="0" style="background-color:#3b82f6;border-radius:4px;"><tr><td style="padding:14px 18px;">
<p style="margin:0;color:#dbeafe;font-size:11px;text-transform:uppercase;font-weight:600;">Sample Job</p>
<p style="margin:4px 0 0;color:#fff;font-size:15px;font-weight:900;text-transform:uppercase;">123 Main Street</p>
<p style="margin:4px 0 0;color:#dbeafe;font-size:13px;text-transform:uppercase;">Oklahoma City, OK 73101</p>
</td></tr></table></td></tr>
<tr><td style="padding:0 24px 10px;"><table width="90%" cellpadding="0" cellspacing="0" style="background-color:#6b8e23;border-radius:4px;"><tr><td style="padding:14px 18px;">
<p style="margin:0;color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;">4000PSI (Concrete Mix)</p>
<p style="margin:5px 0 0;color:#fff;font-size:12px;text-transform:uppercase;">AIR</p>
<p style="margin:6px 0 0;color:#fff;font-size:14px;font-weight:900;">10.00 CY</p>
<p style="margin:4px 0 0;color:#e2e8c0;font-size:12px;">SLUMP: 4"</p>
<p style="margin:4px 0 0;color:#e2e8c0;font-size:12px;">PSI: 4000</p>
</td></tr></table></td></tr>
<tr><td style="padding:0 24px 10px;"><table width="90%" cellpadding="0" cellspacing="0" style="background-color:#3b82f6;border-radius:4px;"><tr><td style="padding:14px 18px;">
<p style="margin:0;color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;">Admixture Product</p>
</td></tr></table></td></tr>
<tr><td style="padding:0 24px 10px;"><table width="90%" cellpadding="0" cellspacing="0" style="background-color:#3b82f6;border-radius:4px;"><tr><td style="padding:14px 18px;">
<p style="margin:0;color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;">OTHER PRODUCT</p>
<p style="margin:6px 0 0;color:#dbeafe;font-size:12px;text-transform:uppercase;">NONE</p>
</td></tr></table></td></tr>
<tr><td style="padding:14px 24px;text-align:center;border-top:1px solid #eee;">
<p style="margin:0;color:#ef4444;font-size:11px;line-height:1.6;font-family:${ff};">${footer}</p>
</td></tr>
</table></td></tr></table></body></html>`;

  const buildOrderStatusPreview = (body: string, footer: string, ff: string, fs: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:${ff};font-size:${fs};background-color:#ffffff;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;"><tr><td align="center">
<table cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;">
<tr><td style="padding:14px 24px;text-align:center;border-bottom:1px solid #eee;">
<p style="margin:0;color:#ef4444;font-size:12px;font-style:italic;">Please do not reply to this email. In order to respond, please reply in Truckast.</p>
</td></tr>
<tr><td style="padding:28px 24px 6px;text-align:center;">
<h2 style="margin:0;color:#111;font-size:17px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">Acme Corp</h2>
<p style="margin:4px 0 0;color:#444;font-size:12px;font-weight:600;text-transform:uppercase;">Plant #1</p>
</td></tr>
<tr><td style="padding:22px 24px 6px;">
<a href="#" style="color:#22c55e;text-decoration:none;font-size:19px;font-weight:800;">Request #OE-ABC123 - ACCEPTED</a>
</td></tr>
<tr><td style="padding:10px 24px 18px;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eee;border-left:4px solid #999;">
<tr><td style="padding:14px 16px;font-size:${fs};color:#222;line-height:1.6;font-family:${ff};">
${body}
<p style="margin:6px 0 0;color:#666;font-size:12px;">— Mar 17 @ 2:00 PM</p>
</td></tr></table>
</td></tr>
<tr><td style="padding:0 24px 14px;">
<table cellpadding="0" cellspacing="0" style="width:100%;">
<tr>
<td style="background-color:#1e293b;padding:10px 18px;text-align:center;border-right:2px solid #fff;width:33%;"><div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">STATUS</div><div style="font-size:20px;font-weight:900;color:#fff;margin-top:2px;">ACCEPTED</div></td>
<td style="background-color:#1e293b;padding:10px 18px;text-align:center;border-right:2px solid #fff;width:33%;"><div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">ON JOB</div><div style="font-size:20px;font-weight:900;color:#fff;margin-top:2px;">3/18</div><div style="font-size:11px;color:#94a3b8;">7:00 AM</div></td>
<td style="background-color:#1e293b;padding:10px 18px;text-align:center;width:33%;"><div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">RATE</div><div style="font-size:20px;font-weight:900;color:#fff;margin-top:2px;">10 CY/HR</div></td>
</tr></table>
</td></tr>
<tr><td style="padding:0 24px 10px;"><table width="90%" cellpadding="0" cellspacing="0" style="background-color:#3b82f6;border-radius:4px;"><tr><td style="padding:14px 18px;">
<p style="margin:0;color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;">USAGE: Flatwork</p>
<p style="margin:5px 0 0;color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;">POUR METHOD: Pump</p>
</td></tr></table></td></tr>
<tr><td style="padding:0 24px 10px;"><table width="90%" cellpadding="0" cellspacing="0" style="background-color:#3b82f6;border-radius:4px;"><tr><td style="padding:14px 18px;">
<p style="margin:0;color:#dbeafe;font-size:11px;text-transform:uppercase;font-weight:600;">Sample Job</p>
<p style="margin:4px 0 0;color:#fff;font-size:15px;font-weight:900;text-transform:uppercase;">123 Main Street</p>
<p style="margin:4px 0 0;color:#dbeafe;font-size:13px;text-transform:uppercase;">Oklahoma City, OK 73101</p>
</td></tr></table></td></tr>
<tr><td style="padding:0 24px 10px;"><table width="90%" cellpadding="0" cellspacing="0" style="background-color:#3b82f6;border-radius:4px;"><tr><td style="padding:14px 18px;">
<p style="margin:0;color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;">CONTACT: Jane Smith</p>
<p style="margin:4px 0 0;color:#dbeafe;font-size:12px;">PHONE: (405) 555-1234</p>
</td></tr></table></td></tr>
<tr><td style="padding:0 24px 10px;"><table width="90%" cellpadding="0" cellspacing="0" style="background-color:#6b8e23;border-radius:4px;"><tr><td style="padding:14px 18px;">
<p style="margin:0;color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;">4000PSI (Concrete Mix)</p>
<p style="margin:6px 0 0;color:#fff;font-size:14px;font-weight:900;">10.00 CY</p>
<p style="margin:4px 0 0;color:#e2e8c0;font-size:12px;">SLUMP: 4"</p>
</td></tr></table></td></tr>
<tr><td style="padding:22px 24px 28px;text-align:center;">
<a href="#" style="display:inline-block;background-color:#111;color:#fff;text-decoration:none;padding:13px 36px;border-radius:6px;font-size:13px;font-weight:700;">View Order Details</a>
</td></tr>
<tr><td style="padding:14px 24px;text-align:center;border-top:1px solid #e5e7eb;">
<p style="margin:0;color:#ef4444;font-size:11px;line-height:1.6;font-family:${ff};">${footer}</p>
</td></tr>
</table></td></tr></table></body></html>`;

  const EVENT_BUILDERS: Record<string, (body: string, footer: string, ff: string, fs: string) => string> = {
    order_created: buildOrderSubmittedPreview,
    order_updated: buildOrderSubmittedPreview,
    order_accepted: buildOrderStatusPreview,
    order_rejected: buildOrderStatusPreview,
  };

  const previewHtml = useMemo(() => {
    const rawBody = bodyContent || templateDefault?.body_content || '<p>No body content entered.</p>';
    const previewBody = replaceWithSamples(rawBody);
    const ff = fontFamily || 'Arial, Helvetica, sans-serif';
    const fs = fontSize || '14px';
    const safeBody = toEmailSafeHtml(previewBody, ff, fs);
    const previewFooter = footerText || 'This is an automated notification from Truckast. Please do not reply to this email.';

    const builder = EVENT_BUILDERS[templateKey];
    if (builder) {
      return builder(safeBody, previewFooter, ff, fs);
    }

    // Fallback generic preview
    return buildOrderStatusPreview(safeBody, previewFooter, ff, fs);
  }, [subject, bodyContent, footerText, fontFamily, fontSize, templateDefault, templateKey]);

  const inputBgColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const inputBorderColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top', 'bottom']}>
      {/* Header — back + title */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: themeColors.surface }]}
          onPress={handleGoBack}
          activeOpacity={0.7}>
          <Icon name="arrow-left" size={ms(22)} color={themeColors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text variant="h3" style={styles.headerTitle} numberOfLines={1}>
            {templateName}
          </Text>
        </View>
      </View>

      {/* Action bar — Reset / Preview / Save */}
      <View style={[styles.actionBar, { backgroundColor: isDark ? themeColors.surface : colors.grey[3] }]}>
        <TouchableOpacity
          style={[
            styles.actionBarBtn,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.common.white, borderColor: themeColors.border },
          ]}
          onPress={handleResetToDefaults}
          activeOpacity={0.7}>
          <Icon name="refresh" size={ms(18)} color={themeColors.text.secondary} />
          <Text variant="caption" style={[styles.actionBarLabel, { color: themeColors.text.secondary }]}>
            {t('emailTemplate.edit.resetButton')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionBarBtn,
            { backgroundColor: colors.info.main + '12', borderColor: colors.info.main + '30' },
          ]}
          onPress={() => setShowPreview(true)}
          activeOpacity={0.7}>
          <Icon name="eye-outline" size={ms(18)} color={colors.info.main} />
          <Text variant="caption" style={[styles.actionBarLabel, { color: colors.info.main }]}>
            {t('emailTemplate.edit.preview')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBarBtn, styles.actionBarSaveBtn]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.7}>
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.common.white} />
          ) : (
            <>
              <Icon name="content-save-outline" size={ms(18)} color={colors.common.white} />
              <Text variant="caption" style={[styles.actionBarLabel, styles.actionBarSaveLabel]}>
                {isEditing ? t('emailTemplate.edit.update') : t('common.save')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Template Name */}
          <View style={styles.fieldGroup}>
            <Text variant="label" color="secondary" style={styles.fieldLabel}>
              {t('emailTemplate.edit.templateName')}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: inputBgColor,
                  borderColor: inputBorderColor,
                  color: themeColors.text.primary,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder={t('emailTemplate.edit.templateNamePlaceholder')}
              placeholderTextColor={themeColors.text.hint}
            />
          </View>

          {/* Status Toggle */}
          <View style={styles.fieldGroup}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelContainer}>
                <Text variant="label" color="secondary">
                  {t('emailTemplate.edit.status')}
                </Text>
                <Text variant="caption" color="hint" style={{ marginTop: ms(2) }}>
                  {isActive ? t('emailTemplate.edit.templateActive') : t('emailTemplate.edit.templateInactive')}
                </Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: themeColors.border, true: colors.primary.main + '80' }}
                thumbColor={isActive ? colors.primary.main : themeColors.text.hint}
              />
            </View>
          </View>

          {/* Email Subject */}
          <View style={styles.fieldGroup}>
            <Text variant="label" color="secondary" style={styles.fieldLabel}>
              {t('emailTemplate.edit.emailSubject')}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: inputBgColor,
                  borderColor: inputBorderColor,
                  color: themeColors.text.primary,
                },
              ]}
              value={subject}
              onChangeText={setSubject}
              placeholder={t('emailTemplate.edit.emailSubjectPlaceholder')}
              placeholderTextColor={themeColors.text.hint}
            />
          </View>

          {/* Font Family Picker */}
          <View style={styles.fieldGroup}>
            <Text variant="label" color="secondary" style={styles.fieldLabel}>
              {t('emailTemplate.edit.fontFamily')}
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                {
                  backgroundColor: inputBgColor,
                  borderColor: inputBorderColor,
                },
              ]}
              onPress={() => setShowFontFamilyPicker(!showFontFamilyPicker)}
              activeOpacity={0.7}>
              <Text variant="bodySmall" style={{ color: themeColors.text.primary }}>
                {getFontLabel(fontFamily)}
              </Text>
              <Icon
                name={showFontFamilyPicker ? 'chevron-up' : 'chevron-down'}
                size={ms(18)}
                color={themeColors.text.hint}
              />
            </TouchableOpacity>
            {showFontFamilyPicker && (
              <Card padding="none" style={styles.pickerDropdown}>
                {FONT_FAMILIES.map((font) => (
                  <TouchableOpacity
                    key={font.value}
                    style={[
                      styles.pickerOption,
                      fontFamily === font.value && {
                        backgroundColor: colors.primary.main + '15',
                      },
                    ]}
                    onPress={() => {
                      setFontFamily(font.value);
                      setShowFontFamilyPicker(false);
                    }}
                    activeOpacity={0.7}>
                    <Text
                      variant="bodySmall"
                      style={{
                        color: fontFamily === font.value
                          ? colors.primary.main
                          : themeColors.text.primary,
                        fontWeight: fontFamily === font.value ? '600' : '400',
                      }}>
                      {font.label}
                    </Text>
                    {fontFamily === font.value && (
                      <Icon name="check" size={ms(18)} color={colors.primary.main} />
                    )}
                  </TouchableOpacity>
                ))}
              </Card>
            )}
          </View>

          {/* Font Size Picker */}
          <View style={styles.fieldGroup}>
            <Text variant="label" color="secondary" style={styles.fieldLabel}>
              {t('emailTemplate.edit.fontSize')}
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                {
                  backgroundColor: inputBgColor,
                  borderColor: inputBorderColor,
                },
              ]}
              onPress={() => setShowFontSizePicker(!showFontSizePicker)}
              activeOpacity={0.7}>
              <Text variant="bodySmall" style={{ color: themeColors.text.primary }}>
                {fontSize}
              </Text>
              <Icon
                name={showFontSizePicker ? 'chevron-up' : 'chevron-down'}
                size={ms(18)}
                color={themeColors.text.hint}
              />
            </TouchableOpacity>
            {showFontSizePicker && (
              <Card padding="none" style={styles.pickerDropdown}>
                {FONT_SIZES.map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.pickerOption,
                      fontSize === size && {
                        backgroundColor: colors.primary.main + '15',
                      },
                    ]}
                    onPress={() => {
                      setFontSize(size);
                      setShowFontSizePicker(false);
                    }}
                    activeOpacity={0.7}>
                    <Text
                      variant="bodySmall"
                      style={{
                        color: fontSize === size
                          ? colors.primary.main
                          : themeColors.text.primary,
                        fontWeight: fontSize === size ? '600' : '400',
                      }}>
                      {size}
                    </Text>
                    {fontSize === size && (
                      <Icon name="check" size={ms(18)} color={colors.primary.main} />
                    )}
                  </TouchableOpacity>
                ))}
              </Card>
            )}
          </View>

          {/* Available Variables */}
          {templateDefault?.variables && templateDefault.variables.length > 0 && (
            <View style={styles.fieldGroup}>
              <Text variant="label" color="secondary" style={styles.fieldLabel}>
                {t('emailTemplate.edit.availableVariables')}
              </Text>
              <Text variant="caption" color="hint" style={{ marginBottom: ms(8) }}>
                {t('emailTemplate.edit.availableVariablesHint')}
              </Text>
              <View style={styles.variablesContainer}>
                {templateDefault.variables.map((variable) => (
                  <TouchableOpacity
                    key={variable}
                    style={[
                      styles.variableChip,
                      {
                        backgroundColor: isDark
                          ? colors.secondary.main + '20'
                          : colors.secondary.light + '20',
                        borderColor: isDark
                          ? colors.secondary.main + '40'
                          : colors.secondary.light + '40',
                      },
                    ]}
                    onPress={() => handleCopyVariable(variable)}
                    activeOpacity={0.7}>
                    <Icon
                      name="code-braces"
                      size={ms(14)}
                      color={isDark ? colors.secondary.light : colors.secondary.main}
                    />
                    <Text
                      variant="captionSmall"
                      style={{
                        color: isDark ? colors.secondary.light : colors.secondary.main,
                        fontWeight: '500',
                        marginLeft: ms(4),
                      }}>
                      {variable.startsWith('{{') ? variable : `{{${variable}}}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Email Body */}
          <View style={styles.fieldGroup}>
            <Text variant="label" color="secondary" style={styles.fieldLabel}>
              {t('emailTemplate.edit.emailBody')}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                styles.multilineInput,
                {
                  backgroundColor: inputBgColor,
                  borderColor: inputBorderColor,
                  color: themeColors.text.primary,
                },
              ]}
              value={bodyContent}
              onChangeText={setBodyContent}
              placeholder={t('emailTemplate.edit.emailBodyPlaceholder')}
              placeholderTextColor={themeColors.text.hint}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Footer Text */}
          <View style={styles.fieldGroup}>
            <Text variant="label" color="secondary" style={styles.fieldLabel}>
              {t('emailTemplate.edit.footerText')}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: inputBgColor,
                  borderColor: inputBorderColor,
                  color: themeColors.text.primary,
                },
              ]}
              value={footerText}
              onChangeText={setFooterText}
              placeholder={t('emailTemplate.edit.footerTextPlaceholder')}
              placeholderTextColor={themeColors.text.hint}
            />
          </View>

          {/* Delete — only when editing */}
          {isEditing && (
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.deleteRow, { borderColor: colors.error.main + '30' }]}
                onPress={handleDelete}
                disabled={deleteMutation.isPending}
                activeOpacity={0.7}>
                {deleteMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.error.main} />
                ) : (
                  <>
                    <Icon name="delete-outline" size={ms(20)} color={colors.error.main} />
                    <Text variant="bodySmall" style={{ color: colors.error.main, fontWeight: '700', marginLeft: ms(8) }}>
                      {t('emailTemplate.edit.deleteCustomTemplate')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Preview Modal */}
      <Modal
        visible={showPreview}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPreview(false)}>
        <SafeAreaView
          style={[styles.previewContainer, { backgroundColor: themeColors.background }]}
          edges={['top']}>
          <View style={[styles.previewHeader, { borderBottomColor: themeColors.border }]}>
            <Text variant="bodySmall" style={{ fontWeight: '600' }}>
              {t('emailTemplate.edit.emailPreview')}
            </Text>
            <TouchableOpacity
              onPress={() => setShowPreview(false)}
              activeOpacity={0.7}>
              <Icon name="close" size={ms(24)} color={themeColors.text.primary} />
            </TouchableOpacity>
          </View>
          <WebView
            source={{ html: previewHtml }}
            style={styles.webView}
            originWhitelist={['*']}
            scrollEnabled
          />
        </SafeAreaView>
      </Modal>

      {/* Alert Modal */}
      <AlertModal
        visible={alertModal.visible}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        buttons={alertModal.buttons}
        onClose={hideModal}
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
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: vs(10),
    borderBottomWidth: 1,
  },
  backButton: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  headerTitle: {
    fontWeight: '700',
  },
  actionBar: {
    flexDirection: 'row',
    paddingVertical: ms(10),
    paddingHorizontal: spacing.lg,
    gap: ms(10),
  },
  actionBarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ms(10),
    borderRadius: ms(10),
    borderWidth: 1,
    gap: ms(6),
  },
  actionBarLabel: {
    fontWeight: '600',
    fontSize: ms(14),
  },
  actionBarSaveBtn: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  actionBarSaveLabel: {
    color: colors.common.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: vs(16),
    paddingBottom: vs(40),
  },
  fieldGroup: {
    marginBottom: vs(18),
  },
  fieldLabel: {
    marginBottom: ms(6),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: ms(10),
    paddingHorizontal: ms(14),
    paddingVertical: ms(12),
    fontSize: ms(15),
  },
  multilineInput: {
    minHeight: ms(200),
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabelContainer: {
    flex: 1,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: ms(10),
    paddingHorizontal: ms(14),
    paddingVertical: ms(12),
  },
  pickerDropdown: {
    marginTop: ms(4),
    borderRadius: ms(10),
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(14),
    paddingVertical: ms(10),
  },
  variablesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(8),
  },
  variableChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(10),
    paddingVertical: ms(6),
    borderRadius: ms(16),
    borderWidth: 1,
  },
  actionsContainer: {
    marginTop: vs(16),
    marginBottom: vs(40),
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ms(14),
    borderRadius: ms(10),
    borderWidth: 2,
  },
  previewContainer: {
    flex: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: vs(12),
    borderBottomWidth: 1,
  },
  webView: {
    flex: 1,
  },
});

export default EmailTemplateEditScreen;
