import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { PG } from '../_data/theme';

export type ActionKey = 'open' | 'map' | 'chat' | 'call' | 'reorder' | 'more';

const ICON: Record<ActionKey, string> = {
  open: 'eye-outline',
  map: 'map-outline',
  chat: 'message-outline',
  call: 'phone-outline',
  reorder: 'repeat',
  more: 'dots-horizontal',
};

interface ActionTrayProps {
  unreadChat?: number;
  callBadge?: number;
  actions?: ActionKey[];
}

const DEFAULT: ActionKey[] = ['open', 'map', 'call'];

export function ActionTray({
  unreadChat = 0,
  callBadge = 0,
  actions = DEFAULT,
}: ActionTrayProps) {
  return (
    <View style={styles.row}>
      {actions.map(a => {
        const badge = a === 'chat' ? unreadChat : a === 'call' ? callBadge : 0;
        return (
          <TouchableOpacity key={a} style={styles.btn} activeOpacity={0.6}>
            <Icon name={ICON[a]} size={15} color={PG.ink3} />
            {badge > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 14,
    height: 14,
    paddingHorizontal: 3,
    backgroundColor: PG.bad,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: PG.surface,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
    lineHeight: 10,
  },
});
