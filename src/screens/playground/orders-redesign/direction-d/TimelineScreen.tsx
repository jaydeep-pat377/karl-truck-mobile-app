import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
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
import { StatusFilterRow } from '../_components/StatusFilterRow';
import { Footer } from '../_components/Footer';
import { StatusPill } from '../_components/StatusPill';
import { LifecycleBar } from '../_components/LifecycleBar';
import { OrderDetailSheet } from '../_components/OrderDetailSheet';
import { DirectionSwitcher } from '../_components/DirectionSwitcher';

type BucketKey = 'EARLIER' | 'NOW' | 'COMING_UP' | 'LATER';
type Section = { title: string; subtitle: string; key: BucketKey; data: MockOrder[] };

const BUCKET_LABEL: Record<BucketKey, { title: string; subtitle: string }> = {
  EARLIER: { title: 'Earlier today', subtitle: 'Before 06:00' },
  NOW: { title: 'Now', subtitle: '06:00 – 09:00' },
  COMING_UP: { title: 'Coming up', subtitle: '09:00 – 12:00' },
  LATER: { title: 'Later', subtitle: 'After 12:00' },
};

function bucketOf(startTime: string): BucketKey {
  const h = parseInt(startTime.split(':')[0] || '0', 10);
  if (h < 6) return 'EARLIER';
  if (h < 9) return 'NOW';
  if (h < 12) return 'COMING_UP';
  return 'LATER';
}

function TimelineItem({
  order,
  onPress,
  isLast,
}: {
  order: MockOrder;
  onPress: (o: MockOrder) => void;
  isLast: boolean;
}) {
  const meta = statusMeta(order.status_category, order.sub_status);
  const dotColor = order.is_critical ? PG.bad : meta.dot;
  const canceled = order.status_category === 'CANCELED';
  const completed = order.status_category === 'COMPLETED';

  return (
    <Pressable
      onPress={() => onPress(order)}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
      <View style={styles.timeCol}>
        <Text style={[styles.time, styles.mono, tnum]}>{order.start_time}</Text>
        <Text style={[styles.timeEst, styles.mono, tnum]}>
          → {order.est_finish_time}
        </Text>
      </View>

      <View style={styles.railCol}>
        <View
          style={[
            styles.timelineDot,
            { backgroundColor: dotColor, borderColor: dotColor },
            completed && {
              backgroundColor: PG.surface,
              borderColor: PG.done,
            },
          ]}>
          {completed ? (
            <Icon name="check" size={9} color={PG.done} />
          ) : null}
        </View>
        {!isLast ? <View style={styles.timelineLine} /> : null}
      </View>

      <View style={styles.itemBody}>
        <View style={styles.itemHead}>
          <Text
            style={[styles.itemCustomer, canceled && styles.canceledText]}
            numberOfLines={1}>
            {order.customer_name}
          </Text>
          <StatusPill
            category={order.status_category}
            sub={order.sub_status}
          />
        </View>

        <View style={styles.itemAddrRow}>
          <Icon name="map-marker-outline" size={11} color={PG.ink3} />
          <Text style={styles.itemAddr} numberOfLines={1}>
            {order.delivery_addr_short}
          </Text>
        </View>

        <View style={styles.itemQtyRow}>
          <Text style={[styles.qtyBig, { fontFamily: PG_FONT.serif }, tnum]}>
            {order.delivered_qty == null ? '—' : order.delivered_qty.toFixed(0)}
          </Text>
          <Text style={[styles.qtySmall, styles.mono, tnum]}>
            /{order.order_qty.toFixed(0)} CY
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={[styles.caption]} numberOfLines={1}>
            {order.lifecycle_caption}
          </Text>
        </View>

        <LifecycleBar
          lifecycle={order.lifecycle}
          height={4}
          style={{ marginTop: 8 }}
        />

        <View style={styles.itemMeta}>
          <Text style={[styles.metaText, styles.mono]}>
            {order.plant_code} · {order.item_code}
          </Text>
          {order.is_favourite ? (
            <Icon name="star" size={11} color={PG.pre} style={{ marginLeft: 6 }} />
          ) : null}
          {order.is_critical ? (
            <Icon name="alert" size={11} color={PG.bad} style={{ marginLeft: 4 }} />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export function TimelineScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<MockOrder | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const sections: Section[] = useMemo(() => {
    const map: Record<BucketKey, MockOrder[]> = {
      EARLIER: [],
      NOW: [],
      COMING_UP: [],
      LATER: [],
    };
    for (const o of MOCK_ORDERS) {
      map[bucketOf(o.start_time)].push(o);
    }
    (Object.keys(map) as BucketKey[]).forEach(k => {
      map[k].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });
    return (Object.keys(map) as BucketKey[])
      .filter(k => map[k].length > 0)
      .map(k => ({
        key: k,
        title: BUCKET_LABEL[k].title,
        subtitle: BUCKET_LABEL[k].subtitle,
        data: map[k],
      }));
  }, []);

  const onCardPress = useCallback((o: MockOrder) => {
    setSelected(o);
    setSheetVisible(true);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={PG.surface} />
      <TopBar onClose={() => navigation.goBack()} />
      <SectionList
        sections={sections}
        keyExtractor={item => item.order_code}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => (
          <View
            style={[
              styles.sectionHead,
              section.key === 'NOW' && styles.sectionHeadActive,
            ]}>
            <Text
              style={[
                styles.sectionTitle,
                section.key === 'NOW' && styles.sectionTitleActive,
              ]}>
              {section.title}
            </Text>
            <Text style={[styles.sectionSubtitle, styles.mono]}>
              {section.subtitle}
            </Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <TimelineItem
            order={item}
            onPress={onCardPress}
            isLast={index === section.data.length - 1}
          />
        )}
        ListHeaderComponent={
          <View>
            <DirectionSwitcher />
            <PageHeader crumb="Today" />
            <StatusFilterRow />
          </View>
        }
        ListFooterComponent={<Footer shown={MOCK_ORDERS.length} />}
        contentContainerStyle={{
          paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 16,
        }}
      />
      <OrderDetailSheet
        order={selected}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

export default TimelineScreen;

const TIME_COL_W = 56;
const RAIL_COL_W = 22;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PG.bg,
  },
  sectionHead: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: PG.bg,
    borderBottomWidth: 1,
    borderBottomColor: PG.line,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionHeadActive: {
    backgroundColor: PG.ink,
  },
  sectionTitle: {
    fontFamily: PG_FONT.serif,
    fontSize: 18,
    color: PG.ink,
    letterSpacing: -0.2,
  },
  sectionTitleActive: {
    color: PG.surface,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: PG.ink3,
  },
  item: {
    flexDirection: 'row',
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 12,
    backgroundColor: PG.surface,
  },
  itemPressed: {
    backgroundColor: PG.surface2,
  },
  timeCol: {
    width: TIME_COL_W,
  },
  time: {
    fontSize: 16,
    color: PG.ink,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  timeEst: {
    fontSize: 10,
    color: PG.ink3,
    marginTop: 2,
  },
  railCol: {
    width: RAIL_COL_W,
    alignItems: 'center',
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: PG.line,
    marginTop: 4,
  },
  itemBody: {
    flex: 1,
  },
  itemHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemCustomer: {
    fontSize: 15,
    fontWeight: '600',
    color: PG.ink,
    flexShrink: 1,
  },
  canceledText: {
    color: PG.ink3,
    textDecorationLine: 'line-through',
  },
  itemAddrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  itemAddr: {
    fontSize: 12,
    color: PG.ink3,
    flexShrink: 1,
  },
  itemQtyRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  qtyBig: {
    fontSize: 22,
    color: PG.ink,
    lineHeight: 24,
  },
  qtySmall: {
    fontSize: 11,
    color: PG.ink3,
  },
  caption: {
    fontSize: 11,
    color: PG.ink3,
    flexShrink: 1,
    textAlign: 'right',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  metaText: {
    fontSize: 11,
    color: PG.ink3,
  },
  mono: {
    fontFamily: PG_FONT.mono,
  },
});
