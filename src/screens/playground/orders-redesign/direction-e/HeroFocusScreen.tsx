import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { TAB_BAR_HEIGHT } from '../../../../components/navigation';
import { PG, PG_FONT, tnum } from '../_data/theme';
import { statusMeta } from '../_data/status-config';
import { MOCK_ORDERS } from '../_data/mock-orders';
import type { MockOrder } from '../_data/types';
import { TopBar } from '../_components/TopBar';
import { PageHeader } from '../_components/PageHeader';
import { Footer } from '../_components/Footer';
import { StatusPill } from '../_components/StatusPill';
import { LifecycleBar } from '../_components/LifecycleBar';
import { OrderDetailSheet } from '../_components/OrderDetailSheet';
import { DirectionSwitcher } from '../_components/DirectionSwitcher';

function pickHero(orders: MockOrder[]): MockOrder {
  const crit = orders.find(
    o => o.is_critical && o.status_category === 'IN_PROCESS',
  );
  if (crit) return crit;
  const inProc = orders.find(o => o.status_category === 'IN_PROCESS');
  if (inProc) return inProc;
  return orders[0];
}

function HeroCard({
  order,
  onPress,
}: {
  order: MockOrder;
  onPress: (o: MockOrder) => void;
}) {
  const meta = statusMeta(order.status_category, order.sub_status);
  const railColor = order.is_critical ? PG.bad : meta.rail;

  return (
    <Pressable
      onPress={() => onPress(order)}
      style={({ pressed }) => [
        styles.heroCard,
        pressed && { borderColor: PG.lineStrong },
      ]}>
      <View style={[styles.heroRail, { backgroundColor: railColor }]} />
      <View style={styles.heroBody}>
        <View style={styles.heroHead}>
          <View style={styles.heroCodeRow}>
            <Text style={[styles.heroCode, styles.mono]}>
              {order.order_code}
            </Text>
            <StatusPill
              category={order.status_category}
              sub={order.sub_status}
            />
            {order.is_critical ? (
              <View style={styles.critPill}>
                <Icon name="alert" size={9} color={PG.surface} />
                <Text style={styles.critPillText}>Critical</Text>
              </View>
            ) : null}
          </View>
          {order.is_favourite ? (
            <Icon name="star" size={18} color={PG.pre} />
          ) : null}
        </View>

        <Text
          style={[styles.heroCustomer, { fontFamily: PG_FONT.serif }]}
          numberOfLines={2}>
          {order.customer_name}
        </Text>
        <Text style={styles.heroProject} numberOfLines={1}>
          {order.project_name} · {order.project_code}
        </Text>
        <View style={styles.heroAddrRow}>
          <Icon name="map-marker-outline" size={13} color={PG.ink3} />
          <Text style={styles.heroAddr} numberOfLines={1}>
            {order.delivery_addr_short}
          </Text>
        </View>

        <View style={styles.heroQtyRow}>
          <Text style={[styles.heroQtyBig, { fontFamily: PG_FONT.serif }, tnum]}>
            {order.delivered_qty == null
              ? '—'
              : order.delivered_qty.toFixed(1)}
          </Text>
          <View style={styles.heroQtyRight}>
            <Text style={[styles.heroQtyOf, styles.mono, tnum]}>
              / {order.order_qty.toFixed(1)} CY
            </Text>
            <Text style={[styles.heroPct, styles.mono, tnum]}>
              {order.completion_pct}% complete
            </Text>
          </View>
        </View>

        <LifecycleBar
          lifecycle={order.lifecycle}
          height={8}
          style={{ marginTop: 14 }}
        />
        <Text style={styles.heroCaption} numberOfLines={1}>
          {order.lifecycle_caption}
        </Text>

        <View style={styles.heroFooter}>
          <View style={styles.heroFooterCol}>
            <Text style={styles.heroFooterLabel}>START</Text>
            <Text style={[styles.heroFooterVal, styles.mono, tnum]}>
              {order.start_time}
            </Text>
          </View>
          <View style={styles.heroFooterCol}>
            <Text style={styles.heroFooterLabel}>EST. FINISH</Text>
            <Text style={[styles.heroFooterVal, styles.mono, tnum]}>
              {order.est_finish_time}
            </Text>
          </View>
          <View style={styles.heroFooterCol}>
            <Text style={styles.heroFooterLabel}>PLANT</Text>
            <Text style={styles.heroFooterVal}>{order.plant_code}</Text>
          </View>
          <View style={styles.heroFooterCol}>
            <Text style={styles.heroFooterLabel}>MIX</Text>
            <Text style={[styles.heroFooterVal, styles.mono]}>
              {order.item_code}
            </Text>
          </View>
        </View>

        <View style={styles.heroActions}>
          <TouchableOpacity style={styles.actionPrimary} activeOpacity={0.85}>
            <Icon name="map-outline" size={15} color={PG.surface} />
            <Text style={styles.actionPrimaryText}>Map · live</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionSecondary} activeOpacity={0.7}>
            <Icon name="phone-outline" size={15} color={PG.ink} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionSecondary, styles.actionSecondaryBadge]}
            activeOpacity={0.7}>
            <Icon name="message-outline" size={15} color={PG.ink} />
            {order.unread_chat > 0 ? (
              <View style={styles.chatDot}>
                <Text style={styles.chatDotText}>{order.unread_chat}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionSecondary} activeOpacity={0.7}>
            <Icon name="dots-horizontal" size={15} color={PG.ink} />
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );
}

function UpNextCard({
  order,
  onPress,
}: {
  order: MockOrder;
  onPress: (o: MockOrder) => void;
}) {
  const meta = statusMeta(order.status_category, order.sub_status);
  const canceled = order.status_category === 'CANCELED';
  return (
    <Pressable
      onPress={() => onPress(order)}
      style={({ pressed }) => [
        styles.miniCard,
        pressed && { borderColor: PG.lineStrong },
      ]}>
      <View style={[styles.miniRail, { backgroundColor: meta.rail }]} />
      <View style={styles.miniBody}>
        <View style={styles.miniHead}>
          <Text style={[styles.miniCode, styles.mono]}>
            {order.order_code.replace('ORD-', '')}
          </Text>
          <Text style={[styles.miniTime, styles.mono, tnum]}>
            {order.start_time}
          </Text>
        </View>
        <Text
          style={[styles.miniCustomer, canceled && styles.canceledText]}
          numberOfLines={2}>
          {order.customer_name}
        </Text>
        <StatusPill
          category={order.status_category}
          sub={order.sub_status}
        />
        <View style={styles.miniProgress}>
          <View
            style={[
              styles.miniProgressFill,
              {
                width: `${canceled ? 0 : order.completion_pct}%`,
                backgroundColor: meta.rail,
              },
            ]}
          />
        </View>
        <Text style={[styles.miniQty, styles.mono, tnum]}>
          {order.delivered_qty == null ? '—' : order.delivered_qty.toFixed(0)}
          <Text style={styles.metaMuted}>
            /{order.order_qty.toFixed(0)} CY
          </Text>
        </Text>
      </View>
    </Pressable>
  );
}

function TailRow({
  order,
  onPress,
}: {
  order: MockOrder;
  onPress: (o: MockOrder) => void;
}) {
  const meta = statusMeta(order.status_category, order.sub_status);
  const canceled = order.status_category === 'CANCELED';
  return (
    <Pressable
      onPress={() => onPress(order)}
      style={({ pressed }) => [
        styles.tailRow,
        pressed && { backgroundColor: PG.surface2 },
      ]}>
      <View style={[styles.tailRail, { backgroundColor: meta.rail }]} />
      <View style={styles.tailRowContent}>
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.tailCustomer, canceled && styles.canceledText]}
            numberOfLines={1}>
            {order.customer_name}
          </Text>
          <Text style={[styles.tailMeta, styles.mono]} numberOfLines={1}>
            {order.order_code} · {order.start_time} · {meta.label}
          </Text>
        </View>
        <Text style={[styles.tailQty, styles.mono, tnum]}>
          {order.delivered_qty == null ? '—' : order.delivered_qty.toFixed(0)}
          <Text style={styles.metaMuted}>/{order.order_qty.toFixed(0)}</Text>
        </Text>
        <Icon name="chevron-right" size={16} color={PG.ink4} />
      </View>
    </Pressable>
  );
}

export function HeroFocusScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<MockOrder | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const hero = useMemo(() => pickHero(MOCK_ORDERS), []);
  const upNext = useMemo(
    () =>
      MOCK_ORDERS.filter(
        o =>
          o.order_code !== hero.order_code &&
          o.status_category !== 'COMPLETED' &&
          o.status_category !== 'CANCELED',
      ).slice(0, 4),
    [hero],
  );
  const tail = useMemo(
    () =>
      MOCK_ORDERS.filter(
        o =>
          o.order_code !== hero.order_code &&
          !upNext.includes(o),
      ),
    [hero, upNext],
  );

  const onCardPress = useCallback((o: MockOrder) => {
    setSelected(o);
    setSheetVisible(true);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={PG.surface} />
      <TopBar onClose={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{
          paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 16,
        }}
        showsVerticalScrollIndicator={false}>
        <DirectionSwitcher />
        <PageHeader crumb="Today" />

        <View style={styles.heroWrap}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>NOW</Text>
            <Text style={[styles.sectionCount, styles.mono]}>
              1 active focus
            </Text>
          </View>
          <HeroCard order={hero} onPress={onCardPress} />
        </View>

        {upNext.length > 0 ? (
          <View style={styles.upNextWrap}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionLabel}>UP NEXT</Text>
              <Text style={[styles.sectionCount, styles.mono]}>
                {upNext.length}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.upNextRow}>
              {upNext.map(o => (
                <UpNextCard
                  key={o.order_code}
                  order={o}
                  onPress={onCardPress}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {tail.length > 0 ? (
          <View style={styles.tailWrap}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionLabel}>MORE</Text>
              <Text style={[styles.sectionCount, styles.mono]}>
                {tail.length}
              </Text>
            </View>
            <View style={styles.tailList}>
              {tail.map((o, i) => (
                <View key={o.order_code}>
                  <TailRow order={o} onPress={onCardPress} />
                  {i < tail.length - 1 ? (
                    <View style={styles.tailSep} />
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Footer shown={MOCK_ORDERS.length} />
      </ScrollView>
      <OrderDetailSheet
        order={selected}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

export default HeroFocusScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PG.bg,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    color: PG.ink3,
    letterSpacing: 1.4,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sectionCount: {
    fontSize: 11,
    color: PG.ink4,
  },
  heroWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  heroCard: {
    flexDirection: 'row',
    backgroundColor: PG.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PG.line,
    overflow: 'hidden',
  },
  heroRail: {
    width: 4,
  },
  heroBody: {
    flex: 1,
    padding: 18,
  },
  heroHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  heroCode: {
    fontSize: 11,
    color: PG.ink3,
  },
  critPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: PG.bad,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
  },
  critPillText: {
    color: PG.surface,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroCustomer: {
    fontSize: 28,
    color: PG.ink,
    marginTop: 10,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  heroProject: {
    fontSize: 12,
    color: PG.ink3,
    marginTop: 4,
  },
  heroAddrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  heroAddr: {
    fontSize: 12,
    color: PG.ink3,
    flexShrink: 1,
  },
  heroQtyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginTop: 16,
  },
  heroQtyBig: {
    fontSize: 56,
    color: PG.ink,
    lineHeight: 56,
    letterSpacing: -1,
  },
  heroQtyRight: {
    flex: 1,
  },
  heroQtyOf: {
    fontSize: 14,
    color: PG.ink3,
  },
  heroPct: {
    fontSize: 11,
    color: PG.ink3,
    marginTop: 2,
  },
  heroCaption: {
    fontSize: 11,
    color: PG.ink3,
    marginTop: 6,
  },
  heroFooter: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: PG.line,
    gap: 8,
  },
  heroFooterCol: {
    flex: 1,
  },
  heroFooterLabel: {
    fontSize: 9,
    color: PG.ink4,
    letterSpacing: 1,
  },
  heroFooterVal: {
    fontSize: 13,
    color: PG.ink,
    marginTop: 2,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
  },
  actionPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: PG.ink,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionPrimaryText: {
    color: PG.surface,
    fontSize: 13,
    fontWeight: '600',
  },
  actionSecondary: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PG.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSecondaryBadge: {
    position: 'relative',
  },
  chatDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    backgroundColor: PG.bad,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: PG.surface,
  },
  chatDotText: {
    color: PG.surface,
    fontSize: 9,
    fontWeight: '700',
    fontFamily: PG_FONT.mono,
  },
  upNextWrap: {
    paddingBottom: 18,
  },
  upNextRow: {
    paddingHorizontal: 16,
    gap: 10,
  },
  miniCard: {
    width: 200,
    flexDirection: 'row',
    backgroundColor: PG.surface,
    borderWidth: 1,
    borderColor: PG.line,
    borderRadius: 12,
    overflow: 'hidden',
  },
  miniRail: {
    width: 3,
  },
  miniBody: {
    flex: 1,
    padding: 12,
  },
  miniHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniCode: {
    fontSize: 10,
    color: PG.ink3,
  },
  miniTime: {
    fontSize: 11,
    color: PG.ink3,
  },
  miniCustomer: {
    fontSize: 14,
    fontWeight: '600',
    color: PG.ink,
    marginTop: 6,
    marginBottom: 6,
    minHeight: 36,
  },
  miniProgress: {
    height: 3,
    borderRadius: 2,
    backgroundColor: PG.line,
    overflow: 'hidden',
    marginTop: 8,
  },
  miniProgressFill: {
    height: '100%',
  },
  miniQty: {
    marginTop: 6,
    fontSize: 12,
    color: PG.ink,
  },
  metaMuted: {
    color: PG.ink3,
  },
  tailWrap: {
    paddingBottom: 18,
  },
  tailList: {
    backgroundColor: PG.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: PG.line,
  },
  tailRow: {
    flexDirection: 'row',
    backgroundColor: PG.surface,
    minHeight: 56,
  },
  tailRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 12,
    gap: 4,
  },
  tailRail: {
    width: 4,
  },
  tailCustomer: {
    fontSize: 14,
    fontWeight: '600',
    color: PG.ink,
  },
  canceledText: {
    color: PG.ink3,
    textDecorationLine: 'line-through',
  },
  tailMeta: {
    fontSize: 11,
    color: PG.ink3,
    marginTop: 2,
  },
  tailQty: {
    fontSize: 13,
    color: PG.ink,
    marginRight: 4,
  },
  tailSep: {
    height: 1,
    backgroundColor: PG.line,
    marginLeft: 13,
  },
  mono: {
    fontFamily: PG_FONT.mono,
  },
});
