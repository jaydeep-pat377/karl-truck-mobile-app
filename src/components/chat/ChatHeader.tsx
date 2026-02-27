import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text, Icon } from '../common';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';
import { fontFamily } from '../../theme/typography';

interface ChatHeaderProps {
  title: string;
  onBack: () => void;
  onInfo?: () => void;
  orderCode?: string;
  orderDate?: string;
  customerName?: string;
  projectName?: string;
  deliveryAddress?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  onBack,
  onInfo,
  orderCode,
  orderDate,
  customerName,
  projectName,
  deliveryAddress,
}) => {

  const displayTitle = title.replace(/^Order\s*#/i, '').trim();

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        activeOpacity={0.7}>
        <Icon name="arrow-left" size={ms(20)} color={colors.common.white} />
      </TouchableOpacity>

      <View style={styles.contentContainer}>
        <TouchableOpacity
          style={styles.titleContainer}
          onPress={onInfo}
          activeOpacity={onInfo ? 0.7 : 1}
          disabled={!onInfo}>
          <Text style={styles.title} numberOfLines={1}>
            Order {displayTitle}
          </Text>
        </TouchableOpacity>

        {/* Date and Customer Row */}
        <View style={styles.infoRow}>
          {orderDate && (
            <View style={styles.infoItem}>
              <Icon name="calendar-month" size={ms(14)} color={colors.common.white} />
              <Text style={styles.infoText}>{formatDate(orderDate)}</Text>
            </View>
          )}
          {orderDate && customerName && (
            <Text style={styles.separator}>•</Text>
          )}
          {customerName && (
            <View style={styles.infoItem}>
              <Icon name="account" size={ms(14)} color={colors.common.white} />
              <Text style={styles.infoText} numberOfLines={1}>{customerName}</Text>
            </View>
          )}
        </View>

        {/* Project Name Row */}
        {projectName && (
          <View style={styles.addressRow}>
            <Icon name="clipboard-text-outline" size={ms(14)} color={colors.common.white} />
            <Text style={styles.addressText} numberOfLines={1}>{projectName}</Text>
          </View>
        )}

        {/* Address Row */}
        {deliveryAddress && (
          <View style={styles.addressRow}>
            <Icon name="map-marker" size={ms(14)} color={colors.common.white} />
            <Text style={styles.addressText} numberOfLines={1}>{deliveryAddress}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingTop: Platform.OS === 'ios' ? spacing.md : spacing.md,
    backgroundColor: colors.primary.main,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.headerOverlay.bg,
    marginTop: ms(2),
  },
  contentContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  titleContainer: {
    justifyContent: 'center',
  },
  title: {
    fontSize: ms(18),
    fontFamily: fontFamily.bold,
    letterSpacing: -0.3,
    color: colors.common.white,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ms(4),
    flexWrap: 'wrap',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
  },
  infoText: {
    color: colors.common.white,
    fontSize: ms(12),
    fontFamily: fontFamily.medium,
    opacity: 0.95,
  },
  separator: {
    color: colors.common.white,
    fontSize: ms(12),
    marginHorizontal: ms(6),
    opacity: 0.7,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ms(4),
    gap: ms(4),
  },
  addressText: {
    color: colors.common.white,
    fontSize: ms(12),
    fontFamily: fontFamily.medium,
    opacity: 0.95,
    flex: 1,
  },
});

export default ChatHeader;
