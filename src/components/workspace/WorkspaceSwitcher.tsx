import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

const SCREEN_HEIGHT = Dimensions.get('window').height;
import { Icon, Text } from '../common';
import { BottomSheet } from '../common/BottomSheet';
import { colors } from '../../theme/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { ms, spacing, vs, fontSizes } from '../../utils/responsive';
import {
  Workspace,
  useWorkspaceStore,
  getWorkspaceInitial,
} from '../../store/workspaceStore';
import { useAuthStore } from '../../store/authStore';

interface WorkspaceAvatarProps {
  workspace: Workspace;
  size?: number;
  showStatusDot?: boolean;
}

const WorkspaceAvatar: React.FC<WorkspaceAvatarProps> = ({
  workspace,
  size = ms(40),
  showStatusDot = false,
}) => {
  const initial = getWorkspaceInitial(workspace.name);
  const dotSize = Math.max(ms(10), size * 0.28);
  const borderRadius = size * 0.28;
  const hasImage = !!workspace.imageUrl;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor: hasImage ? colors.common.white : workspace.accent,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: workspace.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 4,
        overflow: 'hidden',
      }}
    >
      {hasImage ? (
        <Image
          source={{ uri: workspace.imageUrl }}
          style={{ width: size, height: size, borderRadius }}
          resizeMode="cover"
        />
      ) : (
        <Text
          style={{
            color: colors.common.white,
            fontSize: size * 0.42,
            fontWeight: '700',
            includeFontPadding: false,
          }}
        >
          {initial}
        </Text>
      )}
      {showStatusDot && (
        <View
          style={{
            position: 'absolute',
            bottom: -dotSize * 0.18,
            right: -dotSize * 0.18,
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor:
              workspace.status === 'active'
                ? colors.success.main
                : colors.grey[40],
            borderWidth: 2,
            borderColor: colors.common.white,
          }}
        />
      )}
    </View>
  );
};

interface WorkspaceSwitcherProps {
  compact?: boolean;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  compact = true,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const themeColors = isDark ? colors.dark : colors.light;
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const isLoadingTenants = useWorkspaceStore((s) => s.isLoadingTenants);
  const isSwitching = useWorkspaceStore((s) => s.isSwitching);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const fetchTenants = useWorkspaceStore((s) => s.fetchTenants);
  const switchTenant = useWorkspaceStore((s) => s.switchTenant);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingWorkspace, setPendingWorkspace] = useState<Workspace | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);

  // Check if user is admin
  const isAdmin = useMemo(() => {
    if (!user) return false;
    const raw = user as any;
    const userType = (raw.userType ?? raw.user_type ?? '').toString();
    const userRole = (raw.userRole ?? raw.user_role ?? '').toString().toLowerCase();
    return userType === 'admin' || userRole.includes('tk-admin') || userRole.includes('tk admin');
  }, [user]);

  // Hydrate + fetch tenants on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Set current workspace from user's tenant metadata if not already set
  useEffect(() => {
    if (!currentWorkspaceId && user?.metadata?.tenant?.tenant_subdomain) {
      const subdomain = user.metadata.tenant.tenant_subdomain;
      useWorkspaceStore.getState().setCurrentWorkspace(subdomain);
    }
  }, [currentWorkspaceId, user]);

  const current = useMemo(
    () => workspaces.find((w) => w.id === currentWorkspaceId) ?? null,
    [workspaces, currentWorkspaceId],
  );

  const currentDisplay = useMemo(() => {
    if (current) {
      return { initial: getWorkspaceInitial(current.name), name: current.name };
    }
    // Fallback: use tenant info from user metadata
    const tenantName = user?.metadata?.tenant?.tenant_name;
    if (tenantName) {
      return { initial: getWorkspaceInitial(tenantName), name: tenantName };
    }
    return { initial: 'W', name: 'Workspace' };
  }, [current, user]);

  const openSheet = () => setSheetOpen(true);
  const closeSheet = () => setSheetOpen(false);

  const onSelectWorkspace = (ws: Workspace) => {
    if (ws.id === currentWorkspaceId) {
      closeSheet();
      return;
    }
    closeSheet();
    setSwitchError(null);
    setTimeout(() => setPendingWorkspace(ws), 260);
  };

  const confirmSwitch = useCallback(async () => {
    if (!pendingWorkspace) return;
    setSwitchError(null);
    try {
      await switchTenant(pendingWorkspace);
      setPendingWorkspace(null);
      // Remove stale cache from all screens so old tenant data isn't shown
      queryClient.removeQueries();
      // Only refetch dashboard queries (other screens refetch when navigated to)
      queryClient.refetchQueries({ queryKey: ['dashboard'] });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Switch failed';
      setSwitchError(msg);
    }
  }, [pendingWorkspace, switchTenant, queryClient]);

  // Non-admin: show static workspace name, no dropdown
  if (!isAdmin) {
    return (
      <View
        style={[
          compact ? styles.triggerCompact : styles.triggerExpanded,
          {
            backgroundColor: isDark
              ? colors.semiTransparent.white08
              : colors.common.white,
            borderColor: isDark
              ? colors.semiTransparent.white10
              : colors.semiTransparent.black06,
          },
        ]}
      >
        {current ? (
          <WorkspaceAvatar workspace={current} size={ms(28)} />
        ) : (
          <View
            style={{
              width: ms(28),
              height: ms(28),
              borderRadius: ms(8),
              backgroundColor: colors.primary.main,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: colors.common.white,
                fontSize: ms(12),
                fontWeight: '700',
              }}
            >
              {currentDisplay.initial}
            </Text>
          </View>
        )}
        {!compact && (
          <Text
            numberOfLines={1}
            style={{
              marginLeft: ms(8),
              color: themeColors.text.primary,
              fontWeight: '600',
              fontSize: fontSizes.sm,
              maxWidth: ms(110),
            }}
          >
            {currentDisplay.name}
          </Text>
        )}
      </View>
    );
  }

  // Admin: full dropdown
  return (
    <>
      <TouchableOpacity
        onPress={openSheet}
        activeOpacity={0.8}
        disabled={isSwitching}
        style={[
          compact ? styles.triggerCompact : styles.triggerExpanded,
          {
            backgroundColor: isDark
              ? colors.semiTransparent.white08
              : colors.common.white,
            borderColor: isDark
              ? colors.semiTransparent.white10
              : colors.semiTransparent.black06,
          },
        ]}
      >
        {current ? (
          <WorkspaceAvatar workspace={current} size={ms(28)} />
        ) : (
          <View
            style={{
              width: ms(28),
              height: ms(28),
              borderRadius: ms(8),
              backgroundColor: colors.primary.main,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: colors.common.white,
                fontSize: ms(12),
                fontWeight: '700',
              }}
            >
              {currentDisplay.initial}
            </Text>
          </View>
        )}
        {!compact && (
          <Text
            numberOfLines={1}
            style={{
              marginLeft: ms(8),
              color: themeColors.text.primary,
              fontWeight: '600',
              fontSize: fontSizes.sm,
              maxWidth: ms(110),
            }}
          >
            {currentDisplay.name}
          </Text>
        )}
        <View
          style={[
            styles.chevronWrap,
            {
              backgroundColor: isDark
                ? colors.semiTransparent.white10
                : colors.semiTransparent.black04,
            },
          ]}
        >
          {isSwitching ? (
            <ActivityIndicator size="small" color={themeColors.text.secondary} />
          ) : (
            <Icon
              name="chevron-down"
              size={ms(12)}
              color={themeColors.text.secondary}
            />
          )}
        </View>
      </TouchableOpacity>

      <WorkspaceListSheet
        visible={sheetOpen}
        onClose={closeSheet}
        workspaces={workspaces}
        currentId={currentWorkspaceId}
        onSelect={onSelectWorkspace}
        isLoading={isLoadingTenants}
        isSwitching={isSwitching}
      />

      <SwitchWorkspaceConfirmModal
        visible={!!pendingWorkspace}
        workspace={pendingWorkspace}
        isSwitching={isSwitching}
        error={switchError}
        onCancel={() => {
          if (!isSwitching) {
            setPendingWorkspace(null);
            setSwitchError(null);
          }
        }}
        onConfirm={confirmSwitch}
      />
    </>
  );
};

interface WorkspaceListSheetProps {
  visible: boolean;
  onClose: () => void;
  workspaces: Workspace[];
  currentId: string;
  onSelect: (ws: Workspace) => void;
  isLoading: boolean;
  isSwitching: boolean;
}

const WorkspaceListSheet: React.FC<WorkspaceListSheetProps> = ({
  visible,
  onClose,
  workspaces,
  currentId,
  onSelect,
  isLoading,
  isSwitching,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const themeColors = isDark ? colors.dark : colors.light;
  const insets = useSafeAreaInsets();

  // Calculate tight height: handle(28) + header(~90) + content padding(16) + items + bottom safe area
  const itemCount = Math.max(workspaces.length, 1);
  const ROW_HEIGHT = ms(70);   // avatar(44) + padding(12*2) + border(2)
  const GAP = ms(10);
  const HEADER = ms(130);      // handle + title + subtitle + border + top content padding
  const contentHeight = HEADER + (ROW_HEIGHT * itemCount) + (GAP * (itemCount - 1)) + insets.bottom + ms(16);
  const sheetHeight = Math.min(contentHeight, SCREEN_HEIGHT * 0.85);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('workspace.switchWorkspace')}
      subtitle={t('workspace.chooseEnv')}
      headerIcon="office-building-outline"
      headerIconColor={colors.primary.main}
      height={sheetHeight}
    >
      <View style={{ gap: ms(10) }}>
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: ms(30) }}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text
              style={{
                color: themeColors.text.secondary,
                fontSize: fontSizes.sm,
                marginTop: ms(12),
              }}
            >
              Loading workspaces...
            </Text>
          </View>
        ) : workspaces.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: ms(30) }}>
            <Icon name="office-building-outline" size={ms(36)} color={themeColors.text.secondary} />
            <Text
              style={{
                color: themeColors.text.secondary,
                fontSize: fontSizes.sm,
                marginTop: ms(12),
              }}
            >
              No workspaces available
            </Text>
          </View>
        ) : (
          workspaces.map((ws) => {
            const isSelected = ws.id === currentId;
            return (
              <TouchableOpacity
                key={ws.id}
                activeOpacity={0.85}
                onPress={() => onSelect(ws)}
                disabled={isSwitching}
                style={[
                  styles.workspaceRow,
                  {
                    backgroundColor: isSelected
                      ? colors.semiTransparent.green08
                      : isDark
                      ? colors.semiTransparent.white05
                      : colors.grey[3],
                    borderColor: isSelected
                      ? colors.primary.main
                      : isDark
                      ? colors.semiTransparent.white08
                      : colors.semiTransparent.black06,
                    opacity: isSwitching && !isSelected ? 0.5 : 1,
                  },
                ]}
              >
                <WorkspaceAvatar
                  workspace={ws}
                  size={ms(44)}
                  showStatusDot
                />

                <View style={{ flex: 1, marginLeft: ms(14) }}>
                  <Text
                    style={{
                      color: themeColors.text.primary,
                      fontWeight: '700',
                      fontSize: fontSizes.md,
                    }}
                    numberOfLines={1}
                  >
                    {ws.name}
                  </Text>
                  <Text
                    style={{
                      color: themeColors.text.secondary,
                      fontSize: fontSizes.xs,
                      marginTop: ms(2),
                    }}
                    numberOfLines={1}
                  >
                    {ws.subdomain}.truckast.ai
                  </Text>
                </View>

                {isSelected ? (
                  <View style={styles.selectedBadge}>
                    <Icon
                      name="check"
                      size={ms(14)}
                      color={colors.common.white}
                    />
                  </View>
                ) : (
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: isDark
                          ? colors.semiTransparent.white20
                          : colors.grey[15],
                      },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </BottomSheet>
  );
};

interface SwitchWorkspaceConfirmModalProps {
  visible: boolean;
  workspace: Workspace | null;
  isSwitching: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

const SwitchWorkspaceConfirmModal: React.FC<SwitchWorkspaceConfirmModalProps> = ({
  visible,
  workspace,
  isSwitching,
  error,
  onCancel,
  onConfirm,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const scale = React.useRef(new Animated.Value(0.9)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      opacity.setValue(0);
      scale.setValue(0.9);
    }
  }, [visible, opacity, scale]);

  if (!workspace) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={isSwitching ? undefined : onCancel}
    >
      <Animated.View
        style={[styles.confirmOverlay, { opacity }]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={isSwitching ? undefined : onCancel}
        />
        <Animated.View
          style={[
            styles.confirmCard,
            {
              backgroundColor: themeColors.card,
              transform: [{ scale }],
            },
          ]}
        >
          {!isSwitching && (
            <TouchableOpacity
              style={styles.confirmClose}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Icon
                name="close"
                size={ms(18)}
                color={themeColors.text.secondary}
              />
            </TouchableOpacity>
          )}

          <View
            style={[
              styles.confirmIconWrap,
              { backgroundColor: colors.common.black },
            ]}
          >
            <Icon
              name="office-building"
              size={ms(28)}
              color={colors.common.white}
            />
          </View>

          <Text
            style={[
              styles.confirmTitle,
              { color: themeColors.text.primary },
            ]}
          >
            Switch Workspace
          </Text>
          <Text
            style={[
              styles.confirmSubtitle,
              { color: themeColors.text.secondary },
            ]}
          >
            You are about to switch to a different workspace environment
          </Text>

          <View
            style={[
              styles.previewCard,
              {
                backgroundColor: isDark
                  ? colors.semiTransparent.white05
                  : colors.grey[3],
                borderColor: isDark
                  ? colors.semiTransparent.white10
                  : colors.grey[10],
              },
            ]}
          >
            <WorkspaceAvatar
              workspace={workspace}
              size={ms(44)}
              showStatusDot
            />
            <View style={{ flex: 1, marginLeft: ms(12) }}>
              <Text
                style={{
                  color: themeColors.text.primary,
                  fontSize: fontSizes.md,
                  fontWeight: '700',
                }}
                numberOfLines={1}
              >
                {workspace.name}
              </Text>
              <Text
                style={{
                  color: themeColors.text.secondary,
                  fontSize: fontSizes.xs,
                  marginTop: ms(2),
                }}
                numberOfLines={1}
              >
                {workspace.subdomain}.truckast.ai
              </Text>
            </View>
            <Icon
              name="check-circle"
              size={ms(22)}
              color={colors.success.main}
            />
          </View>

          {error && (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: isDark
                    ? colors.semiTransparent.white05
                    : colors.workspaceSwitcher.errorBg,
                },
              ]}
            >
              <Icon name="alert-circle" size={ms(16)} color={colors.error.main} />
              <Text
                style={{
                  color: colors.error.main,
                  fontSize: fontSizes.xs,
                  marginLeft: ms(8),
                  flex: 1,
                }}
                numberOfLines={2}
              >
                {error}
              </Text>
            </View>
          )}

          <View style={styles.confirmButtons}>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                styles.confirmCancel,
                {
                  backgroundColor: isDark
                    ? colors.semiTransparent.white08
                    : colors.common.white,
                  borderColor: isDark
                    ? colors.semiTransparent.white15
                    : colors.grey[15],
                },
              ]}
              onPress={onCancel}
              activeOpacity={0.8}
              disabled={isSwitching}
            >
              <Text
                style={{
                  color: themeColors.text.primary,
                  fontWeight: '600',
                  fontSize: fontSizes.sm,
                  opacity: isSwitching ? 0.5 : 1,
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                styles.confirmPrimary,
                {
                  backgroundColor: isSwitching
                    ? colors.grey[40]
                    : colors.common.black,
                },
              ]}
              onPress={onConfirm}
              activeOpacity={0.85}
              disabled={isSwitching}
            >
              {isSwitching ? (
                <ActivityIndicator size="small" color={colors.common.white} />
              ) : (
                <Text
                  style={{
                    color: colors.common.white,
                    fontWeight: '700',
                    fontSize: fontSizes.sm,
                  }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  Switch Workspace
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  triggerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(6),
    paddingVertical: ms(4),
    borderRadius: ms(14),
    borderWidth: 1,
    gap: ms(6),
  },
  triggerExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(8),
    paddingVertical: ms(6),
    borderRadius: ms(16),
    borderWidth: 1,
  },
  chevronWrap: {
    width: ms(18),
    height: ms(18),
    borderRadius: ms(9),
    alignItems: 'center',
    justifyContent: 'center',
  },
  workspaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(12),
    borderRadius: ms(16),
    borderWidth: 1,
  },
  selectedBadge: {
    width: ms(26),
    height: ms(26),
    borderRadius: ms(13),
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radio: {
    width: ms(22),
    height: ms(22),
    borderRadius: ms(11),
    borderWidth: 2,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.modal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  confirmCard: {
    width: '100%',
    maxWidth: ms(380),
    borderRadius: ms(20),
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 18,
  },
  confirmClose: {
    position: 'absolute',
    top: ms(12),
    right: ms(12),
    padding: ms(6),
    zIndex: 2,
  },
  confirmIconWrap: {
    width: ms(56),
    height: ms(56),
    borderRadius: ms(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: ms(4),
    marginBottom: vs(12),
  },
  confirmTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  confirmSubtitle: {
    fontSize: fontSizes.sm,
    textAlign: 'center',
    marginTop: ms(6),
    paddingHorizontal: spacing.md,
    lineHeight: ms(20),
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(12),
    borderRadius: ms(14),
    borderWidth: 1,
    marginTop: vs(18),
    marginBottom: vs(18),
    width: '100%',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(10),
    borderRadius: ms(10),
    marginBottom: vs(12),
    width: '100%',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: ms(10),
    width: '100%',
  },
  confirmBtn: {
    height: ms(48),
    borderRadius: ms(12),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(16),
  },
  confirmCancel: {
    flex: 1,
    borderWidth: 1,
  },
  confirmPrimary: {
    flex: 1,
  },
});

export default WorkspaceSwitcher;
