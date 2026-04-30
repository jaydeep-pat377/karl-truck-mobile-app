import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
  ImageBackground,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Ellipse, Rect, Defs, LinearGradient as SvgGradient, Stop, Circle, G } from 'react-native-svg';
import { Text, Icon } from '../common';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';
import { fontFamily } from '../../theme/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.lg * 2;

const DeliveryIllustration: React.FC = () => (
  <Svg width={100} height={80} viewBox="0 0 100 80">
    <Defs>
      <SvgGradient id="truckGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#4CAF50" />
        <Stop offset="100%" stopColor="#2E7D32" />
      </SvgGradient>
      <SvgGradient id="boxGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#FFB74D" />
        <Stop offset="100%" stopColor="#FF9800" />
      </SvgGradient>
    </Defs>


    <Rect x="0" y="65" width="100" height="15" fill="#E0E0E0" rx="3" />
    <Path d="M10 72 L25 72 M35 72 L50 72 M60 72 L75 72 M85 72 L95 72" stroke="#BDBDBD" strokeWidth="2" strokeLinecap="round" strokeDasharray="8 6" />


    <Rect x="25" y="35" width="45" height="30" rx="4" fill="url(#truckGrad)" />


    <Path d="M70 45 L70 65 L85 65 L85 50 Q85 45 80 45 Z" fill="url(#truckGrad)" />
    <Rect x="73" y="48" width="8" height="8" rx="1" fill="#B3E5FC" />


    <Rect x="28" y="40" width="15" height="10" rx="2" fill="rgba(255,255,255,0.3)" />
    <Rect x="46" y="40" width="15" height="10" rx="2" fill="rgba(255,255,255,0.3)" />


    <Circle cx="38" cy="65" r="8" fill="#424242" />
    <Circle cx="38" cy="65" r="4" fill="#757575" />
    <Circle cx="78" cy="65" r="8" fill="#424242" />
    <Circle cx="78" cy="65" r="4" fill="#757575" />


    <G transform="translate(5, 15) rotate(-15)">
      <Rect width="18" height="14" rx="2" fill="url(#boxGrad)" />
      <Path d="M0 7 L18 7" stroke="#E65100" strokeWidth="1.5" />
      <Path d="M9 0 L9 14" stroke="#E65100" strokeWidth="1.5" />
    </G>

    <G transform="translate(12, 5) rotate(10)">
      <Rect width="14" height="11" rx="2" fill="#81D4FA" />
      <Path d="M0 5.5 L14 5.5" stroke="#0288D1" strokeWidth="1" />
      <Path d="M7 0 L7 11" stroke="#0288D1" strokeWidth="1" />
    </G>


    <Path d="M5 50 L15 50" stroke="#BDBDBD" strokeWidth="2" strokeLinecap="round" />
    <Path d="M0 55 L12 55" stroke="#BDBDBD" strokeWidth="1.5" strokeLinecap="round" />
    <Path d="M8 60 L18 60" stroke="#BDBDBD" strokeWidth="1" strokeLinecap="round" />
  </Svg>
);

const WeatherIllustration: React.FC = () => (
  <Svg width={100} height={80} viewBox="0 0 100 80">
    <Defs>
      <SvgGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFD54F" />
        <Stop offset="100%" stopColor="#FF9800" />
      </SvgGradient>
      <SvgGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#FFFFFF" />
        <Stop offset="100%" stopColor="#E3F2FD" />
      </SvgGradient>
    </Defs>


    <Circle cx="70" cy="25" r="18" fill="url(#sunGrad)" />


    <G stroke="#FFB300" strokeWidth="2.5" strokeLinecap="round">
      <Path d="M70 2 L70 8" />
      <Path d="M70 42 L70 48" />
      <Path d="M47 25 L53 25" />
      <Path d="M87 25 L93 25" />
      <Path d="M53 9 L57 13" />
      <Path d="M83 37 L87 41" />
      <Path d="M53 41 L57 37" />
      <Path d="M83 13 L87 9" />
    </G>


    <Path
      d="M15 55 Q5 55 5 45 Q5 38 12 38 Q12 30 22 30 Q28 30 32 34 Q35 28 45 28 Q58 28 58 40 Q65 40 65 48 Q65 55 55 55 Z"
      fill="url(#cloudGrad)"
    />


    <Path
      d="M75 60 Q68 60 68 53 Q68 48 73 48 Q73 44 80 44 Q88 44 88 52 Q92 52 92 56 Q92 60 86 60 Z"
      fill="url(#cloudGrad)"
      opacity="0.8"
    />


    <Ellipse cx="50" cy="75" rx="35" ry="5" fill="#C8E6C9" />
  </Svg>
);

export interface Advertisement {
  id: string;
  badge?: string;
  headline: string;
  subheadline?: string;
  description: string;
  ctaText: string;
  onAction?: () => void;
  image?: any;
  illustrationType?: 'delivery' | 'weather' | 'promo' | 'custom';
  gradientColors?: string[];
  accentColor?: string;
}

interface AdvertisementCardProps {
  advertisements: Advertisement[];
  onClose?: (id: string) => void;
  onActionPress?: (ad: Advertisement) => void;
}

export const AdvertisementCard: React.FC<AdvertisementCardProps> = ({
  advertisements,
  onClose,
  onActionPress,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const { t } = useTranslation();
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedAds, setDismissedAds] = useState<string[]>([]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / CARD_WIDTH);
    setActiveIndex(index);
  }, []);

  const handleClose = useCallback((id: string) => {
    setDismissedAds(prev => [...prev, id]);
    onClose?.(id);
  }, [onClose]);

  const visibleAds = advertisements.filter(ad => !dismissedAds.includes(ad.id));

  if (visibleAds.length === 0) {
    return null;
  }

  const renderIllustration = (ad: Advertisement) => {
    switch (ad.illustrationType) {
      case 'delivery':
        return <DeliveryIllustration />;
      case 'weather':
        return <WeatherIllustration />;
      case 'custom':
        if (ad.image) {
          return <Image source={ad.image} style={styles.customImage} resizeMode="cover" />;
        }
        return <DeliveryIllustration />;
      default:
        return <DeliveryIllustration />;
    }
  };

  const getGradientColors = (ad: Advertisement) => {
    if (ad.gradientColors) return ad.gradientColors;

    switch (ad.illustrationType) {
      case 'delivery':
        return isDark
          ? ['#1B5E20', '#2E7D32', '#388E3C']
          : ['#E8F5E9', '#C8E6C9', '#A5D6A7'];
      case 'weather':
        return isDark
          ? ['#E65100', '#F57C00', '#FF9800']
          : ['#FFF3E0', '#FFE0B2', '#FFCC80'];
      default:
        return isDark
          ? ['#1565C0', '#1976D2', '#2196F3']
          : ['#E3F2FD', '#BBDEFB', '#90CAF9'];
    }
  };

  const getAccentColor = (ad: Advertisement) => {
    if (ad.accentColor) return ad.accentColor;

    switch (ad.illustrationType) {
      case 'delivery':
        return colors.primary.main;
      case 'weather':
        return '#F57C00';
      default:
        return '#1976D2';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH}
      >
        {visibleAds.map((ad, index) => {
          const gradientColors = getGradientColors(ad);
          const accentColor = getAccentColor(ad);

          return (
            <View key={ad.id} style={[styles.cardWrapper, { width: CARD_WIDTH }]}>
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
              >

                <View style={[styles.adLabel, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.6)' }]}>
                  <Text style={styles.adLabelText}>{t('dashboard.adLabel')}</Text>
                </View>


                {ad.badge && (
                  <View style={[styles.promoBadge, { backgroundColor: accentColor }]}>
                    <Icon name="tag" size={ms(10)} color={colors.common.white} />
                    <Text style={styles.promoBadgeText}>
                      {ad.badge}
                    </Text>
                  </View>
                )}


                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.8)' }]}
                  onPress={() => handleClose(ad.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Icon name="close" size={ms(14)} color={isDark ? colors.common.white : colors.grey[60]} />
                </TouchableOpacity>


                <View style={styles.content}>

                  <View style={styles.textContent}>

                    <Text style={[styles.headline, { color: isDark ? colors.common.white : colors.grey[100] }]}>
                      {ad.headline}
                    </Text>


                    {ad.subheadline && (
                      <Text style={[styles.subheadline, { color: isDark ? 'rgba(255,255,255,0.85)' : colors.grey[70] }]}>
                        {ad.subheadline}
                      </Text>
                    )}


                    <Text
                      style={[styles.description, { color: isDark ? 'rgba(255,255,255,0.75)' : colors.grey[60] }]}
                      numberOfLines={2}
                    >
                      {ad.description}
                    </Text>


                    <TouchableOpacity
                      style={[styles.ctaButton, { backgroundColor: accentColor }]}
                      onPress={() => {
                        ad.onAction?.();
                        onActionPress?.(ad);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.ctaText}>{ad.ctaText}</Text>
                      <Icon name="arrow-right" size={ms(10)} color={colors.common.white} />
                    </TouchableOpacity>
                  </View>


                  <View style={styles.illustrationContainer}>
                    {renderIllustration(ad)}
                  </View>
                </View>


                {visibleAds.length > 1 && (
                  <View style={[styles.pageIndicator, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)' }]}>
                    <Text style={[styles.pageText, { color: isDark ? colors.common.white : colors.grey[70] }]}>
                      {index + 1}/{visibleAds.length}
                    </Text>
                  </View>
                )}


                <View pointerEvents="none" style={[styles.decorCircle1, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.4)' }]} />
                <View pointerEvents="none" style={[styles.decorCircle2, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.3)' }]} />
              </LinearGradient>
            </View>
          );
        })}
      </ScrollView>


      {visibleAds.length > 1 && (
        <View style={styles.dotsContainer}>
          {visibleAds.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                idx === activeIndex && styles.dotActive,
                {
                  backgroundColor: idx === activeIndex
                    ? colors.primary.main
                    : (isDark ? colors.grey[60] : colors.grey[30]),
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
  },
  cardWrapper: {
    paddingVertical: ms(4),
  },
  card: {
    borderRadius: ms(16),
    padding: ms(16),
    minHeight: ms(175),
    position: 'relative',
    overflow: 'hidden',
  },
  adLabel: {
    position: 'absolute',
    top: ms(12),
    left: ms(12),
    paddingHorizontal: ms(8),
    paddingVertical: ms(3),
    borderRadius: ms(4),
    zIndex: 5,
  },
  adLabelText: {
    fontSize: ms(9),
    fontFamily: fontFamily.bold,
    color: colors.common.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promoBadge: {
    position: 'absolute',
    top: ms(12),
    left: ms(42),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(10),
    paddingVertical: ms(4),
    borderRadius: ms(12),
    gap: ms(4),
    zIndex: 5,
  },
  promoBadgeText: {
    fontSize: ms(10),
    fontFamily: fontFamily.semiBold,
    color: colors.common.white,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  closeBtn: {
    position: 'absolute',
    top: ms(10),
    right: ms(10),
    width: ms(26),
    height: ms(26),
    borderRadius: ms(13),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  content: {
    flexDirection: 'row',
    marginTop: ms(28),
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
    paddingRight: ms(10),
  },
  headline: {
    fontSize: ms(18),
    fontFamily: fontFamily.bold,
    lineHeight: ms(24),
    marginBottom: ms(4),
  },
  subheadline: {
    fontSize: ms(13),
    fontFamily: fontFamily.semiBold,
    marginBottom: ms(6),
  },
  description: {
    fontSize: ms(12),
    fontFamily: fontFamily.regular,
    lineHeight: ms(17),
    marginBottom: ms(14),
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: ms(8),
    paddingVertical: ms(6),
    borderRadius: ms(12),
    gap: ms(3),

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  ctaText: {
    fontSize: ms(11),
    fontFamily: fontFamily.semiBold,
    color: colors.common.white,
  },
  illustrationContainer: {
    width: ms(120),
    height: ms(100),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: ms(12),
    overflow: 'hidden',
  },
  customImage: {
    width: ms(120),
    height: ms(100),
    borderRadius: ms(12),
  },
  pageIndicator: {
    position: 'absolute',
    bottom: ms(10),
    right: ms(12),
    paddingHorizontal: ms(8),
    paddingVertical: ms(3),
    borderRadius: ms(10),
  },
  pageText: {
    fontSize: ms(10),
    fontFamily: fontFamily.medium,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: ms(12),
    gap: ms(6),
  },
  dot: {
    width: ms(6),
    height: ms(6),
    borderRadius: ms(3),
  },
  dotActive: {
    width: ms(20),
    height: ms(6),
    borderRadius: ms(3),
  },

  decorCircle1: {
    position: 'absolute',
    width: ms(120),
    height: ms(120),
    borderRadius: ms(60),
    top: -ms(40),
    right: -ms(30),
  },
  decorCircle2: {
    position: 'absolute',
    width: ms(80),
    height: ms(80),
    borderRadius: ms(40),
    bottom: -ms(20),
    left: -ms(20),
  },
});

export default AdvertisementCard;
