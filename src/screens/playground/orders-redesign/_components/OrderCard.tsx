import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { PG, PG_FONT, tnum } from '../_data/theme';
import { statusMeta } from '../_data/status-config';
import type { MockOrder } from '../_data/types';
import { StatusPill } from './StatusPill';
import { LifecycleBar } from './LifecycleBar';
import { ActionTray } from './ActionTray';

function weatherIconName(condition: string, windMph: number): string {
  const c = condition.toLowerCase();
  if (c.includes('rain')) return 'weather-pouring';
  if (windMph >= 20) return 'weather-windy';
  if (c.includes('clear') || c.includes('sunny') || c.includes('hot')) return 'weather-sunny';
  return 'weather-cloudy';
}

function MiniField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text
        style={[styles.fieldValue, mono && styles.mono, mono && tnum]}
        numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function OrderCard({
  order,
  onPress,
}: {
  order: MockOrder;
  onPress?: (o: MockOrder) => void;
}) {
  const o = order;
  const canceled = o.status_category === 'CANCELED';
  const meta = statusMeta(o.status_category, o.sub_status);
  const railColor = o.is_critical ? PG.bad : meta.rail;
  const wxColor = o.weather?.risk === 'bad' ? PG.bad : PG.ink3;
  const wxIcon = o.weather
    ? weatherIconName(o.weather.condition, o.weather.windMph)
    : 'weather-cloudy';

  return (
    <Pressable
      onPress={() => onPress?.(o)}
      style={({ pressed }) => [
        styles.card,
        canceled && styles.canceled,
        o.is_critical && styles.critical,
        pressed && styles.pressed,
      ]}>
      <View style={[styles.rail, { backgroundColor: railColor }]} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.codeRow}>
              <Text style={[styles.code, styles.mono]}>{o.order_code}</Text>
              <StatusPill category={o.status_category} sub={o.sub_status} />
            </View>
            <Text
              style={[
                styles.customer,
                canceled && styles.customerCanceled,
              ]}
              numberOfLines={1}>
              {o.customer_name}
            </Text>
            <View style={styles.addrRow}>
              <Icon name="map-marker-outline" size={11} color={PG.ink3} />
              <Text style={styles.addr} numberOfLines={1}>
                {o.delivery_addr_short}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.starBtn} activeOpacity={0.6}>
            <Icon
              name={o.is_favourite ? 'star' : 'star-outline'}
              size={16}
              color={o.is_favourite ? PG.pre : PG.ink4}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.qtyRow}>
          <Text style={[styles.qtyBig, { fontFamily: PG_FONT.serif }, tnum]}>
            {o.delivered_qty == null ? '—' : o.delivered_qty.toFixed(1)}
          </Text>
          <Text style={[styles.qtySmall, styles.mono, tnum]}>
            / {o.order_qty.toFixed(1)} CY ·{' '}
            {canceled
              ? 'canceled'
              : o.completion_pct === 100
              ? 'complete'
              : `${o.completion_pct}%`}
          </Text>
        </View>

        <LifecycleBar lifecycle={o.lifecycle} style={{ marginTop: 8 }} />

        <View style={styles.fieldsRow}>
          <MiniField label="START" value={o.start_time} mono />
          <MiniField label="PLANT" value={o.plant_code} />
          <MiniField
            label="TRUCKS"
            value={`${o.ticket_count}/${o.total_loads}`}
            mono
          />
          <MiniField label="MIX" value={o.item_code} mono />
        </View>

        <View style={styles.footer}>
          <View style={styles.weatherRow}>
            <Icon name={wxIcon} size={13} color={wxColor} />
            <Text style={[styles.weather, { color: wxColor }]}>
              {o.weather
                ? `${o.weather.tempF}°F · ${o.weather.condition}`
                : 'No weather'}
            </Text>
          </View>
          <ActionTray
            unreadChat={o.unread_chat}
            actions={canceled ? ['open', 'reorder'] : ['open', 'map', 'call']}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: PG.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PG.line,
    overflow: 'hidden',
    marginBottom: 12,
  },
  pressed: {
    borderColor: PG.lineStrong,
  },
  canceled: {
    opacity: 0.75,
  },
  critical: {
    borderColor: PG.bad,
    borderWidth: 2,
  },
  rail: {
    width: 3,
  },
  body: {
    flex: 1,
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  code: {
    fontSize: 11,
    color: PG.ink3,
  },
  customer: {
    fontSize: 17,
    fontWeight: '600',
    color: PG.ink,
    marginTop: 4,
    lineHeight: 20,
  },
  customerCanceled: {
    color: PG.ink3,
    textDecorationLine: 'line-through',
  },
  addrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  addr: {
    fontSize: 12,
    color: PG.ink3,
    flexShrink: 1,
  },
  starBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 12,
  },
  qtyBig: {
    fontSize: 28,
    color: PG.ink,
    lineHeight: 30,
  },
  qtySmall: {
    fontSize: 12,
    color: PG.ink3,
  },
  fieldsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  field: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 10,
    color: PG.ink4,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  fieldValue: {
    marginTop: 2,
    fontSize: 12,
    color: PG.ink,
  },
  mono: {
    fontFamily: PG_FONT.mono,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: PG.line,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  weather: {
    fontSize: 11,
  },
});
