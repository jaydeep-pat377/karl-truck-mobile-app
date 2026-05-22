import React, { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TAB_BAR_HEIGHT } from '../../../components/navigation';
import { PG } from './_data/theme';
import { MOCK_ORDERS } from './_data/mock-orders';
import type { MockOrder } from './_data/types';
import { TopBar } from './_components/TopBar';
import { PageHeader } from './_components/PageHeader';
import { StatusFilterRow } from './_components/StatusFilterRow';
import { Footer } from './_components/Footer';
import { OrderCard } from './_components/OrderCard';
import { OrderDetailSheet } from './_components/OrderDetailSheet';
import { DirectionSwitcher } from './_components/DirectionSwitcher';

export function OrdersRedesignScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<MockOrder | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const onCardPress = useCallback((o: MockOrder) => {
    setSelected(o);
    setSheetVisible(true);
  }, []);

  const onClose = useCallback(() => {
    setSheetVisible(false);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={PG.surface} />
      <TopBar onClose={() => navigation.goBack()} />
      <FlatList
        data={MOCK_ORDERS}
        keyExtractor={item => item.order_code}
        renderItem={({ item }) => (
          <OrderCard order={item} onPress={onCardPress} />
        )}
        ListHeaderComponent={
          <View>
            <DirectionSwitcher />
            <PageHeader crumb="Today" />
            <StatusFilterRow />
          </View>
        }
        ListFooterComponent={<Footer shown={MOCK_ORDERS.length} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      />
      <OrderDetailSheet
        order={selected}
        visible={sheetVisible}
        onClose={onClose}
      />
    </SafeAreaView>
  );
}

export default OrdersRedesignScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PG.bg,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
