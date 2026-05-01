import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Icon } from './Icon';
import { Text } from './Text';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { ms, spacing, vs } from '../../utils/responsive';
import { colors } from '../../theme/colors';
import {
  changeLanguage,
  getCurrentLanguage,
  getSupportedLanguages,
  SupportedLanguage,
} from '../../locales';

interface LanguageSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
  onLanguageChanged?: (language: SupportedLanguage) => void;
}

export const LanguageSwitcherModal: React.FC<LanguageSwitcherModalProps> = ({
  visible,
  onClose,
  onLanguageChanged,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const themeColors = isDark ? colors.dark : colors.light;
  const gradientColors = isDark ? colors.gradients.dark.primary : colors.gradients.light.primary;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const [activeLang, setActiveLang] = useState<SupportedLanguage>(
    getCurrentLanguage(),
  );
  const [pendingLang, setPendingLang] = useState<SupportedLanguage | null>(null);

  useEffect(() => {
    if (visible) {
      setActiveLang(getCurrentLanguage());
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible, fadeAnim, scaleAnim]);

  const handleSelect = async (code: SupportedLanguage) => {
    if (code === activeLang || pendingLang) return;
    setPendingLang(code);
    try {
      await changeLanguage(code);
      setActiveLang(code);
      onLanguageChanged?.(code);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setPendingLang(null);
        onClose();
      });
    } catch {
      setPendingLang(null);
    }
  };

  const languages = getSupportedLanguages();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.container,
                {
                  backgroundColor: themeColors.card,
                  transform: [{ scale: scaleAnim }],
                  shadowColor: colors.common.black,
                },
              ]}
            >
              <LinearGradient
                colors={gradientColors as unknown as string[]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
              >
                <View style={styles.headerIconWrap}>
                  <Icon name="translate" size={ms(22)} color={colors.common.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="h4" style={{ color: colors.common.white, fontWeight: '700' }}>
                    {t('settings.language')}
                  </Text>
                  <Text
                    variant="caption"
                    style={{ color: colors.headerOverlay.textBrightest, marginTop: ms(2) }}
                  >
                    {t('settings.chooseLanguage')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.7}
                  style={styles.closeBtn}
                >
                  <Icon name="close" size={ms(18)} color={colors.common.white} />
                </TouchableOpacity>
              </LinearGradient>

              <View style={styles.list}>
                {languages.map((lang, idx) => {
                  const isActive = activeLang === lang.code;
                  const isPending = pendingLang === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      onPress={() => handleSelect(lang.code)}
                      activeOpacity={0.7}
                      disabled={!!pendingLang}
                      style={[
                        styles.row,
                        idx !== languages.length - 1 && {
                          borderBottomColor: themeColors.border,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                        },
                        isActive && {
                          backgroundColor: isDark
                            ? colors.semiTransparent.green10
                            : colors.semiTransparent.green08,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.flagBox,
                          {
                            backgroundColor: isActive
                              ? colors.primary.main
                              : isDark
                                ? colors.semiTransparent.white08
                                : colors.semiTransparent.black04,
                          },
                        ]}
                      >
                        <Text
                          variant="body"
                          style={{ fontSize: ms(20), lineHeight: ms(24) }}
                        >
                          {lang.flag}
                        </Text>
                      </View>

                      <View style={styles.rowText}>
                        <Text
                          variant="bodySmall"
                          style={{
                            fontWeight: '600',
                            color: isActive
                              ? colors.primary.main
                              : themeColors.text.primary,
                          }}
                        >
                          {lang.nativeName}
                        </Text>
                        <Text
                          variant="caption"
                          color="secondary"
                          style={{ marginTop: ms(2) }}
                        >
                          {lang.name}
                        </Text>
                      </View>

                      {isPending ? (
                        <Animated.View style={styles.checkBox}>
                          <Icon
                            name="loading"
                            size={ms(18)}
                            color={colors.primary.main}
                          />
                        </Animated.View>
                      ) : isActive ? (
                        <View
                          style={[
                            styles.checkBox,
                            { backgroundColor: colors.primary.main },
                          ]}
                        >
                          <Icon name="check" size={ms(14)} color={colors.common.white} />
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.checkBox,
                            styles.checkBoxEmpty,
                            { borderColor: themeColors.border },
                          ]}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View
                style={[
                  styles.footer,
                  { borderTopColor: themeColors.border },
                ]}
              >
                <Icon
                  name="information-outline"
                  size={ms(14)}
                  color={themeColors.text.hint}
                />
                <Text
                  variant="captionSmall"
                  color="hint"
                  style={{ marginLeft: ms(6), flex: 1 }}
                >
                  {t('settings.languageHint')}
                </Text>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay.modal,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: ms(360),
    borderRadius: ms(20),
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: vs(14),
    gap: ms(12),
  },
  headerIconWrap: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(10),
    backgroundColor: colors.headerOverlay.bg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.headerOverlay.border,
  },
  closeBtn: {
    width: ms(30),
    height: ms(30),
    borderRadius: ms(15),
    backgroundColor: colors.headerOverlay.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingVertical: ms(4),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: vs(12),
  },
  flagBox: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
    marginLeft: ms(12),
  },
  checkBox: {
    width: ms(24),
    height: ms(24),
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBoxEmpty: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: vs(10),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

export default LanguageSwitcherModal;
