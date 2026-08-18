import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Icon } from './Icon';
import { Text } from './Text';
import { BottomSheet } from './BottomSheet';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { ms, vs } from '../../utils/responsive';
import { colors } from '../../theme/colors';
import { TimezoneInfo, getTzAbbreviation } from '../../utils/timezone';
import { useTimezoneStore } from '../../store/timezoneStore';
import { timezoneService } from '../../api/services/timezoneService';

interface TimezoneSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
  onTimezoneChanged?: (tz: TimezoneInfo) => void;
}

export const TimezoneSwitcherModal: React.FC<TimezoneSwitcherModalProps> = ({
  visible,
  onClose,
  onTimezoneChanged,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const themeColors = isDark ? colors.dark : colors.light;

  const { height: screenHeight } = useWindowDimensions();
  const { timezone: currentTimezone, companyTimezone, setTimezone } = useTimezoneStore();
  const [timezones, setTimezones] = useState<TimezoneInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      loadTimezones();
    }
  }, [visible]);

  const loadTimezones = async () => {
    setIsLoading(true);
    try {
      const data = await timezoneService.getTimezones();
      setTimezones(data);
    } catch {
      setTimezones([]);
    }
    setIsLoading(false);
  };

  const handleSelect = async (tz: TimezoneInfo) => {
    if (tz.id === currentTimezone.id || pendingId) return;
    setPendingId(tz.id);
    try {
      await setTimezone(tz);
      onTimezoneChanged?.(tz);
      setPendingId(null);
      onClose();
    } catch {
      setPendingId(null);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('settings.timezone')}
      subtitle={t('settings.selectTimezone')}
      headerIcon="clock-outline"
      height={Math.min(timezones.length * vs(56) + vs(160), screenHeight * 0.85)}
      disableScroll
    >
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : (
        <View>
          {timezones.map((item, index) => {
            const isActive = currentTimezone.id === item.id;
            const isPending = pendingId === item.id;
            const isCompanyTz = companyTimezone?.id === item.id;
            const abbr = getTzAbbreviation(item.iana_code);

            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
                disabled={!!pendingId}
                style={[
                  styles.row,
                  index !== timezones.length - 1 && {
                    borderBottomColor: themeColors.border,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                  isActive && {
                    backgroundColor: isDark
                      ? colors.semiTransparent.green10
                      : colors.semiTransparent.green08,
                    borderRadius: ms(12),
                  },
                ]}
              >
                <View
                  style={[
                    styles.tzIconBox,
                    {
                      backgroundColor: isActive
                        ? colors.primary.main
                        : isDark
                          ? colors.semiTransparent.white08
                          : colors.semiTransparent.black04,
                    },
                  ]}
                >
                  <Icon
                    name="earth"
                    size={ms(18)}
                    color={isActive ? colors.common.white : themeColors.text.hint}
                  />
                </View>

                <View style={styles.rowText}>
                  <View style={styles.nameRow}>
                    <Text
                      variant="bodySmall"
                      style={{
                        fontWeight: '600',
                        color: isActive ? colors.primary.main : themeColors.text.primary,
                      }}
                    >
                      {item.display_name}
                    </Text>
                    {isCompanyTz && (
                      <View
                        style={[
                          styles.companyBadge,
                          {
                            backgroundColor: isDark
                              ? colors.semiTransparent.white10
                              : colors.semiTransparent.black04,
                            borderColor: isDark
                              ? colors.semiTransparent.white15
                              : colors.semiTransparent.black08,
                          },
                        ]}
                      >
                        <Icon name="domain" size={ms(10)} color={themeColors.text.secondary} />
                        <Text
                          variant="captionSmall"
                          color="secondary"
                          style={{ marginLeft: ms(3), fontWeight: '500' }}
                        >
                          {t('settings.companyTime')}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text variant="caption" color="secondary" style={{ marginTop: ms(2) }}>
                    {item.current_time || `${abbr}`}
                    {'  '}
                    <Text variant="captionSmall" color="hint">(UTC{item.current_utc_offset || item.utc_offset})</Text>
                  </Text>
                </View>

                {isPending ? (
                  <View style={styles.checkBox}>
                    <ActivityIndicator size="small" color={colors.primary.main} />
                  </View>
                ) : isActive ? (
                  <View style={[styles.checkBox, { backgroundColor: colors.primary.main }]}>
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

          {/* Footer hint */}
          {timezones.length > 0 && (
            <View style={[styles.footer, { borderTopColor: themeColors.border }]}>
              <Icon name="information-outline" size={ms(14)} color={themeColors.text.hint} />
              <Text
                variant="captionSmall"
                color="hint"
                style={{ marginLeft: ms(6), flex: 1 }}
              >
                {t('settings.timezoneHint')}
              </Text>
            </View>
          )}
        </View>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(4),
    paddingVertical: vs(12),
  },
  tzIconBox: {
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
  nameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flexWrap: 'wrap' as const,
    gap: ms(8),
  },
  companyBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: ms(7),
    paddingVertical: ms(3),
    borderRadius: ms(6),
    borderWidth: 0.5,
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
    paddingVertical: vs(12),
    marginTop: ms(8),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  loadingContainer: {
    paddingVertical: vs(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TimezoneSwitcherModal;
