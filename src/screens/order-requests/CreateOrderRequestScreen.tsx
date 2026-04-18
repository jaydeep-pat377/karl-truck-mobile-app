import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Modal,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon, ScreenContainer, ScreenHeader, Button } from '../../components/common';
import TruckLoader from '../../components/common/TruckLoader';
import CalendarPickerModal from '../../components/common/CalendarPickerModal';
import { colors } from '../../theme/colors';
import { spacing, ms } from '../../utils/responsive';
import { TAB_BAR_HEIGHT } from '../../components/navigation/CustomTabBar';
import {
  useOrderRequestFormData,
  useCreateOrderRequest,
  useUpdateOrderRequest,
  useOrderRequestDetail,
  useSearchProducts,
  useSearchOrders,
  useRecentOrderEntities,
} from '../../hooks/useOrderRequests';
import { OrderEntityCreateInput, ORDER_STATUS_LABELS, OrderType } from '../../types/orderRequest';
import { orderRequestService } from '../../api/services/orderRequestService';
import { useAuthStore } from '../../store/authStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CreateOrderRequestParams = {
  orderType?: OrderType;
  editOrderId?: string;
  prefillOrder?: Record<string, any>;
};

type CreateOrderRequestRouteProp = RouteProp<
  { CreateOrderRequest: CreateOrderRequestParams },
  'CreateOrderRequest'
>;

interface DropdownOption {
  value: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ORDER_TYPE_OPTIONS: { key: OrderType; label: string; icon: string }[] = [
  { key: 'with_project', label: 'With Project', icon: 'clipboard-check' },
  { key: 'without_project', label: 'W/O Project', icon: 'package-variant' },
  {
    key: 'without_project_with_product',
    label: 'W/O Project + Product',
    icon: 'clipboard-list',
  },
];

const ORDER_STATUS_OPTIONS: DropdownOption[] = [
  { value: '0', label: 'Normal' },
  { value: '1', label: 'Will Call' },
  { value: '2', label: 'Weather Permitting' },
  { value: '3', label: 'Hold' },
  { value: '4', label: 'Completed' },
  { value: '5', label: 'Wait List' },
];

const SPACING_TYPE_OPTIONS: DropdownOption[] = [
  { value: 'yards_per_hour', label: 'Yards / Hour' },
  { value: 'minutes', label: 'Minutes' },
];

const AIR_OPTIONS: DropdownOption[] = [
  { value: 'Interior(Non-Air)', label: 'Interior(Non-Air)' },
  { value: 'Exterior(Air Entrained)', label: 'Exterior(Air Entrained)' },
];

const PSI_OPTIONS: DropdownOption[] = [
  { value: '3000', label: '3000' },
  { value: '3500', label: '3500' },
  { value: '4000', label: '4000' },
  { value: '4500', label: '4500' },
  { value: '5000', label: '5000' },
];

const ROCK_SIZE_OPTIONS: DropdownOption[] = [
  { value: '1 1/2"(#57 Stone)', label: '1 1/2"(#57 Stone)' },
  { value: '3/8"(#8 Stone)', label: '3/8"(#8 Stone)' },
  { value: '1"(#67 Stone)', label: '1"(#67 Stone)' },
];

const FLY_ASH_OPTIONS: DropdownOption[] = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

const CALLBACK_OPTIONS: DropdownOption[] = [
  { value: 'No', label: 'No' },
  { value: 'Yes', label: 'Yes' },
];

const USAGE_OPTIONS: DropdownOption[] = [
  'APRONS', 'BALCONY', 'BASEMENT', 'BASEMENT SLAB', 'BASEMENT WALLS',
  'BASINS', 'BEAM', 'BLOCK FILL', 'BREEZEWAY', 'BRIDGE DECK',
  'CAISSONS', 'CANOPY', 'CAP', 'CATCH BASIN', 'CELLAR',
  'COLUMN', 'CONDUIT', 'CULVERT', 'CURB', 'CURB & GUTTER',
  'DIAMONDS', 'DITCH', 'DOCK', 'DRAIN', 'DRIVEWAY',
  'ELEVATED DECK', 'EQUIPMENT PAD', 'FILL', 'FLOOR', 'FOOTING',
  'FOUNDATION', 'FOUNDATION WALL', 'GARAGE', 'GRADE BEAM', 'GROUT',
  'GUTTER', 'HEADWALL', 'INLET', 'MANHOLE', 'MEDIAN',
  'MISC', 'MUD SLAB', 'OVERLAY', 'PAD', 'PARKING',
  'PATIO', 'PAVEMENT', 'PIER', 'PILASTER', 'PILE',
  'PLANTER', 'PORCH', 'POST', 'RAMP', 'RETAINING WALL',
  'RIP RAP', 'ROAD', 'RUNWAY', 'SHAFT', 'SHEAR WALL',
  'SIDEWALK', 'SLAB', 'SLAB ON GRADE', 'SLOPE PAVING', 'SOG',
  'SPILLWAY', 'STAIRS', 'STEM WALL', 'STEPS', 'STORM SHELTER',
  'STRUCTURAL', 'SWIMMING POOL', 'TILT WALL', 'TOPPING', 'TRENCH',
  'TROUGH', 'TUNNEL', 'VAULT', 'WALL', 'WASHOUT',
].map((u) => ({ value: u, label: u }));

const SLUMP_OPTIONS: DropdownOption[] = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '7', label: '7' },
  { value: '8', label: '8' },
  { value: '9', label: '9' },
  { value: '10', label: '10' },
];

const READONLY_STATUSES = ['approved', 'rejected', 'canceled'];

// ---------------------------------------------------------------------------
// SearchableDropdownModal
// ---------------------------------------------------------------------------

interface SearchableDropdownModalProps {
  visible: boolean;
  title: string;
  options: DropdownOption[];
  selectedValue: string;
  onSelect: (option: DropdownOption) => void;
  onClose: () => void;
  isDark: boolean;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  multiSelect?: boolean;
  selectedValues?: string[];
  onMultiSelect?: (values: string[], labels: string[]) => void;
}

const SearchableDropdownModal: React.FC<SearchableDropdownModalProps> = ({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  isDark,
  onSearchChange,
  searchPlaceholder,
  multiSelect = false,
  selectedValues = [],
  onMultiSelect,
}) => {
  const [localSelected, setLocalSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const themeColors = isDark ? colors.dark : colors.light;
  const isServerSearch = !!onSearchChange;

  // For server-side search, show options as-is; for client-side, filter locally
  const filtered = useMemo(() => {
    if (isServerSearch) return options;
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [search, options, isServerSearch]);

  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
    if (onSearchChange) onSearchChange(text);
  }, [onSearchChange]);

  useEffect(() => {
    if (!visible) {
      setSearch('');
      // Don't clear parent search state on close — handler needs the data
      // Parent will clear via setActiveDropdown(null) naturally
    } else if (multiSelect) {
      setLocalSelected(selectedValues);
    }
  }, [visible, multiSelect, selectedValues]);

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={[styles.modalOverlay]}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: themeColors.surface },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: themeColors.border },
            ]}
          >
            <Text variant="h3" style={{ flex: 1 }}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={ms(24)} color={themeColors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.modalSearchContainer}>
            <Icon
              name="magnify"
              size={ms(20)}
              color={themeColors.text.hint}
              style={{ marginRight: spacing.sm }}
            />
            <TextInput
              style={[
                styles.modalSearchInput,
                {
                  color: themeColors.text.primary,
                },
              ]}
              placeholder={searchPlaceholder || 'Search...'}
              placeholderTextColor={themeColors.text.hint}
              value={search}
              onChangeText={handleSearchChange}
              autoFocus
            />
          </View>

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.value}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isSelected = multiSelect
                ? localSelected.includes(item.value)
                : item.value === selectedValue;
              return (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    isSelected && {
                      backgroundColor: isDark
                        ? colors.semiTransparent.green10
                        : colors.semiTransparent.green08,
                    },
                  ]}
                  onPress={() => {
                    if (multiSelect) {
                      setLocalSelected((prev) =>
                        prev.includes(item.value)
                          ? prev.filter((v) => v !== item.value)
                          : [...prev, item.value],
                      );
                    } else {
                      onSelect(item);
                      onClose();
                    }
                  }}
                >
                  {multiSelect && (
                    <Icon
                      name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={ms(20)}
                      color={isSelected ? colors.primary.main : (isDark ? colors.dark.text.hint : colors.light.text.hint)}
                      style={{ marginRight: ms(10) }}
                    />
                  )}
                  <Text
                    variant="body"
                    style={[
                      { flex: 1 },
                      isSelected ? { color: colors.primary.main, fontWeight: '600' } : undefined,
                    ]}
                    numberOfLines={2}
                  >
                    {item.label}
                  </Text>
                  {!multiSelect && isSelected && (
                    <Icon name="check" size={ms(20)} color={colors.primary.main} />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Text variant="body" color="hint">
                  {isServerSearch && search.length < 2
                    ? 'Type at least 2 characters to search'
                    : 'No results found'}
                </Text>
              </View>
            }
            style={{ maxHeight: Dimensions.get('window').height * 0.5 }}
          />

          {/* Done button for multi-select */}
          {multiSelect && (
            <View style={{ padding: ms(12), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: themeColors.border }}>
              <TouchableOpacity
                style={{ backgroundColor: colors.primary.main, borderRadius: ms(10), paddingVertical: ms(12), alignItems: 'center' }}
                onPress={() => {
                  if (onMultiSelect) {
                    const labels = localSelected
                      .map((v) => options.find((o) => o.value === v)?.label || v)
                      .filter(Boolean);
                    onMultiSelect(localSelected, labels);
                  }
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text variant="buttonSmall" style={{ color: colors.common.white, fontWeight: '700' }}>
                  Done{localSelected.length > 0 ? ` (${localSelected.length})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Themed Alert Modal
// ---------------------------------------------------------------------------

interface ThemedAlertState {
  visible: boolean;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  onDismiss?: () => void;
}

const ALERT_INITIAL: ThemedAlertState = { visible: false, type: 'success', title: '', message: '' };

interface ThemedAlertModalProps {
  state: ThemedAlertState;
  onClose: () => void;
  isDark: boolean;
}

const ThemedAlertModal: React.FC<ThemedAlertModalProps> = ({ state, onClose, isDark }) => {
  const cardBg = isDark ? colors.dark.card : colors.common.white;
  const textColor = isDark ? colors.dark.text.primary : colors.light.text.primary;
  const secondaryColor = isDark ? colors.dark.text.secondary : colors.light.text.secondary;

  const accentColor = state.type === 'success' ? colors.success.main
    : state.type === 'error' ? colors.error.main
    : colors.warning.main;

  const iconName = state.type === 'success' ? 'check-circle'
    : state.type === 'error' ? 'alert-circle'
    : 'alert';

  const handleClose = () => {
    onClose();
    if (state.onDismiss) state.onDismiss();
  };

  return (
    <Modal visible={state.visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={themedAlertStyles.overlay}>
        <View style={[themedAlertStyles.card, { backgroundColor: cardBg }]}>
          <View style={[themedAlertStyles.iconCircle, { backgroundColor: accentColor + '15' }]}>
            <Icon name={iconName} size={ms(32)} color={accentColor} />
          </View>
          <Text variant="h3" style={[themedAlertStyles.title, { color: textColor }]}>{state.title}</Text>
          <Text variant="bodySmall" style={[themedAlertStyles.message, { color: secondaryColor }]}>{state.message}</Text>
          <TouchableOpacity
            style={[themedAlertStyles.btn, { backgroundColor: accentColor }]}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text variant="buttonSmall" style={{ color: colors.common.white, fontWeight: '700' }}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const themedAlertStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay.medium,
    justifyContent: 'center',
    alignItems: 'center',
    padding: ms(24),
  },
  card: {
    width: '100%',
    maxWidth: ms(340),
    borderRadius: ms(16),
    padding: ms(24),
    alignItems: 'center',
    shadowColor: colors.common.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  iconCircle: {
    width: ms(56),
    height: ms(56),
    borderRadius: ms(28),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ms(16),
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: ms(8),
  },
  message: {
    textAlign: 'center',
    lineHeight: ms(20),
    marginBottom: ms(20),
  },
  btn: {
    width: '100%',
    height: ms(44),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const CreateOrderRequestScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<CreateOrderRequestRouteProp>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const { showRegion } = useAuthStore();

  const { orderType: routeOrderType, editOrderId, prefillOrder } = route.params ?? {};
  const isEditMode = !!editOrderId;

  // Data hooks
  const { formData, isLoading: isFormDataLoading } = useOrderRequestFormData();
  const createMutation = useCreateOrderRequest();
  const updateMutation = useUpdateOrderRequest();
  const { order: editOrder, isLoading: isEditLoading } = useOrderRequestDetail(
    editOrderId ?? '',
  );

  // ---------------------------------------------------------------------------
  // Form state
  // ---------------------------------------------------------------------------
  const [orderType, setOrderType] = useState<OrderType | null>(
    routeOrderType ?? 'without_project',
  );

  // Job Info
  const [companyId, setCompanyId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [referencedOrder, setReferencedOrder] = useState('');
  const [referencedOrderLabel, setReferencedOrderLabel] = useState('');
  const [referencedOrderSearch, setReferencedOrderSearch] = useState('');
  const [regionCode, setRegionCode] = useState('');
  const [regionName, setRegionName] = useState('');
  const [customerJobNumber, setCustomerJobNumber] = useState('');
  const [usageCode, setUsageCode] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [orderStatus, setOrderStatus] = useState<number | null>(null);
  const [onJobDate, setOnJobDate] = useState('');
  const [onJobTime, setOnJobTime] = useState('');
  const [jobName, setJobName] = useState('');

  // Keyboard
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Date/Time picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Project
  const [projectCode, setProjectCode] = useState('');
  const [projectName, setProjectName] = useState('');

  // Location
  const [jobAddress, setJobAddress] = useState('');
  const [jobCity, setJobCity] = useState('');
  const [jobState, setJobState] = useState('');
  const [jobZipCode, setJobZipCode] = useState('');

  // Contact
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Driver Instructions
  const [driverInstructions, setDriverInstructions] = useState('');

  // Concrete product
  const [knowMixCode, setKnowMixCode] = useState(false);
  const [concreteProductCode, setConcreteProductCode] = useState('');
  const [concreteProductName, setConcreteProductName] = useState('');
  const [concreteProductText, setConcreteProductText] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [psi, setPsi] = useState('');
  const [rockSize, setRockSize] = useState('');
  const [airNonAir, setAirNonAir] = useState('');
  const [flyAsh, setFlyAsh] = useState('');
  const [quantity, setQuantity] = useState('');
  const [truckSpacing, setTruckSpacing] = useState('');
  const [spacingType, setSpacingType] = useState('yards_per_hour');
  const [slump, setSlump] = useState('');
  const [concreteNotes, setConcreteNotes] = useState('');
  const [callBackLoad, setCallBackLoad] = useState('');

  // Admixture
  const [admixtureProductCode, setAdmixtureProductCode] = useState('');
  const [admixtureProductName, setAdmixtureProductName] = useState('');
  const [admixtureNotes, setAdmixtureNotes] = useState('');

  // Other product
  const [otherProductCode, setOtherProductCode] = useState('');
  const [otherProductName, setOtherProductName] = useState('');
  const [otherNotes, setOtherNotes] = useState('');

  // Modal state
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [themedAlert, setThemedAlert] = useState<ThemedAlertState>(ALERT_INITIAL);

  // Product search
  const { products: searchedProducts } = useSearchProducts(productSearchQuery);

  // Referenced order search + recent entities (matches web's dual-source)
  const { orders: searchedOrders } = useSearchOrders(referencedOrderSearch);
  const { entities: recentEntities } = useRecentOrderEntities();
  // Store full order data in a stable map so handler can always find it after modal closes
  const searchedOrdersMapRef = useRef<Map<string, typeof searchedOrders[0]>>(new Map());
  useEffect(() => {
    searchedOrders.forEach((o) => {
      searchedOrdersMapRef.current.set(o.order_code, o);
    });
  }, [searchedOrders]);

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const isReadOnly = useMemo(() => {
    if (!isEditMode || !editOrder) return false;
    return READONLY_STATUSES.includes(editOrder.status);
  }, [isEditMode, editOrder]);

  const customerOptions: DropdownOption[] = useMemo(() => {
    if (!formData?.customers) return [];
    return formData.customers.map((c) => ({
      value: c.code,
      label: `${c.name} (${c.code})`,
    }));
  }, [formData]);

  const regionOptions: DropdownOption[] = useMemo(() => {
    if (!formData?.regions) return [];
    return formData.regions.map((r) => ({
      value: r.code,
      label: `${r.description} (${r.code})`,
    }));
  }, [formData]);

  const projectOptions: DropdownOption[] = useMemo(() => {
    if (!formData?.projects) return [];
    let projects = formData.projects;
    if (companyId) {
      projects = projects.filter((p) => p.customer_code === companyId);
    }
    return projects.map((p) => ({
      value: p.code,
      label: `${p.name} (${p.code})`,
    }));
  }, [formData, companyId]);

  const productOptions: DropdownOption[] = useMemo(() => {
    const seen = new Set<string>();
    return searchedProducts.filter((p) => {
      if (seen.has(p.value)) return false;
      seen.add(p.value);
      return true;
    }).map((p) => ({
      value: p.value,
      label: p.label,
    }));
  }, [searchedProducts]);

  const referencedOrderOptions: DropdownOption[] = useMemo(() => {
    // Recent order entities first (matching web's combinedReferencedOrders)
    const entityOptions = recentEntities.map((e) => ({
      value: `entity|${e.id}`,
      label: e.display,
    }));
    // Then server-searched orders
    const orderOptions = searchedOrders.map((o) => ({
      value: `order|${o.order_code}`,
      label: `${o.order_code} — ${o.customer_name}${o.project_name ? ` — ${o.project_name}` : ''}`,
    }));
    return [...entityOptions, ...orderOptions];
  }, [recentEntities, searchedOrders]);

  const admixtureOptions: DropdownOption[] = useMemo(() => {
    if (!formData?.admixtureProducts) return [];
    return formData.admixtureProducts.map((p) => ({
      value: p.value,
      label: p.label,
    }));
  }, [formData]);

  const otherOptions: DropdownOption[] = useMemo(() => {
    if (!formData?.otherProducts) return [];
    return formData.otherProducts.map((p) => ({
      value: p.value,
      label: p.label,
    }));
  }, [formData]);

  const orderStatusLabel = useMemo(() => {
    if (orderStatus === null || orderStatus === undefined) return '';
    return ORDER_STATUS_LABELS[orderStatus] ?? '';
  }, [orderStatus]);

  const spacingTypeLabel = useMemo(() => {
    return SPACING_TYPE_OPTIONS.find((o) => o.value === spacingType)?.label ?? '';
  }, [spacingType]);

  // ---------------------------------------------------------------------------
  // Populate form when editing
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (editOrder && isEditMode) {
      setOrderType((editOrder.order_type as OrderType) ?? 'without_project');
      setCompanyId(editOrder.company_id ?? '');
      setCompanyName(editOrder.company_name ?? '');
      setReferencedOrder(editOrder.referenced_order ?? '');
      setRegionCode(editOrder.region_code ?? '');
      setRegionName(editOrder.region_name ?? '');
      setCustomerJobNumber(editOrder.customer_job_number ?? '');
      setUsageCode(editOrder.usage_code ?? '');
      setPoNumber(editOrder.po_number ?? '');
      setOrderStatus(editOrder.order_status ?? 0);
      setOnJobDate(editOrder.on_job_date ?? '');
      setOnJobTime(editOrder.on_job_time ?? '');
      setJobName(editOrder.job_name ?? '');
      setProjectCode(editOrder.project_code ?? '');
      setProjectName(editOrder.project_name ?? '');
      setJobAddress(editOrder.job_address ?? '');
      setJobCity(editOrder.job_city ?? '');
      setJobState(editOrder.job_state ?? '');
      setJobZipCode(editOrder.job_zip_code ?? '');
      setContactName(editOrder.job_contact_name ?? '');
      setContactPhone(editOrder.job_contact_phone ?? '');
      setDriverInstructions(editOrder.driver_instructions ?? '');
      setKnowMixCode(editOrder.know_mix_code ?? false);
      setConcreteProductCode(editOrder.concrete_product_code ?? '');
      setConcreteProductName(editOrder.concrete_product_name ?? '');
      setConcreteProductText(editOrder.concrete_product_text ?? '');
      setPsi(editOrder.psi ?? '');
      setRockSize(editOrder.rock_size ?? '');
      setAirNonAir(editOrder.air_non_air ?? '');
      setFlyAsh(editOrder.fly_ash ?? '');
      setQuantity(editOrder.quantity != null ? String(editOrder.quantity) : '');
      setTruckSpacing(
        editOrder.truck_spacing != null ? String(editOrder.truck_spacing) : '',
      );
      setSpacingType(editOrder.spacing_type ?? 'yards_per_hour');
      setSlump(editOrder.slump ?? '');
      setConcreteNotes(editOrder.concrete_notes ?? '');
      setCallBackLoad(editOrder.call_back_load ?? '');
      setAdmixtureProductCode(editOrder.admixture_product_code ?? '');
      setAdmixtureProductName(editOrder.admixture_product_name ?? '');
      setAdmixtureNotes(editOrder.admixture_notes ?? '');
      setOtherProductCode(editOrder.other_product_code ?? '');
      setOtherProductName(editOrder.other_product_name ?? '');
      setOtherNotes(editOrder.other_notes ?? '');
    }
  }, [editOrder, isEditMode]);

  // Pre-fill form from order (Request button on order card)
  // Matches web: order-request-form.tsx lines 826-906
  useEffect(() => {
    if (prefillOrder && !isEditMode) {
      // Referenced order — web format: "order|{order_id}" or just order_code
      if (prefillOrder.order_id) {
        setReferencedOrder(`order|${prefillOrder.order_id}`);
        setReferencedOrderLabel(prefillOrder.order_code || '');
      } else if (prefillOrder.order_code) {
        setReferencedOrder(prefillOrder.order_code);
        setReferencedOrderLabel(prefillOrder.order_code);
      }
      // Company — match by name from loaded form data (same as web)
      if (prefillOrder.customer_name) {
        setCompanyName(prefillOrder.customer_name);
        if (formData?.customers) {
          const match = formData.customers.find(
            (c) => c.name.toLowerCase() === prefillOrder.customer_name.toLowerCase(),
          );
          if (match) setCompanyId(match.code);
        }
      }
      // On Job Date & Time — web maps order_date → onJobDate, start_time → onJobTime
      if (prefillOrder.order_date) setOnJobDate(prefillOrder.order_date);
      if (prefillOrder.start_time) {
        // Web takes first 5 chars (HH:MM)
        const time = String(prefillOrder.start_time).substring(0, 5);
        if (time.includes(':')) setOnJobTime(time);
      }
      // Job location — web maps delivery_addr1/2/3
      if (prefillOrder.job_address) setJobAddress(prefillOrder.job_address);
      if (prefillOrder.job_city) setJobCity(prefillOrder.job_city);
      if (prefillOrder.job_state) setJobState(prefillOrder.job_state);
      // Contact
      if (prefillOrder.job_contact_name) setContactName(prefillOrder.job_contact_name);
      if (prefillOrder.job_contact_phone) setContactPhone(prefillOrder.job_contact_phone);
      // Product
      if (prefillOrder.item_code) {
        setConcreteProductCode(prefillOrder.item_code);
        setConcreteProductName(prefillOrder.item_code);
      }
      // Quantity
      if (prefillOrder.quantity) setQuantity(String(prefillOrder.quantity));
      // Driver instructions
      if (prefillOrder.special_instructions) setDriverInstructions(prefillOrder.special_instructions);
      // Region — match zone_name from order to regions dropdown (same as web)
      if (prefillOrder.zone_name && formData?.regions) {
        const match = formData.regions.find(
          (r) => r.description.toLowerCase() === prefillOrder.zone_name.toLowerCase(),
        );
        if (match) {
          setRegionCode(match.code);
          setRegionName(match.description);
        }
      }
      // Auto-detect order type — web checks project_code/project_name then item_code
      if (prefillOrder.project_name || prefillOrder.project_code) {
        setOrderType('with_project');
      } else if (prefillOrder.item_code) {
        setOrderType('without_project_with_product');
      }
    }
  }, [prefillOrder, isEditMode, formData]);

  // Auto-fill from project selection
  const handleProjectSelect = useCallback(
    (option: DropdownOption) => {
      setProjectCode(option.value);
      const project = formData?.projects?.find((p) => p.code === option.value);
      if (project) {
        setProjectName(project.name);
        if (project.delivery_addr1) setJobAddress(project.delivery_addr1);
        if (project.delivery_addr2) setJobCity(project.delivery_addr2);
        if (project.delivery_addr3) setJobState(project.delivery_addr3);
        if (project.contact) setContactName(project.contact);
        if (project.phone) setContactPhone(project.phone);
      }
    },
    [formData],
  );

  // Time picker handler
  const handleTimeChange = useCallback(
    (_event: DateTimePickerEvent, selectedDate?: Date) => {
      setShowTimePicker(Platform.OS === 'ios');
      if (selectedDate) {
        const hours = String(selectedDate.getHours()).padStart(2, '0');
        const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
        setOnJobTime(`${hours}:${minutes}`);
      }
    },
    [],
  );

  // Auto-compose Concrete Product text from PSI, Rock Size, Air/Non-air, Fly Ash (matches web)
  React.useEffect(() => {
    if (!knowMixCode && orderType === 'without_project') {
      const parts = [psi, rockSize, airNonAir, flyAsh === 'Yes' ? 'Fly Ash' : ''].filter(Boolean);
      if (parts.length > 0) {
        setConcreteProductText(parts.join(','));
      }
    }
  }, [knowMixCode, orderType, psi, rockSize, airNonAir, flyAsh]);

  // Auto-fill from referenced order selection
  const handleReferencedOrderSelect = useCallback(
    async (option: DropdownOption) => {
      setReferencedOrder(option.value);
      setReferencedOrderLabel(option.label);

      const pipeIdx = option.value.indexOf('|');
      const type = pipeIdx > -1 ? option.value.slice(0, pipeIdx) : 'order';
      const id = pipeIdx > -1 ? option.value.slice(pipeIdx + 1) : option.value;

      if (type === 'order') {
        // Auto-fill from server-searched order (matches web)
        const order = searchedOrdersMapRef.current.get(id);
        if (!order) return;
        if (order.customer_code) {
          setCompanyId(order.customer_code);
          setCompanyName(order.customer_name || '');
        }
        if (order.zone_name && formData?.regions) {
          const regionMatch = formData.regions.find((r) => r.description === order.zone_name);
          if (regionMatch) { setRegionCode(regionMatch.code); setRegionName(regionMatch.description); }
        }
        if (order.order_date) setOnJobDate(order.order_date);
        if (order.project_name) setJobName(order.project_name);
        if (order.delivery_addr1) setJobAddress(order.delivery_addr1);
        if (order.delivery_addr2) setJobCity(order.delivery_addr2);
        if (order.delivery_addr3) setJobState(order.delivery_addr3);
        if (order.ordered_by_name) setContactName(order.ordered_by_name);
        if (order.ordered_by_phone) setContactPhone(order.ordered_by_phone);
      } else {
        // Auto-fill from order entity - fetch full details (matches web)
        try {
          const result = await orderRequestService.getOrderRequestById(id);
          if (!result?.success || !result.data) return;
          const o = result.data;
          if (o.company_id) { setCompanyId(o.company_id); setCompanyName(o.company_name || ''); }
          if (o.region_code) { setRegionCode(o.region_code); setRegionName(o.region_name || ''); }
          if (o.customer_job_number) setCustomerJobNumber(o.customer_job_number);
          if (o.usage_code) setUsageCode(o.usage_code);
          if (o.po_number) setPoNumber(o.po_number);
          if (o.order_status !== null && o.order_status !== undefined) setOrderStatus(o.order_status);
          if (o.on_job_date) setOnJobDate(o.on_job_date);
          if (o.on_job_time) setOnJobTime(o.on_job_time);
          if (o.job_name) setJobName(o.job_name);
          if (o.job_address) setJobAddress(o.job_address);
          if (o.job_city) setJobCity(o.job_city);
          if (o.job_state) setJobState(o.job_state);
          if (o.job_zip_code) setJobZipCode(o.job_zip_code);
          if (o.job_contact_name) setContactName(o.job_contact_name);
          if (o.job_contact_phone) setContactPhone(o.job_contact_phone);
          if (o.driver_instructions) setDriverInstructions(o.driver_instructions);
          setKnowMixCode(o.know_mix_code ?? false);
          if (o.concrete_product_code) { setConcreteProductCode(o.concrete_product_code); setConcreteProductName(o.concrete_product_name || ''); }
          if (o.concrete_product_text) setConcreteProductText(o.concrete_product_text);
          if (o.psi) setPsi(o.psi);
          if (o.rock_size) setRockSize(o.rock_size);
          if (o.air_non_air) setAirNonAir(o.air_non_air);
          if (o.fly_ash) setFlyAsh(o.fly_ash);
          if (o.quantity) setQuantity(String(o.quantity));
          if (o.truck_spacing) setTruckSpacing(String(o.truck_spacing));
          if (o.spacing_type) setSpacingType(o.spacing_type);
          if (o.slump) setSlump(o.slump);
          if (o.concrete_notes) setConcreteNotes(o.concrete_notes);
          if (o.call_back_load) setCallBackLoad(o.call_back_load);
          if (o.admixture_product_code) { setAdmixtureProductCode(o.admixture_product_code); setAdmixtureProductName(o.admixture_product_name || ''); }
          if (o.admixture_notes) setAdmixtureNotes(o.admixture_notes);
          if (o.other_product_code) { setOtherProductCode(o.other_product_code); setOtherProductName(o.other_product_name || ''); }
          if (o.other_notes) setOtherNotes(o.other_notes);
        } catch {
          // Entity fetch failed
        }
      }
    },
    [formData],
  );

  // ---------------------------------------------------------------------------
  // Validation & Submit
  // ---------------------------------------------------------------------------

  const validate = useCallback((): boolean => {
    const missing: string[] = [];
    // Base required
    if (!companyId) missing.push('Company');
    if (showRegion && !regionCode) missing.push('Region');
    if (!usageCode) missing.push('Usage');
    if (orderStatus === null || orderStatus === undefined) missing.push('Order Status');
    if (!onJobDate) missing.push(orderType === 'with_project' ? 'On Job Date' : 'Requested On Job Date');
    if (!onJobTime) missing.push(orderType === 'with_project' ? 'On Job Time' : 'Requested On Job Time');
    if (!jobAddress) missing.push('Job Address');
    if (!jobCity) missing.push('Job City');
    if (!contactName) missing.push('Contact Name');
    if (!contactPhone) missing.push('Contact Phone');
    if (!slump) missing.push('Slump');
    if (!quantity) missing.push('Quantity');

    // Type-specific required
    if (orderType === 'with_project') {
      if (!projectCode) missing.push('Project');
    } else if (orderType === 'without_project_with_product') {
      if (!concreteProductCode) missing.push('Product');
    } else if (orderType === 'without_project') {
      if (!knowMixCode) {
        if (!psi) missing.push('PSI');
        if (!rockSize) missing.push('Rock Size');
        if (!airNonAir) missing.push('Air/Non-air');
        if (!flyAsh) missing.push('Fly Ash');
      }
    }

    if (missing.length > 0) {
      setThemedAlert({
        visible: true,
        type: 'warning',
        title: 'Missing Required Fields',
        message: `Please fill in the following fields:\n\n${missing.join('\n')}`,
      });
      return false;
    }
    return true;
  }, [companyId, regionCode, usageCode, onJobDate, onJobTime, jobAddress, jobCity, contactName, contactPhone,
    slump, quantity, orderType, projectCode, concreteProductCode, knowMixCode, psi, rockSize, airNonAir, flyAsh]);

  const buildInput = useCallback((): OrderEntityCreateInput => {
    const input: OrderEntityCreateInput = {
      order_type: orderType ?? 'without_project',
      company_id: companyId,
      company_name: companyName,
      on_job_date: onJobDate,
      on_job_time: onJobTime,
      job_address: jobAddress,
      job_city: jobCity,
      job_contact_name: contactName,
      job_contact_phone: contactPhone,
    };

    if (referencedOrder) {
      // Strip entity|/order| prefix before sending to API
      const pipeIdx = referencedOrder.indexOf('|');
      input.referenced_order = pipeIdx > -1 ? referencedOrder.slice(pipeIdx + 1) : referencedOrder;
    }
    if (regionCode) input.region_code = regionCode;
    if (regionName) input.region_name = regionName;
    if (customerJobNumber) input.customer_job_number = customerJobNumber;
    if (usageCode) input.usage_code = usageCode;
    if (poNumber) input.po_number = poNumber;
    if (orderStatus !== null) input.order_status = orderStatus;
    if (jobName) input.job_name = jobName;
    if (jobState) input.job_state = jobState;
    if (jobZipCode) input.job_zip_code = jobZipCode;
    if (driverInstructions) input.driver_instructions = driverInstructions;

    if (orderType === 'with_project') {
      if (projectCode) input.project_code = projectCode;
      if (projectName) input.project_name = projectName;
      // Product dropdown + non-project product text
      if (concreteProductCode) input.concrete_product_code = concreteProductCode;
      if (concreteProductName) input.concrete_product_name = concreteProductName;
      if (concreteProductText) input.concrete_product_text = concreteProductText;
    } else if (orderType === 'without_project_with_product') {
      // Product dropdown only
      if (concreteProductCode) input.concrete_product_code = concreteProductCode;
      if (concreteProductName) input.concrete_product_name = concreteProductName;
    } else {
      // without_project: know mix code toggle
      input.know_mix_code = knowMixCode;
      if (concreteProductText) input.concrete_product_text = concreteProductText;
      if (!knowMixCode) {
        if (psi) input.psi = psi;
        if (rockSize) input.rock_size = rockSize;
        if (airNonAir) input.air_non_air = airNonAir;
        if (flyAsh) input.fly_ash = flyAsh;
      }
    }

    if (quantity) input.quantity = parseFloat(quantity);
    if (truckSpacing) input.truck_spacing = parseFloat(truckSpacing);
    if (spacingType) input.spacing_type = spacingType;
    if (slump) input.slump = slump;
    if (concreteNotes) input.concrete_notes = concreteNotes;
    if (callBackLoad) input.call_back_load = callBackLoad;

    if (admixtureProductCode) input.admixture_product_code = admixtureProductCode;
    if (admixtureProductName) input.admixture_product_name = admixtureProductName;
    if (admixtureNotes) input.admixture_notes = admixtureNotes;

    if (otherProductCode) input.other_product_code = otherProductCode;
    if (otherProductName) input.other_product_name = otherProductName;
    if (otherNotes) input.other_notes = otherNotes;

    return input;
  }, [
    orderType, companyId, companyName, referencedOrder, regionCode, regionName,
    customerJobNumber, usageCode, poNumber, orderStatus, onJobDate, onJobTime,
    jobName, projectCode, projectName, jobAddress, jobCity, jobState,
    jobZipCode, contactName, contactPhone, driverInstructions, knowMixCode,
    concreteProductCode, concreteProductName, concreteProductText, psi, rockSize, airNonAir, flyAsh,
    quantity, truckSpacing, spacingType, slump, concreteNotes, callBackLoad,
    admixtureProductCode, admixtureProductName, admixtureNotes,
    otherProductCode, otherProductName, otherNotes,
  ]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    const input = buildInput();

    try {
      if (isEditMode && editOrderId) {
        await updateMutation.mutateAsync({ id: editOrderId, input });
        setThemedAlert({
          visible: true,
          type: 'success',
          title: 'Success',
          message: 'Order request updated successfully.',
          onDismiss: () => {
            // Go back to order request list (skip detail screen)
            if (navigation.canGoBack()) {
              navigation.goBack();
              setTimeout(() => {
                if (navigation.canGoBack()) navigation.goBack();
              }, 100);
            }
          },
        });
      } else {
        await createMutation.mutateAsync(input);
        setThemedAlert({
          visible: true,
          type: 'success',
          title: 'Success',
          message: 'Order request created successfully.',
          onDismiss: () => navigation.goBack(),
        });
      }
    } catch (err: any) {
      setThemedAlert({
        visible: true,
        type: 'error',
        title: 'Error',
        message: err?.message ?? 'Something went wrong. Please try again.',
      });
    }
  }, [validate, buildInput, isEditMode, editOrderId, updateMutation, createMutation, navigation]);

  const isMutating = createMutation.isPending || updateMutation.isPending;

  const handleResetForm = useCallback(() => {
    setOrderType(routeOrderType ?? 'without_project');
    setCompanyId(''); setCompanyName('');
    setReferencedOrder(''); setReferencedOrderLabel('');
    setRegionCode(''); setRegionName('');
    setCustomerJobNumber(''); setUsageCode('');
    setPoNumber(''); setOrderStatus(null);
    setOnJobDate(''); setOnJobTime('');
    setJobName(''); setProjectCode(''); setProjectName('');
    setJobAddress(''); setJobCity(''); setJobState(''); setJobZipCode('');
    setContactName(''); setContactPhone('');
    setDriverInstructions('');
    setKnowMixCode(false);
    setConcreteProductCode(''); setConcreteProductName(''); setConcreteProductText('');
    setPsi(''); setRockSize(''); setAirNonAir(''); setFlyAsh('');
    setQuantity(''); setTruckSpacing(''); setSpacingType('yards_per_hour');
    setSlump(''); setConcreteNotes(''); setCallBackLoad('');
    setAdmixtureProductCode(''); setAdmixtureProductName(''); setAdmixtureNotes('');
    setOtherProductCode(''); setOtherProductName(''); setOtherNotes('');
  }, [routeOrderType]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ---------------------------------------------------------------------------
  // Dropdown helpers
  // ---------------------------------------------------------------------------

  // Check if all required fields are filled (for Send button disabled state)
  const isFormValid = useMemo(() => {
    // Base required
    if (!companyId || (showRegion && !regionCode) || !usageCode || orderStatus === null || orderStatus === undefined) return false;
    if (!onJobDate || !onJobTime) return false;
    if (!jobAddress || !jobCity) return false;
    if (!contactName || !contactPhone) return false;
    if (!slump || !quantity) return false;
    // Type-specific
    if (orderType === 'with_project' && !projectCode) return false;
    if (orderType === 'without_project_with_product' && !concreteProductCode) return false;
    if (orderType === 'without_project' && !knowMixCode) {
      if (!psi || !rockSize || !airNonAir || !flyAsh) return false;
    }
    return true;
  }, [companyId, regionCode, usageCode, orderStatus, onJobDate, onJobTime, jobAddress, jobCity,
    contactName, contactPhone, slump, quantity, orderType, projectCode, concreteProductCode, knowMixCode, psi, rockSize, airNonAir, flyAsh]);

  const getDropdownOptions = useCallback((): DropdownOption[] => {
    switch (activeDropdown) {
      case 'company':
        return customerOptions;
      case 'region':
        return regionOptions;
      case 'project':
        return projectOptions;
      case 'product':
        return productOptions;
      case 'referencedOrder':
        return referencedOrderOptions;
      case 'usage':
        return USAGE_OPTIONS;
      case 'orderStatus':
        return ORDER_STATUS_OPTIONS;
      case 'spacingType':
        return SPACING_TYPE_OPTIONS;
      case 'airNonAir':
        return AIR_OPTIONS;
      case 'psi':
        return PSI_OPTIONS;
      case 'rockSize':
        return ROCK_SIZE_OPTIONS;
      case 'flyAsh':
        return FLY_ASH_OPTIONS;
      case 'slump':
        return SLUMP_OPTIONS;
      case 'callBackLoad':
        return CALLBACK_OPTIONS;
      case 'admixtureProduct':
        return admixtureOptions;
      case 'otherProduct':
        return otherOptions;
      default:
        return [];
    }
  }, [activeDropdown, customerOptions, regionOptions, projectOptions, productOptions, referencedOrderOptions, admixtureOptions, otherOptions]);

  const getDropdownTitle = useCallback((): string => {
    switch (activeDropdown) {
      case 'company': return 'Select Company';
      case 'region': return 'Select Region';
      case 'project': return 'Select Project';
      case 'product': return 'Select Concrete Product';
      case 'referencedOrder': return 'Select Referenced Order';
      case 'usage': return 'Select Usage';
      case 'orderStatus': return 'Select Order Status';
      case 'spacingType': return 'Select Spacing Type';
      case 'airNonAir': return 'Select Air / Non-Air';
      case 'psi': return 'Select PSI';
      case 'rockSize': return 'Select Rock Size';
      case 'flyAsh': return 'Select Fly Ash';
      case 'slump': return 'Select Slump';
      case 'callBackLoad': return 'Select Call Back Load';
      case 'admixtureProduct': return 'Select Admixture Product';
      case 'otherProduct': return 'Select Other Product';
      default: return 'Select';
    }
  }, [activeDropdown]);

  const getDropdownSelectedValue = useCallback((): string => {
    switch (activeDropdown) {
      case 'company': return companyId;
      case 'region': return regionCode;
      case 'project': return projectCode;
      case 'product': return concreteProductCode;
      case 'referencedOrder': return referencedOrder;
      case 'usage': return usageCode;
      case 'orderStatus': return orderStatus !== null ? String(orderStatus) : '';
      case 'spacingType': return spacingType;
      case 'airNonAir': return airNonAir;
      case 'psi': return psi;
      case 'rockSize': return rockSize;
      case 'flyAsh': return flyAsh;
      case 'slump': return slump;
      case 'callBackLoad': return callBackLoad;
      case 'admixtureProduct': return admixtureProductCode;
      case 'otherProduct': return otherProductCode;
      default: return '';
    }
  }, [activeDropdown, companyId, regionCode, projectCode, concreteProductCode, referencedOrder, usageCode, orderStatus, spacingType, airNonAir, psi, rockSize, flyAsh, slump, callBackLoad, admixtureProductCode, otherProductCode]);

  const handleDropdownSelect = useCallback(
    (option: DropdownOption) => {
      switch (activeDropdown) {
        case 'company': {
          setCompanyId(option.value);
          const customer = formData?.customers?.find((c) => c.code === option.value);
          setCompanyName(customer?.name ?? option.label);
          // Reset project when company changes
          setProjectCode('');
          setProjectName('');
          break;
        }
        case 'region': {
          setRegionCode(option.value);
          const region = formData?.regions?.find((r) => r.code === option.value);
          setRegionName(region?.description ?? option.label);
          break;
        }
        case 'project':
          handleProjectSelect(option);
          break;
        case 'referencedOrder':
          handleReferencedOrderSelect(option);
          break;
        case 'usage':
          setUsageCode(option.value);
          break;
        case 'product': {
          setConcreteProductCode(option.value);
          setConcreteProductName(option.label);
          // Auto-fill slump if product has slump info
          const product = searchedProducts.find((p) => p.value === option.value);
          if (product?.slump) setSlump(product.slump);
          break;
        }
        case 'orderStatus':
          setOrderStatus(parseInt(option.value, 10));
          break;
        case 'spacingType':
          setSpacingType(option.value);
          break;
        case 'airNonAir':
          setAirNonAir(option.value);
          break;
        case 'psi':
          setPsi(option.value);
          break;
        case 'rockSize':
          setRockSize(option.value);
          break;
        case 'flyAsh':
          setFlyAsh(option.value);
          break;
        case 'slump':
          setSlump(option.value);
          break;
        case 'callBackLoad':
          setCallBackLoad(option.value);
          break;
        case 'admixtureProduct':
          setAdmixtureProductCode(option.value);
          setAdmixtureProductName(option.label);
          break;
        case 'otherProduct':
          setOtherProductCode(option.value);
          setOtherProductName(option.label);
          break;
      }
    },
    [activeDropdown, formData, handleProjectSelect, handleReferencedOrderSelect, searchedProducts],
  );

  const handleMultiSelect = useCallback(
    (values: string[], labels: string[]) => {
      if (activeDropdown === 'admixtureProduct') {
        setAdmixtureProductCode(values.join(','));
        setAdmixtureProductName(labels.join(', '));
      } else if (activeDropdown === 'otherProduct') {
        setOtherProductCode(values.join(','));
        setOtherProductName(labels.join(', '));
      }
    },
    [activeDropdown],
  );

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderLabel = (label: string, required?: boolean) => (
    <Text variant="caption" color="secondary" style={styles.fieldLabel}>
      {label}
      {required && <Text variant="caption" color="error"> *</Text>}
    </Text>
  );

  const renderTextInput = (
    value: string,
    onChangeText: (v: string) => void,
    placeholder: string,
    options?: {
      multiline?: boolean;
      keyboardType?: TextInput['props']['keyboardType'];
      editable?: boolean;
    },
  ) => (
    <TextInput
      style={[
        options?.multiline ? styles.textAreaInput : styles.textInput,
        {
          backgroundColor: themeColors.surface,
          color: themeColors.text.primary,
          borderColor: themeColors.border,
        },
        (isReadOnly || options?.editable === false) && styles.readOnlyInput,
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={themeColors.text.hint}
      editable={!isReadOnly && options?.editable !== false}
      multiline={options?.multiline}
      numberOfLines={options?.multiline ? 4 : 1}
      textAlignVertical={options?.multiline ? 'top' : 'center'}
      keyboardType={options?.keyboardType}
    />
  );

  const renderDropdownField = (
    label: string,
    displayValue: string,
    dropdownKey: string,
    required?: boolean,
  ) => (
    <View style={styles.fieldContainer}>
      {renderLabel(label, required)}
      <TouchableOpacity
        style={[
          styles.dropdownButton,
          {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          },
          isReadOnly && styles.readOnlyInput,
        ]}
        onPress={() => !isReadOnly && setActiveDropdown(dropdownKey)}
        disabled={isReadOnly}
        activeOpacity={0.7}
      >
        <Text
          variant="body"
          color={displayValue ? 'primary' : 'hint'}
          style={{ flex: 1 }}
          numberOfLines={1}
        >
          {displayValue || `Select ${label}`}
        </Text>
        <Icon
          name="chevron-down"
          size={ms(20)}
          color={themeColors.text.hint}
        />
      </TouchableOpacity>
    </View>
  );

  const renderField = (
    label: string,
    value: string,
    onChangeText: (v: string) => void,
    placeholder: string,
    required?: boolean,
    options?: {
      multiline?: boolean;
      keyboardType?: TextInput['props']['keyboardType'];
    },
  ) => (
    <View style={styles.fieldContainer}>
      {renderLabel(label, required)}
      {renderTextInput(value, onChangeText, placeholder, options)}
    </View>
  );

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (isFormDataLoading || (isEditMode && isEditLoading)) {
    return (
      <ScreenContainer edges={[]}>
        <ScreenHeader
          title={isEditMode ? 'Edit Order Request' : 'Create Order Request'}
        />
        <View style={styles.loadingContainer}>
          <TruckLoader size={120} message="Loading form data..." color="dark" />
        </View>
      </ScreenContainer>
    );
  }

  // ---------------------------------------------------------------------------
  // Main form
  // ---------------------------------------------------------------------------

  return (
    <ScreenContainer edges={[]}>
      <ScreenHeader
        title={isEditMode ? 'Edit Order Request' : 'Create Order Request'}
        rightElement={
          !isReadOnly ? (
            <TouchableOpacity
              style={{ width: ms(32), height: ms(32), borderRadius: ms(16), justifyContent: 'center', alignItems: 'center', backgroundColor: colors.error.main + '15' }}
              onPress={handleResetForm}
              activeOpacity={0.7}
            >
              <Icon name="close" size={ms(16)} color={colors.error.main} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/*
        Using react-native-keyboard-controller's KeyboardAwareScrollView.
        It auto-scrolls the focused TextInput into view above the keyboard
        AND adds the correct bottom padding — native-thread-synced via
        Reanimated so it works reliably on every Android device and iOS.
        bottomOffset = extra space between the focused input and the top
        of the keyboard.
      */}
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: ms(24) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={20}
      >
          {/* Read-only banner */}
          {isReadOnly && (
            <View style={[styles.banner, { backgroundColor: colors.warning.background }]}>
              <Icon name="lock" size={ms(18)} color={colors.warning.dark} />
              <Text variant="bodySmall" style={{ color: colors.warning.dark, marginLeft: spacing.sm, flex: 1 }}>
                This order request is {editOrder?.status}. Fields are read-only.
              </Text>
            </View>
          )}

          {/* ============================================================== */}
          {/* ORDER TYPE TOGGLE */}
          {/* ============================================================== */}
          <View style={[styles.section, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <Text variant="bodyLarge" style={[styles.sectionTitle, { fontWeight: '700' }]}>
              Order Type
            </Text>
            <View style={styles.orderTypeToggleRow}>
              {ORDER_TYPE_OPTIONS.map((opt) => {
                const isActive = orderType === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.orderTypeToggleBtn,
                      {
                        backgroundColor: isActive
                          ? colors.primary.main
                          : isDark
                          ? colors.dark.card
                          : colors.grey[5],
                        borderColor: isActive
                          ? colors.primary.main
                          : themeColors.border,
                      },
                    ]}
                    onPress={() => !isReadOnly && setOrderType(opt.key)}
                    disabled={isReadOnly}
                    activeOpacity={0.7}
                  >
                    <Text
                      variant="caption"
                      align="center"
                      style={{
                        color: isActive ? '#FFFFFF' : themeColors.text.primary,
                        fontWeight: isActive ? '700' : '500',
                      }}
                      numberOfLines={2}
                    >
                      {opt.label.replace('\n', ' ')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ============================================================== */}
          {/* JOB INFORMATION */}
          {/* ============================================================== */}
          <View style={[styles.section, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <Icon name="briefcase-outline" size={ms(20)} color={colors.primary.main} />
              <Text variant="bodyLarge" style={styles.sectionHeaderTitle}>
                Job Information
              </Text>
            </View>

            {renderDropdownField('Company', companyName ? `${companyName} (${companyId})` : '', 'company', true)}
            {orderType === 'with_project' && (
              <>
                {renderDropdownField('Project', projectName ? `${projectName} (${projectCode})` : '', 'project', true)}
              </>
            )}
            {renderDropdownField('Referenced Order', referencedOrderLabel || referencedOrder || '', 'referencedOrder')}
            {showRegion && renderDropdownField('Region', regionName ? `${regionName} (${regionCode})` : '', 'region', true)}
            {renderField('Customer Job Number', customerJobNumber, setCustomerJobNumber, 'e.g., CJ-001')}
            {renderDropdownField('Usage', usageCode || '', 'usage', true)}
            {renderField('P.O. Number', poNumber, setPoNumber, 'e.g., PO-12345')}
            {renderDropdownField('Order Status', orderStatusLabel, 'orderStatus', true)}

            {/* On Job Date - with calendar picker */}
            <View style={styles.fieldContainer}>
              {renderLabel(
                orderType === 'with_project' ? 'On Job Date' : 'Requested On Job Date',
                true,
              )}
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  {
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.border,
                  },
                  isReadOnly && styles.readOnlyInput,
                ]}
                onPress={() => !isReadOnly && setShowDatePicker(true)}
                disabled={isReadOnly}
                activeOpacity={0.7}
              >
                <Text
                  variant="body"
                  color={onJobDate ? 'primary' : 'hint'}
                  style={{ flex: 1 }}
                >
                  {onJobDate || 'Select date'}
                </Text>
                <Icon name="calendar" size={ms(20)} color={themeColors.text.hint} />
              </TouchableOpacity>
              <CalendarPickerModal
                visible={showDatePicker}
                selectedDate={onJobDate}
                onSelect={(date) => setOnJobDate(date)}
                onClose={() => setShowDatePicker(false)}
                isDark={isDark}
                title={orderType === 'with_project' ? 'On Job Date' : 'Requested On Job Date'}
              />
            </View>

            {/* On Job Time - with time picker */}
            <View style={styles.fieldContainer}>
              {renderLabel(
                orderType === 'with_project' ? 'On Job Time' : 'Requested On Job Time',
                true,
              )}
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  {
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.border,
                  },
                  isReadOnly && styles.readOnlyInput,
                ]}
                onPress={() => !isReadOnly && setShowTimePicker(true)}
                disabled={isReadOnly}
                activeOpacity={0.7}
              >
                <Text
                  variant="body"
                  color={onJobTime ? 'primary' : 'hint'}
                  style={{ flex: 1 }}
                >
                  {onJobTime ? (() => { const [h, m] = onJobTime.split(':').map(Number); const period = h >= 12 ? 'PM' : 'AM'; const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h; return `${h12}:${String(m).padStart(2, '0')} ${period}`; })() : 'Select time'}
                </Text>
                <Icon name="clock-outline" size={ms(20)} color={themeColors.text.hint} />
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={
                    onJobTime
                      ? (() => { const [h, m] = onJobTime.split(':'); const d = new Date(); d.setHours(parseInt(h, 10), parseInt(m, 10)); return d; })()
                      : new Date()
                  }
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                />
              )}
            </View>

            {renderField('Job Name', jobName, setJobName, 'e.g., Main Street Project')}
          </View>


          {/* ============================================================== */}
          {/* JOB LOCATION */}
          {/* ============================================================== */}
          <View style={[styles.section, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <Icon name="map-marker-outline" size={ms(20)} color={colors.primary.main} />
              <Text variant="bodyLarge" style={styles.sectionHeaderTitle}>
                Job Location
              </Text>
            </View>
            {renderField('Job Address', jobAddress, setJobAddress, 'Enter job address', true)}
            {renderField('Job City', jobCity, setJobCity, 'Enter job city', true)}
            {renderField('Job State', jobState, setJobState, 'Enter job state')}
            {renderField('Job Zip Code', jobZipCode, setJobZipCode, 'Enter zip code', false, {
              keyboardType: 'number-pad',
            })}
          </View>

          {/* ============================================================== */}
          {/* JOBSITE CONTACT */}
          {/* ============================================================== */}
          <View style={[styles.section, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <Icon name="account-outline" size={ms(20)} color={colors.primary.main} />
              <Text variant="bodyLarge" style={styles.sectionHeaderTitle}>
                Jobsite Contact
              </Text>
            </View>
            {renderField('Contact Name', contactName, setContactName, 'Enter contact name', true)}
            {renderField('Contact Phone', contactPhone, setContactPhone, 'Enter contact phone', true, {
              keyboardType: 'phone-pad',
            })}
          </View>

          {/* ============================================================== */}
          {/* DRIVER INSTRUCTIONS */}
          {/* ============================================================== */}
          <View style={[styles.section, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <Icon name="truck-outline" size={ms(20)} color={colors.primary.main} />
              <Text variant="bodyLarge" style={styles.sectionHeaderTitle}>
                Driver Instructions
              </Text>
            </View>
            <View style={styles.fieldContainer}>
              {renderTextInput(
                driverInstructions,
                setDriverInstructions,
                'Add driver instructions...',
                { multiline: true },
              )}
            </View>
          </View>

          {/* ============================================================== */}
          {/* CONCRETE PRODUCT */}
          {/* ============================================================== */}
          <View style={[styles.section, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <Icon name="flask-outline" size={ms(20)} color={colors.primary.main} />
              <Text variant="bodyLarge" style={styles.sectionHeaderTitle}>
                Concrete Product
              </Text>
            </View>

            {/* ---- WITH PROJECT ---- */}
            {orderType === 'with_project' && (
              <>
                {renderDropdownField('Product', concreteProductName || '', 'product', true)}
                {renderField(
                  'Non Project Product',
                  concreteProductText,
                  setConcreteProductText,
                  'Specific mix code if requested...',
                )}
              </>
            )}

            {/* ---- WITHOUT PROJECT WITH PRODUCT ---- */}
            {orderType === 'without_project_with_product' && (
              <>
                {renderDropdownField('Product', concreteProductName || '', 'product', true)}
              </>
            )}

            {/* ---- WITHOUT PROJECT ---- */}
            {orderType === 'without_project' && (
              <>
                {/* Know Mix Code toggle */}
                <View style={styles.fieldContainer}>
                  {renderLabel('Do you know the mix code?')}
                  <View style={styles.toggleRow}>
                    <TouchableOpacity
                      style={[
                        styles.toggleBtn,
                        {
                          backgroundColor: knowMixCode
                            ? colors.primary.main
                            : isDark
                            ? colors.dark.card
                            : colors.grey[5],
                          borderColor: knowMixCode ? colors.primary.main : themeColors.border,
                        },
                      ]}
                      onPress={() => !isReadOnly && setKnowMixCode(true)}
                      disabled={isReadOnly}
                      activeOpacity={0.7}
                    >
                      <Text
                        variant="bodySmall"
                        style={{
                          color: knowMixCode ? colors.common.white : themeColors.text.primary,
                          fontWeight: knowMixCode ? '700' : '500',
                        }}
                      >
                        Yes
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.toggleBtn,
                        {
                          backgroundColor: !knowMixCode
                            ? colors.primary.main
                            : isDark
                            ? colors.dark.card
                            : colors.grey[5],
                          borderColor: !knowMixCode ? colors.primary.main : themeColors.border,
                        },
                      ]}
                      onPress={() => !isReadOnly && setKnowMixCode(false)}
                      disabled={isReadOnly}
                      activeOpacity={0.7}
                    >
                      <Text
                        variant="bodySmall"
                        style={{
                          color: !knowMixCode ? colors.common.white : themeColors.text.primary,
                          fontWeight: !knowMixCode ? '700' : '500',
                        }}
                      >
                        No
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {renderField(
                  'Concrete Product',
                  concreteProductText,
                  setConcreteProductText,
                  'Specific mix code if requested...',
                )}

                {/* Show PSI, Rock Size, Air/Non-air, Fly Ash when mix code is NOT known */}
                {!knowMixCode && (
                  <>
                    {renderDropdownField('PSI', psi, 'psi', true)}
                    {renderDropdownField('Rock Size', rockSize, 'rockSize', true)}
                    {renderDropdownField('Air / Non-Air', airNonAir, 'airNonAir', true)}
                    {renderDropdownField('Fly Ash', flyAsh, 'flyAsh', true)}
                  </>
                )}
              </>
            )}

            {/* ---- Common fields (all types) ---- */}
            {renderDropdownField('Slump', slump, 'slump', true)}

            {renderField('Quantity', quantity, setQuantity, 'Enter quantity', true, {
              keyboardType: 'decimal-pad',
            })}

            <View style={styles.rowFields}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                {renderDropdownField('Spacing Type', spacingTypeLabel, 'spacingType', true)}
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                {renderField(
                  spacingType === 'yards_per_hour' ? 'Spacing (Yards/Hour)' : 'Spacing Minutes',
                  truckSpacing,
                  setTruckSpacing,
                  spacingType === 'yards_per_hour' ? 'Specify yards per hour' : 'Specify Minutes',
                  true,
                  { keyboardType: 'decimal-pad' },
                )}
              </View>
            </View>

            {renderField('Concrete Notes', concreteNotes, setConcreteNotes, 'Add concrete notes...', false, {
              multiline: true,
            })}
            {renderDropdownField('Call Back Load', callBackLoad || '', 'callBackLoad')}
          </View>

          {/* ============================================================== */}
          {/* ADMIXTURE PRODUCT */}
          {/* ============================================================== */}
          <View style={[styles.section, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <Icon name="beaker-outline" size={ms(20)} color={colors.primary.main} />
              <Text variant="bodyLarge" style={styles.sectionHeaderTitle}>
                Admixture Product
              </Text>
            </View>
            {renderDropdownField('Product', admixtureProductName || '', 'admixtureProduct')}
            {renderField('Admixture Notes', admixtureNotes, setAdmixtureNotes, 'Add admixture notes...', false, {
              multiline: true,
            })}
          </View>

          {/* ============================================================== */}
          {/* OTHER PRODUCT */}
          {/* ============================================================== */}
          <View style={[styles.section, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <Icon name="package-variant-closed" size={ms(20)} color={colors.primary.main} />
              <Text variant="bodyLarge" style={styles.sectionHeaderTitle}>
                Other Product
              </Text>
            </View>
            {renderDropdownField('Product', otherProductName || '', 'otherProduct')}
            {renderField('Other Notes', otherNotes, setOtherNotes, 'Add notes...', false, {
              multiline: true,
            })}
          </View>

          {/* ============================================================== */}
          {/* CANCEL + SEND BUTTONS */}
          {/* ============================================================== */}
          {!isReadOnly && (
            <View
              style={[
                styles.submitContainer,
                {
                  paddingBottom: TAB_BAR_HEIGHT + spacing.md,
                },
              ]}
            >
              <View style={styles.submitButtonRow}>
                <TouchableOpacity
                  style={[styles.submitBtn, { borderColor: themeColors.border, borderWidth: 1, backgroundColor: colors.common.transparent }]}
                  onPress={handleCancel}
                  activeOpacity={0.7}
                >
                  <Text variant="body" style={{ color: themeColors.text.secondary, fontWeight: '600', fontSize: ms(16) }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: isFormValid && !isMutating ? colors.primary.main : isDark ? colors.dark.border : colors.grey[15] }]}
                  onPress={handleSubmit}
                  activeOpacity={0.7}
                  disabled={!isFormValid || isMutating}
                >
                  {isMutating ? (
                    <ActivityIndicator size="small" color={colors.common.white} />
                  ) : (
                    <Text variant="body" style={{ color: isFormValid ? colors.common.white : (isDark ? colors.dark.text.hint : colors.grey[50]), fontWeight: '700', fontSize: ms(16) }}>
                      {isEditMode ? 'Update' : 'Send'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
      </KeyboardAwareScrollView>

      {/* ============================================================== */}
      {/* SEARCHABLE DROPDOWN MODAL */}
      {/* ============================================================== */}
      <SearchableDropdownModal
        visible={!!activeDropdown}
        title={getDropdownTitle()}
        options={getDropdownOptions()}
        selectedValue={getDropdownSelectedValue()}
        onSelect={handleDropdownSelect}
        onClose={() => setActiveDropdown(null)}
        isDark={isDark}
        onSearchChange={
          activeDropdown === 'referencedOrder'
            ? setReferencedOrderSearch
            : activeDropdown === 'product'
            ? setProductSearchQuery
            : undefined
        }
        searchPlaceholder={
          activeDropdown === 'referencedOrder'
            ? 'Search by order code or customer name...'
            : activeDropdown === 'product'
            ? 'Search by product code...'
            : activeDropdown === 'admixtureProduct'
            ? 'Search admixture...'
            : activeDropdown === 'otherProduct'
            ? 'Search products...'
            : undefined
        }
        multiSelect={activeDropdown === 'admixtureProduct' || activeDropdown === 'otherProduct'}
        selectedValues={
          activeDropdown === 'admixtureProduct'
            ? admixtureProductCode.split(',').filter(Boolean)
            : activeDropdown === 'otherProduct'
            ? otherProductCode.split(',').filter(Boolean)
            : []
        }
        onMultiSelect={handleMultiSelect}
      />

      <ThemedAlertModal
        state={themedAlert}
        onClose={() => setThemedAlert(ALERT_INITIAL)}
        isDark={isDark}
      />
    </ScreenContainer>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Loading / type selector
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },

  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: ms(8),
    marginBottom: spacing.md,
  },

  // Sections
  section: {
    borderRadius: ms(12),
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  sectionHeaderTitle: {
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  // Order type toggle
  orderTypeToggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  orderTypeToggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: ms(8),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: ms(40),
  },

  // Fields
  fieldContainer: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  textInput: {
    height: ms(44),
    borderWidth: 1,
    borderRadius: ms(8),
    paddingHorizontal: spacing.md,
    fontSize: ms(14),
  },
  textAreaInput: {
    minHeight: ms(100),
    borderWidth: 1,
    borderRadius: ms(8),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: ms(14),
  },
  readOnlyInput: {
    opacity: 0.6,
  },

  // Dropdown
  dropdownButton: {
    height: ms(44),
    borderWidth: 1,
    borderRadius: ms(8),
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: ms(8),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Row fields
  rowFields: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  // Submit
  submitContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  submitButtonRow: {
    flexDirection: 'row',
    gap: ms(10),
  },
  submitBtn: {
    flex: 1,
    height: ms(48),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.modal,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: ms(20),
    borderTopRightRadius: ms(20),
    maxHeight: '85%',
    paddingBottom: TAB_BAR_HEIGHT,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  modalSearchInput: {
    flex: 1,
    height: ms(40),
    fontSize: ms(14),
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  emptyList: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
});

export default CreateOrderRequestScreen;
