import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';

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
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: workspace.accent,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: workspace.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 4,
      }}
    >
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
  const themeColors = isDark ? colors.dark : colors.light;

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const setCurrentWorkspace = useWorkspaceStore((s) => s.setCurrentWorkspace);
  const hydrate = useWorkspaceStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const current = useMemo(
    () => workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0],
    [workspaces, currentWorkspaceId],
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingWorkspace, setPendingWorkspace] = useState<Workspace | null>(
    null,
  );

  const openSheet = () => setSheetOpen(true);
  const closeSheet = () => setSheetOpen(false);

  const onSelectWorkspace = (ws: Workspace) => {
    if (ws.id === current.id) {
      closeSheet();
      return;
    }
    closeSheet();
    setTimeout(() => setPendingWorkspace(ws), 260);
  };

  const confirmSwitch = async () => {
    if (!pendingWorkspace) return;
    await setCurrentWorkspace(pendingWorkspace.id);
    setPendingWorkspace(null);
  };

  return (
    <>
      <TouchableOpacity
        onPress={openSheet}
        activeOpacity={0.8}
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
        <WorkspaceAvatar workspace={current} size={ms(28)} />
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
            {current.name}
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
          <Icon
            name="chevron-down"
            size={ms(12)}
            color={themeColors.text.secondary}
          />
        </View>
      </TouchableOpacity>

      <WorkspaceListSheet
        visible={sheetOpen}
        onClose={closeSheet}
        workspaces={workspaces}
        currentId={current.id}
        onSelect={onSelectWorkspace}
      />

      <SwitchWorkspaceConfirmModal
        visible={!!pendingWorkspace}
        workspace={pendingWorkspace}
        onCancel={() => setPendingWorkspace(null)}
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
}

const WorkspaceListSheet: React.FC<WorkspaceListSheetProps> = ({
  visible,
  onClose,
  workspaces,
  currentId,
  onSelect,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Switch Workspace"
      subtitle="Choose the environment you want to work in"
      headerIcon="office-building-outline"
      headerIconColor={colors.primary.main}
      height={Math.min(SCREEN_HEIGHT * 0.75, ms(70) * workspaces.length + ms(220))}
    >
      <View style={{ gap: ms(10) }}>
        {workspaces.map((ws) => {
          const isSelected = ws.id === currentId;
          return (
            <TouchableOpacity
              key={ws.id}
              activeOpacity={0.85}
              onPress={() => onSelect(ws)}
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
        })}
      </View>
    </BottomSheet>
  );
};

interface SwitchWorkspaceConfirmModalProps {
  visible: boolean;
  workspace: Workspace | null;
  onCancel: () => void;
  onConfirm: () => void;
}

const SwitchWorkspaceConfirmModal: React.FC<
  SwitchWorkspaceConfirmModalProps
> = ({ visible, workspace, onCancel, onConfirm }) => {
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
      onRequestClose={onCancel}
    >
      <Animated.View
        style={[styles.confirmOverlay, { opacity }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <Animated.View
          style={[
            styles.confirmCard,
            {
              backgroundColor: themeColors.card,
              transform: [{ scale }],
            },
          ]}
        >
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
                {workspace.subdomain}
              </Text>
            </View>
            <Icon
              name="check-circle"
              size={ms(22)}
              color={colors.success.main}
            />
          </View>

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
            >
              <Text
                style={{
                  color: themeColors.text.primary,
                  fontWeight: '600',
                  fontSize: fontSizes.md,
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                styles.confirmPrimary,
                { backgroundColor: colors.common.black },
              ]}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <Text
                style={{
                  color: colors.common.white,
                  fontWeight: '700',
                  fontSize: fontSizes.md,
                }}
              >
                Switch Workspace
              </Text>
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
  confirmButtons: {
    flexDirection: 'row',
    gap: ms(10),
    width: '100%',
  },
  confirmBtn: {
    flex: 1,
    height: ms(48),
    borderRadius: ms(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancel: {
    borderWidth: 1,
  },
  confirmPrimary: {},
});

export default WorkspaceSwitcher;
