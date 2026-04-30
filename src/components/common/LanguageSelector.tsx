import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from './Text';
import { Icon } from './Icon';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';
import { fontFamily } from '../../theme/typography';
import {
  changeLanguage,
  getCurrentLanguage,
  getSupportedLanguages,
  SupportedLanguage,
} from '../../locales';
import { storageUtils, STORAGE_KEYS } from '../../utils/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type LangCode = SupportedLanguage;

interface LangVisual {
  short: string;
  flagColors: [string, string];
  accent: string;
}

const LANG_VISUALS: Record<LangCode, LangVisual> = {
  en: {
    short: 'EN',
    flagColors: [colors.secondary.dark, colors.secondary.main],
    accent: colors.secondary.main,
  },
  es: {
    short: 'ES',
    flagColors: [colors.error.main, colors.warning.main],
    accent: colors.error.main,
  },
  'fr-CA': {
    short: 'FR',
    flagColors: [colors.primary.main, colors.primary.dark],
    accent: colors.primary.main,
  },
};

interface LanguageSelectorProps {
  size?: number;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ size = ms(36) }) => {
  const { isDark } = useTheme();
  const { i18n } = useTranslation();
  const themeColors = isDark ? colors.dark : colors.light;

  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<LangCode>(
    (getCurrentLanguage() as LangCode) || 'en'
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const itemAnims = useRef<Animated.Value[]>([]);

  const languages = useMemo(() => getSupportedLanguages(), []);

  if (itemAnims.current.length !== languages.length) {
    itemAnims.current = languages.map(() => new Animated.Value(0));
  }

  useEffect(() => {
    const onLangChange = (lng: string) => {
      const code = (lng.split('-')[0] === 'fr' ? 'fr-CA' : lng) as LangCode;
      setCurrent(code in LANG_VISUALS ? code : (lng as LangCode));
    };
    i18n.on('languageChanged', onLangChange);
    return () => {
      i18n.off('languageChanged', onLangChange);
    };
  }, [i18n]);

  const openModal = useCallback(() => {
    setVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();

    itemAnims.current.forEach((anim) => anim.setValue(0));
    Animated.stagger(
      80,
      itemAnims.current.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          tension: 70,
          friction: 8,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [fadeAnim, scaleAnim]);

  const closeModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  }, [fadeAnim, scaleAnim]);

  const handleSelect = useCallback(
    async (code: LangCode) => {
      if (code === current) {
        closeModal();
        return;
      }

      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(pulseAnim, {
          toValue: 1,
          tension: 90,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();

      try {
        await changeLanguage(code);
        await storageUtils.setString(STORAGE_KEYS.LANGUAGE, code);
        setCurrent(code);
      } catch (e) {
      }

      setTimeout(closeModal, 220);
    },
    [current, closeModal, pulseAnim]
  );

  const currentVisual = LANG_VISUALS[current] || LANG_VISUALS.en;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={openModal}
        style={[styles.triggerWrapper, { width: size, height: size }]}
      >
        <Animated.View
          style={[
            styles.triggerInner,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={currentVisual.flagColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              StyleSheet.absoluteFillObject,
              { borderRadius: size / 2, opacity: 0.18 },
            ]}
          />
          <Icon name="web" size={ms(18)} color={currentVisual.accent} />
          <View
            style={[
              styles.triggerBadge,
              {
                backgroundColor: currentVisual.accent,
                borderColor: themeColors.background,
              },
            ]}
          >
            <Text style={styles.triggerBadgeText}>{currentVisual.short}</Text>
          </View>
        </Animated.View>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
        </Animated.View>

        <View style={styles.modalCenter} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.modalCard,
              {
                backgroundColor: themeColors.surface,
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
                shadowColor: currentVisual.accent,
              },
            ]}
          >
            <LinearGradient
              colors={[
                currentVisual.flagColors[0] + '22',
                currentVisual.flagColors[1] + '0A',
                'transparent',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalGradientBg}
            />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTop}>
                <View
                  style={[
                    styles.modalHeaderIcon,
                    { backgroundColor: currentVisual.accent + '18' },
                  ]}
                >
                  <Icon name="translate" size={ms(20)} color={currentVisual.accent} />
                </View>
                <TouchableOpacity
                  onPress={closeModal}
                  style={[
                    styles.modalCloseBtn,
                    {
                      backgroundColor: isDark
                        ? colors.semiTransparent.white08
                        : colors.semiTransparent.black05,
                    },
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="close" size={ms(16)} color={themeColors.text.secondary} />
                </TouchableOpacity>
              </View>
              <Text
                variant="h3"
                style={{ color: themeColors.text.primary, marginTop: ms(10) }}
              >
                Choose Language
              </Text>
              <Text
                variant="caption"
                color="secondary"
                style={{ marginTop: ms(2) }}
              >
                Select your preferred language
              </Text>
            </View>

            <View style={styles.languageList}>
              {languages.map((lang, index) => {
                const isSelected = lang.code === current;
                const visual = LANG_VISUALS[lang.code] || LANG_VISUALS.en;
                const animValue = itemAnims.current[index] || new Animated.Value(1);

                return (
                  <Animated.View
                    key={lang.code}
                    style={{
                      opacity: animValue,
                      transform: [
                        {
                          translateY: animValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: [16, 0],
                          }),
                        },
                      ],
                    }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => handleSelect(lang.code)}
                      style={[
                        styles.languageItem,
                        {
                          backgroundColor: isSelected
                            ? visual.accent + (isDark ? '22' : '12')
                            : isDark
                              ? colors.semiTransparent.white05
                              : colors.semiTransparent.black04,
                          borderColor: isSelected
                            ? visual.accent
                            : 'transparent',
                        },
                      ]}
                    >
                      <LinearGradient
                        colors={visual.flagColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.languageFlag}
                      >
                        <Text style={styles.languageFlagText}>
                          {visual.short}
                        </Text>
                      </LinearGradient>

                      <View style={styles.languageTextWrap}>
                        <Text
                          style={[
                            styles.languageNative,
                            {
                              color: themeColors.text.primary,
                              fontFamily: isSelected
                                ? fontFamily.bold
                                : fontFamily.semiBold,
                            },
                          ]}
                        >
                          {lang.nativeName}
                        </Text>
                        <Text
                          style={[
                            styles.languageEnglish,
                            { color: themeColors.text.hint },
                          ]}
                        >
                          {lang.name}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.languageCheckCircle,
                          {
                            backgroundColor: isSelected
                              ? visual.accent
                              : 'transparent',
                            borderColor: isSelected
                              ? visual.accent
                              : isDark
                                ? colors.semiTransparent.white20
                                : colors.semiTransparent.black20,
                          },
                        ]}
                      >
                        {isSelected && (
                          <Icon
                            name="check"
                            size={ms(14)}
                            color={colors.common.white}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>

            <View style={styles.modalFooter}>
              <Icon
                name="information-outline"
                size={ms(12)}
                color={themeColors.text.hint}
              />
              <Text
                variant="caption"
                style={{
                  color: themeColors.text.hint,
                  marginLeft: ms(4),
                  flex: 1,
                }}
              >
                Changes apply across the entire app
              </Text>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  triggerWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerInner: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  triggerBadge: {
    position: 'absolute',
    bottom: -ms(2),
    right: -ms(4),
    minWidth: ms(18),
    height: ms(14),
    borderRadius: ms(7),
    paddingHorizontal: ms(4),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  triggerBadgeText: {
    color: colors.common.white,
    fontSize: ms(8),
    fontFamily: fontFamily.bold,
    letterSpacing: 0.4,
    lineHeight: ms(10),
    includeFontPadding: false,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay.modal,
  },
  modalCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: ms(380),
    borderRadius: ms(20),
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 14,
  },
  modalGradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ms(140),
  },
  modalHeader: {
    marginBottom: spacing.md,
  },
  modalHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalHeaderIcon: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageList: {
    gap: ms(8),
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ms(10),
    paddingHorizontal: ms(12),
    borderRadius: ms(14),
    borderWidth: 1.5,
  },
  languageFlag: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ms(12),
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  languageFlagText: {
    color: colors.common.white,
    fontSize: ms(13),
    fontFamily: fontFamily.bold,
    letterSpacing: 0.6,
    ...Platform.select({
      android: {
        textShadowColor: colors.semiTransparent.black30,
        textShadowRadius: 2,
      },
    }),
  },
  languageTextWrap: {
    flex: 1,
  },
  languageNative: {
    fontSize: ms(15),
  },
  languageEnglish: {
    fontSize: ms(11),
    fontFamily: fontFamily.regular,
    marginTop: ms(1),
  },
  languageCheckCircle: {
    width: ms(22),
    height: ms(22),
    borderRadius: ms(11),
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: ms(8),
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.semiTransparent.gray30,
  },
});

export default LanguageSelector;
