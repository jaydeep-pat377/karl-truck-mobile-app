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
import { OrderDetailSheet } from '../_components/OrderDetailSheet';
import { DirectionSwitcher } from '../_components/DirectionSwitcher';

type Section = { title: string; data: MockOrder[] };

function CompactRow({
  order,
  onPress,
}: {
  order: MockOrder;
  onPress: (o: MockOrder) => void;
}) {
  const meta = statusMeta(order.status_category, order.sub_status);
  const railColor = order.is_critical ? PG.bad : meta.rail;
  const canceled = order.status_category === 'CANCELED';
  const pct = canceled ? 0 : order.completion_pct;

  return (
    <Pressable
      onPress={() => onPress(order)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={[styles.rail, { backgroundColor: railColor }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={[styles.code, styles.mono]} numberOfLines={1}>
            {order.order_code}
          </Text>
          <StatusPill
            category={order.status_category}
            sub={order.sub_status}
          />
          <View style={{ flex: 1 }} />
          <Text style={[styles.startTime, styles.mono, tnum]}>
            {order.start_time}
          </Text>
        </View>

        <Text
          style={[
            styles.customer,
            canceled && styles.customerCanceled,
          ]}
          numberOfLines={1}>
          {order.customer_name}
          <Text style={styles.addr}>
            {'  ·  '}
            {order.delivery_addr_short}
          </Text>
        </Text>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${pct}%`, backgroundColor: railColor },
            ]}
          />
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.meta, styles.mono, tnum]}>
            {order.delivered_qty == null ? '—' : order.delivered_qty.toFixed(1)}
            <Text style={styles.metaMuted}>
              {' / '}
              {order.order_qty.toFixed(1)} CY
            </Text>
          </Text>
          <Text style={styles.metaSep}>·</Text>
          <Text style={[styles.meta, styles.mono, tnum]}>
            {order.ticket_count}/{order.total_loads}
            <Text style={styles.metaMuted}> tk</Text>
          </Text>
          <Text style={styles.metaSep}>·</Text>
          <Text style={[styles.meta, styles.mono]}>
            {order.plant_code}
          </Text>
          <Text style={styles.metaSep}>·</Text>
          <Text style={[styles.meta, styles.mono]}>{order.item_code}</Text>
          <View style={{ flex: 1 }} />
          {order.is_favourite ? (
            <Icon name="star" size={12} color={PG.pre} />
          ) : null}
          {order.is_critical ? (
            <Icon
              name="alert"
              size={12}
              color={PG.bad}
              style={{ marginLeft: 4 }}
            />
          ) : null}
          {order.unread_chat > 0 ? (
            <View style={styles.chatPill}>
              <Icon name="message-outline" size={10} color={PG.surface} />
              <Text style={styles.chatPillText}>{order.unread_chat}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export function CompactListScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<MockOrder | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const sections: Section[] = useMemo(() => {
    const byCompany = new Map<string, MockOrder[]>();
    for (const o of MOCK_ORDERS) {
      const list = byCompany.get(o.customer_name) ?? [];
      list.push(o);
      byCompany.set(o.customer_name, list);
    }
    return Array.from(byCompany.entries()).map(([title, data]) => ({
      title,
      data,
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
        renderItem={({ item }) => (
          <CompactRow order={item} onPress={onCardPress} />
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={[styles.sectionCount, styles.mono]}>
              {section.data.length}
            </Text>
          </View>
        )}
        ItemSeparatorComponent={() => (
          <View style={styles.separator} />
        )}
        SectionSeparatorComponent={() => (
          <View style={styles.sectionSeparator} />
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

export default CompactListScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PG.bg,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: PG.bg,
  },
  sectionTitle: {
    fontSize: 11,
    color: PG.ink3,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  sectionCount: {
    fontSize: 11,
    color: PG.ink4,
  },
  sectionSeparator: {
    height: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: PG.surface,
    minHeight: 72,
  },
  rowPressed: {
    backgroundColor: PG.surface2,
  },
  rail: {
    width: 4,
    alignSelf: 'stretch',
  },
  body: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  code: {
    fontSize: 11,
    color: PG.ink3,
  },
  startTime: {
    fontSize: 11,
    color: PG.ink3,
  },
  customer: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: PG.ink,
  },
  customerCanceled: {
    color: PG.ink3,
    textDecorationLine: 'line-through',
  },
  addr: {
    fontWeight: '400',
    color: PG.ink3,
    fontSize: 12,
  },
  progressBar: {
    marginTop: 6,
    height: 3,
    borderRadius: 2,
    backgroundColor: PG.line,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  meta: {
    fontSize: 11,
    color: PG.ink,
  },
  metaMuted: {
    color: PG.ink3,
  },
  metaSep: {
    color: PG.ink4,
    fontSize: 11,
  },
  separator: {
    height: 1,
    backgroundColor: PG.line,
    marginLeft: 15,
  },
  mono: {
    fontFamily: PG_FONT.mono,
  },
  chatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    backgroundColor: PG.bad,
    borderRadius: 99,
    marginLeft: 6,
  },
  chatPillText: {
    fontFamily: PG_FONT.mono,
    fontSize: 9,
    color: PG.surface,
    fontWeight: '700',
  },
});
