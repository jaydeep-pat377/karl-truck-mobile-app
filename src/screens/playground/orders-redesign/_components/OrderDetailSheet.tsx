import React, { useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PG, PG_FONT, STAGE_COLOR, tnum } from '../_data/theme';
import { STAGE_LABEL, STAGE_ORDER } from '../_data/status-config';
import type {
  ConfirmationPhase,
  MockOrder,
  StageKey,
} from '../_data/types';
import { StatusPill } from './StatusPill';
import { LifecycleBar } from './LifecycleBar';

const TABS = ['Details', 'Map', 'Chat', 'Contact'] as const;
const PERF_TABS = ['Performance', 'Tickets'] as const;

const SCREEN_H = Dimensions.get('window').height;

function confStepStyle(s: ConfirmationPhase['status']) {
  if (s === 'confirmed') {
    return { backgroundColor: PG.done, borderColor: PG.done };
  }
  if (s === 'pending') {
    return {
      backgroundColor: 'transparent',
      borderColor: PG.pre,
      borderStyle: 'dashed' as const,
    };
  }
  if (s === 'overdue') {
    return { backgroundColor: PG.bad, borderColor: PG.bad };
  }
  return { backgroundColor: 'transparent', borderColor: PG.ink4 };
}

function ConfLine({
  label,
  phase,
}: {
  label: string;
  phase: ConfirmationPhase;
}) {
  return (
    <View style={styles.confLineRow}>
      <View style={[styles.confDot, confStepStyle(phase.status)]} />
      <Text style={styles.confText}>
        <Text style={{ color: PG.ink }}>{label}</Text>
        <Text style={{ color: PG.ink3 }}>
          {' · '}
          {phase.channel && phase.at ? `${phase.channel} ${phase.at}` : phase.status}
        </Text>
      </Text>
    </View>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

interface OrderDetailSheetProps {
  order: MockOrder | null;
  visible: boolean;
  onClose: () => void;
}

export function OrderDetailSheet({
  order,
  visible,
  onClose,
}: OrderDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_H,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, backdrop]);

  const close = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_H,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 || g.vy > 0.8) {
          close();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    }),
  ).current;

  const segByKey = useMemo(() => {
    const m = new Map<StageKey, { cy: number; tk: number; current: boolean }>();
    if (!order) return m;
    for (const s of order.lifecycle) {
      m.set(s.key, { cy: s.cy, tk: s.tk, current: s.state === 'current' });
    }
    return m;
  }, [order]);

  if (!order) return null;
  const o = order;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdrop.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }) },
          ]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: SCREEN_H * 0.9,
              paddingBottom: insets.bottom,
              transform: [{ translateY }],
            },
          ]}>
          <View {...panResponder.panHandlers} style={styles.grabberWrap}>
            <View style={styles.grabber} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Header */}
            <View style={styles.section}>
              <View style={styles.headerRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.headerCodeRow}>
                    <View style={styles.pillGhost}>
                      <Text style={styles.pillGhostText}>{o.order_type}</Text>
                    </View>
                    <Text style={[styles.codeMono]}>{o.order_code}</Text>
                    <StatusPill
                      category={o.status_category}
                      sub={o.sub_status}
                      style={{ marginLeft: 4 }}
                    />
                  </View>
                  <Text style={styles.serifTitle} numberOfLines={2}>
                    {o.customer_name}
                  </Text>
                  <Text style={styles.subline} numberOfLines={1}>
                    {o.project_name} · {o.project_code}
                  </Text>
                  <View style={styles.addrRow}>
                    <Icon name="map-marker-outline" size={12} color={PG.ink3} />
                    <Text style={styles.addr} numberOfLines={1}>
                      {o.delivery_addr_short}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={close} style={styles.closeBtn} activeOpacity={0.6}>
                  <Icon name="close" size={18} color={PG.ink3} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabsRow}>
              {TABS.map((t, i) => (
                <View key={t} style={styles.tab}>
                  <Text
                    style={[
                      styles.tabText,
                      i === 0 && styles.tabTextActive,
                    ]}>
                    {t}
                  </Text>
                  {t === 'Chat' && o.unread_chat > 0 ? (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{o.unread_chat}</Text>
                    </View>
                  ) : null}
                  {i === 0 ? <View style={styles.tabIndicator} /> : null}
                </View>
              ))}
              <View style={{ flex: 1 }} />
              {PERF_TABS.map((t, i) => (
                <View key={t} style={[styles.tab, { paddingHorizontal: 4 }]}>
                  <Text
                    style={[
                      styles.tabTextSmall,
                      i === 0 && styles.tabTextActive,
                    ]}>
                    {t}
                  </Text>
                  {i === 0 ? <View style={styles.tabIndicator} /> : null}
                </View>
              ))}
            </View>

            {/* Hero progress */}
            <View style={styles.section}>
              <View style={styles.deliveredHead}>
                <Text style={styles.eyebrow}>DELIVERED</Text>
                <Text style={[styles.mono, tnum, { fontSize: 11, color: PG.ink3 }]}>
                  {o.ticket_count} of {o.total_loads} loads
                </Text>
              </View>
              <View style={styles.heroRow}>
                <Text
                  style={[
                    { fontFamily: PG_FONT.serif, color: PG.ink, fontSize: 40, lineHeight: 42 },
                    tnum,
                  ]}>
                  {o.delivered_qty == null ? '—' : o.delivered_qty.toFixed(1)}
                </Text>
                <Text style={[styles.mono, tnum, { fontSize: 13, color: PG.ink3 }]}>
                  / {o.order_qty.toFixed(1)} CY · {o.completion_pct}%
                </Text>
              </View>
              <LifecycleBar lifecycle={o.lifecycle} height={8} style={{ marginTop: 10 }} />

              <View style={styles.stageGrid}>
                {STAGE_ORDER.map(key => {
                  const seg = segByKey.get(key);
                  const has = seg && (seg.cy > 0 || seg.tk > 0);
                  return (
                    <View key={key} style={styles.stageRow}>
                      <View style={styles.stageLeft}>
                        <View
                          style={[
                            styles.stageSwatch,
                            { backgroundColor: STAGE_COLOR[key] },
                          ]}
                        />
                        <Text
                          style={[
                            styles.stageLabel,
                            seg?.current && styles.stageLabelCurrent,
                            !seg?.current && { color: PG.ink3 },
                          ]}>
                          {STAGE_LABEL[key]}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.mono,
                          tnum,
                          styles.stageVal,
                          seg?.current && styles.stageLabelCurrent,
                        ]}>
                        {has ? `${seg!.cy} CY · ${seg!.tk} tk` : '—'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Schedule + confirmation */}
            <View style={styles.section}>
              <View style={styles.kvGrid}>
                <View style={styles.kvCell}>
                  <Eyebrow>SCHEDULED START</Eyebrow>
                  <Text style={[styles.mono, tnum, styles.kvValue]}>{o.start_time}</Text>
                </View>
                <View style={styles.kvCell}>
                  <Eyebrow>EST. FINISH</Eyebrow>
                  <Text style={[styles.mono, tnum, styles.kvValue]}>
                    {o.est_finish_time}
                  </Text>
                </View>
                <View style={styles.kvCell}>
                  <Eyebrow>PLANT</Eyebrow>
                  <Text style={styles.kvValue}>
                    {o.plant_name} · {o.plant_code}
                  </Text>
                </View>
                <View style={styles.kvCell}>
                  <Eyebrow>MIX</Eyebrow>
                  <Text style={[styles.mono, styles.kvValue]}>
                    {o.item_code} · {o.description}
                  </Text>
                </View>
              </View>
              <View style={styles.confBlock}>
                <Eyebrow>CONFIRMATION</Eyebrow>
                <View style={styles.confRow}>
                  <ConfLine label="48h" phase={o.confirmation.c48} />
                  <ConfLine label="24h" phase={o.confirmation.c24} />
                </View>
              </View>
            </View>

            {/* Site contact */}
            <View style={styles.section}>
              <Eyebrow>SITE CONTACT</Eyebrow>
              <View style={styles.contactRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactName}>{o.ordered_by_name}</Text>
                  <Text style={[styles.mono, { fontSize: 12, color: PG.ink3, marginTop: 2 }]}>
                    {o.ordered_by_phone} · prefers {o.preferred_communication}
                  </Text>
                </View>
                <View style={styles.contactActions}>
                  <TouchableOpacity style={styles.iconBtn} activeOpacity={0.6}>
                    <Icon name="phone-outline" size={16} color={PG.ink3} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} activeOpacity={0.6}>
                    <Icon name="message-outline" size={16} color={PG.ink3} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Site conditions */}
            {o.weather ? (
              <View style={styles.section}>
                <Eyebrow>SITE CONDITIONS</Eyebrow>
                <View style={styles.wxGrid}>
                  <View style={styles.wxCell}>
                    <Text style={styles.wxLabel}>Temp</Text>
                    <Text style={[styles.mono, tnum, styles.wxValue]}>
                      {o.weather.tempF}°F
                    </Text>
                  </View>
                  <View style={styles.wxCell}>
                    <Text style={styles.wxLabel}>Wind</Text>
                    <Text style={[styles.mono, tnum, styles.wxValue]}>
                      {o.weather.windMph} mph
                    </Text>
                  </View>
                  <View style={styles.wxCell}>
                    <Text style={styles.wxLabel}>RH</Text>
                    <Text style={[styles.mono, tnum, styles.wxValue]}>
                      {o.weather.rhPct}%
                    </Text>
                  </View>
                  <View style={styles.wxCell}>
                    <Text style={styles.wxLabel}>Evap</Text>
                    <Text
                      style={[
                        styles.wxValue,
                        {
                          color:
                            o.weather.risk === 'bad'
                              ? PG.bad
                              : o.weather.risk === 'risk'
                              ? PG.pre
                              : PG.ink2,
                        },
                      ]}>
                      {o.weather.evaporationLevel}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Recent activity */}
            <View style={[styles.section, { borderBottomWidth: 0 }]}>
              <Eyebrow>RECENT ACTIVITY</Eyebrow>
              <View style={{ marginTop: 8 }}>
                {o.activity.map((a, i) => {
                  const color =
                    a.marker === 'info'
                      ? PG.ink4
                      : STAGE_COLOR[a.marker as StageKey];
                  return (
                    <View key={i} style={styles.actRow}>
                      <View
                        style={[styles.actDot, { backgroundColor: color }]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.actText}>{a.text}</Text>
                        <Text style={[styles.mono, { fontSize: 11, color: PG.ink3, marginTop: 2 }]}>
                          {a.time}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: PG.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  grabberWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: PG.line,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: PG.line,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  pillGhost: {
    borderWidth: 1,
    borderColor: PG.line,
    backgroundColor: 'transparent',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  pillGhostText: {
    fontSize: 10,
    color: PG.ink3,
    fontFamily: PG_FONT.mono,
    fontWeight: '600',
  },
  codeMono: {
    fontSize: 11,
    color: PG.ink3,
    fontFamily: PG_FONT.mono,
  },
  serifTitle: {
    fontFamily: PG_FONT.serif,
    fontSize: 24,
    color: PG.ink,
    marginTop: 6,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  subline: {
    fontSize: 12,
    color: PG.ink3,
    marginTop: 2,
  },
  addrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  addr: {
    fontSize: 12,
    color: PG.ink3,
    flexShrink: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: PG.line,
    gap: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 4,
    position: 'relative',
  },
  tabText: {
    fontSize: 12,
    color: PG.ink3,
    fontWeight: '500',
  },
  tabTextSmall: {
    fontSize: 11,
    color: PG.ink3,
    fontWeight: '500',
  },
  tabTextActive: {
    color: PG.ink,
  },
  tabIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: PG.ink,
  },
  tabBadge: {
    minWidth: 14,
    height: 14,
    paddingHorizontal: 3,
    backgroundColor: PG.bad,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
    fontFamily: PG_FONT.mono,
  },
  deliveredHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 10,
    color: PG.ink4,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
  },
  stageGrid: {
    marginTop: 12,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  stageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stageSwatch: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  stageLabel: {
    fontSize: 11,
    color: PG.ink,
  },
  stageLabelCurrent: {
    fontWeight: '700',
    color: PG.ink,
  },
  stageVal: {
    fontSize: 11,
    color: PG.ink,
  },
  kvGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  kvCell: {
    width: '50%',
    paddingVertical: 6,
  },
  kvValue: {
    marginTop: 2,
    fontSize: 13,
    color: PG.ink,
  },
  confBlock: {
    borderTopWidth: 1,
    borderTopColor: PG.line,
    paddingTop: 10,
    marginTop: 8,
  },
  confRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  confLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    borderWidth: 1.5,
  },
  confText: {
    fontSize: 11,
  },
  contactRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactName: {
    fontSize: 13,
    fontWeight: '500',
    color: PG.ink,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: PG.line,
  },
  wxGrid: {
    flexDirection: 'row',
    marginTop: 8,
  },
  wxCell: {
    flex: 1,
  },
  wxLabel: {
    fontSize: 10,
    color: PG.ink4,
  },
  wxValue: {
    marginTop: 2,
    fontSize: 12,
    color: PG.ink,
  },
  actRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
  },
  actDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    marginTop: 6,
  },
  actText: {
    fontSize: 12,
    color: PG.ink,
  },
  mono: {
    fontFamily: PG_FONT.mono,
  },
});
