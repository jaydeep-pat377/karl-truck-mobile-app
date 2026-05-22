import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { PG, PG_FONT } from '../_data/theme';

interface TopBarProps {
  onClose?: () => void;
}

export function TopBar({ onClose }: TopBarProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>T</Text>
        </View>
        <View>
          <Text style={styles.title}>Dolese Ready Mix</Text>
          <Text style={styles.subtitle}>Dispatch · Live</Text>
        </View>
      </View>
      <View style={styles.right}>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.6}>
          <Icon name="magnify" size={18} color={PG.ink3} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.6}>
          <Icon name="bell-outline" size={18} color={PG.ink3} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>3</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>HK</Text>
        </View>
        {onClose ? (
          <TouchableOpacity style={styles.iconBtn} onPress={onClose} activeOpacity={0.6}>
            <Icon name="close" size={18} color={PG.ink3} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: PG.surface,
    borderBottomWidth: 1,
    borderBottomColor: PG.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: PG.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: PG_FONT.serif,
    color: PG.surface,
    fontSize: 18,
    lineHeight: 20,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: PG.ink,
  },
  subtitle: {
    fontSize: 11,
    color: PG.ink3,
    marginTop: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 14,
    height: 14,
    paddingHorizontal: 3,
    borderRadius: 99,
    backgroundColor: PG.bad,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: PG.surface,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: PG_FONT.mono,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PG.surface2,
    borderWidth: 1,
    borderColor: PG.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '600',
    color: PG.ink,
  },
});
