import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImageCropPicker from 'react-native-image-crop-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon, AlertModal } from '../../components/common';
import { Input } from '../../components/common/Input';
import { colors } from '../../theme/colors';
import { ms, vs, spacing } from '../../utils/responsive';
import { useProfile } from '../../hooks/useProfile';
import { useUpdateProfile } from '../../hooks/useUpdateProfile';
import { useAlert } from '../../hooks';

interface EditProfileScreenProps {
  navigation?: any;
}

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({
  navigation,
}) => {
  const { theme, isDark } = useTheme();
  const { profile, isLoading: isProfileLoading, refetch, isRefetching } = useProfile();
  const { updateProfile, uploadAvatar, isLoading: isUpdating, error: updateError } = useUpdateProfile();
  const { alertState, hideAlert, showSuccess, showError } = useAlert();
  const [isInitialized, setIsInitialized] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const titleRef = useRef<TextInput>(null);

  useEffect(() => {
    if (profile && !isInitialized) {
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
      setEmail(profile.email ?? '');
      setPhone(profile.phone ?? '');
      setTitle(profile.title ?? '');
      setAvatar(profile.avatarUrl ?? null);
      setIsInitialized(true);
    }
  }, [profile, isInitialized]);

  const checkForChanges = () => {
    if (!profile) return false;
    return (
      firstName !== (profile.firstName || '') ||
      lastName !== (profile.lastName || '') ||
      email !== (profile.email || '') ||
      phone !== (profile.phone || '') ||
      title !== (profile.title || '') ||
      avatar !== (profile.avatarUrl || null)
    );
  };

  const handleFieldChange = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    value: string
  ) => {
    setter(value);
    setHasChanges(true);
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    setShowConfirmModal(true);
  };

  const isLocalFile = (uri: string | null): boolean => {
    if (!uri) return false;
    return uri.startsWith('file://') || (uri.startsWith('/') && !uri.startsWith('http'));
  };

  const performSave = async () => {
    setShowConfirmModal(false);

    try {
      let newAvatarUrl: string | null | undefined = undefined;

      if (avatar !== profile?.avatarUrl) {
        if (avatar && isLocalFile(avatar)) {

          const uploadResponse = await uploadAvatar(avatar);
          if (uploadResponse.success) {
            newAvatarUrl = uploadResponse.data.avatarUrl;
          } else {
            showError('Error', 'Failed to upload avatar. Please try again.');
            return;
          }
        } else {

          newAvatarUrl = avatar;
        }
      }

      const requestData: {
        firstName: string;
        lastName: string;
        phone: string;
        title: string;
        avatarUrl?: string | null;
      } = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        title: title.trim(),
      };

      if (newAvatarUrl !== undefined) {
        requestData.avatarUrl = newAvatarUrl;
      }

      const response = await updateProfile(requestData);

      if (response.success) {
        showSuccess(
          'Profile Updated',
          'Your profile has been updated successfully.',
          () => navigation?.goBack()
        );
      } else {
        showError('Error', response.message || 'Failed to update profile. Please try again.');
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || 'Failed to update profile. Please try again.';
      showError('Error', errorMsg);
    }
  };

  const handleCancel = () => {
    if (checkForChanges()) {
      setShowDiscardModal(true);
    } else {
      navigation?.goBack();
    }
  };

  const performDiscard = () => {
    setShowDiscardModal(false);
    navigation?.goBack();
  };

  const handleChangeAvatar = () => {
    setShowPhotoModal(true);
  };

  const handlePhotoOption = async (option: 'camera' | 'library' | 'remove') => {
    setShowPhotoModal(false);

    const pickerOptions = {
      width: 400,
      height: 400,
      cropping: true,
      cropperCircleOverlay: true,
      compressImageMaxWidth: 400,
      compressImageMaxHeight: 400,
      compressImageQuality: 0.8,
      mediaType: 'photo' as const,
    };

    try {
      switch (option) {
        case 'camera':
          const cameraImage = await ImageCropPicker.openCamera(pickerOptions);
          setAvatar(cameraImage.path);
          setHasChanges(true);
          break;
        case 'library':
          const libraryImage = await ImageCropPicker.openPicker(pickerOptions);
          setAvatar(libraryImage.path);
          setHasChanges(true);
          break;
        case 'remove':
          setAvatar(null);
          setHasChanges(true);
          break;
      }
    } catch (error: any) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        showError('Error', 'Failed to select image. Please try again.');
      }
    }
  };

  if (isProfileLoading || (!profile && !isInitialized)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            onPress={() => navigation?.goBack()}
            activeOpacity={0.7}
            style={styles.headerButton}>
            <Text variant="body" style={{ color: theme.colors.primary.main }}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text variant="h4" color="primary">
            Edit Profile
          </Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text variant="body" color="secondary" style={styles.loadingText}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={handleCancel}
          activeOpacity={0.7}
          disabled={isUpdating}
          style={styles.headerButton}>
          <Text variant="body" style={{ color: isUpdating ? theme.colors.secondary.main : theme.colors.primary.main }}>
            Cancel
          </Text>
        </TouchableOpacity>

        <Text variant="h4" color="primary">
          Edit Profile
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={isUpdating || !checkForChanges()}
          activeOpacity={0.7}
          style={styles.headerButton}>
          {isUpdating ? (
            <ActivityIndicator size="small" color={theme.colors.primary.main} />
          ) : (
            <Text
              variant="body"
              style={{
                color: checkForChanges()
                  ? theme.colors.primary.main
                  : theme.colors.secondary.main,
                fontWeight: '600',
              }}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={true}
          overScrollMode="always">

          <View style={styles.avatarSection}>
            <TouchableOpacity
              onPress={handleChangeAvatar}
              activeOpacity={0.8}
              style={styles.avatarContainer}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    { backgroundColor: isDark ? colors.grey[60] : colors.grey[10] },
                  ]}>
                  <Icon
                    name="account"
                    size={ms(50)}
                    color={isDark ? colors.grey[25] : colors.grey[50]}
                  />
                </View>
              )}
              <View
                style={[
                  styles.editAvatarOverlay,
                  { backgroundColor: colors.overlay.medium },
                ]}>
                <Icon name="camera" size={ms(24)} color={colors.common.white} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleChangeAvatar} activeOpacity={0.7}>
              <Text variant="body" style={{ color: theme.colors.primary.main, marginTop: vs(12) }}>
                Change Photo
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Input
                  label="First Name"
                  value={firstName}
                  onChangeText={(value) => handleFieldChange(setFirstName, value)}
                  placeholder="First name"
                  error={errors.firstName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                />
              </View>
              <View style={styles.halfField}>
                <Input
                  ref={lastNameRef}
                  label="Last Name"
                  value={lastName}
                  onChangeText={(value) => handleFieldChange(setLastName, value)}
                  placeholder="Last name"
                  error={errors.lastName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
            </View>

            <Input
              ref={emailRef}
              label="Email Address"
              value={email}
              onChangeText={(value) => handleFieldChange(setEmail, value)}
              placeholder="Enter email"
              leftIcon="email-outline"
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
              editable={false}
              hint="Email address cannot be changed"
            />

            <Input
              ref={phoneRef}
              label="Phone Number"
              value={phone}
              onChangeText={(value) => handleFieldChange(setPhone, value)}
              placeholder="Enter phone number"
              leftIcon="phone-outline"
              error={errors.phone}
              keyboardType="phone-pad"
              returnKeyType="next"
              onSubmitEditing={() => titleRef.current?.focus()}
            />

            <Input
              ref={titleRef}
              label="Title"
              value={title}
              onChangeText={(value) => handleFieldChange(setTitle, value)}
              placeholder="Enter your title"
              leftIcon="briefcase-outline"
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showPhotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowPhotoModal(false)}>
          <Pressable
            style={[
              styles.modalContainer,
              { backgroundColor: theme.colors.card },
            ]}
            onPress={() => { }}>
            <View style={styles.modalHeader}>
              <Text variant="h4" color="primary">
                Change Profile Photo
              </Text>
              <TouchableOpacity
                onPress={() => setShowPhotoModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon
                  name="close"
                  size={ms(24)}
                  color={theme.colors.secondary.main}
                />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalDivider, { backgroundColor: theme.colors.border }]} />

            <TouchableOpacity
              style={styles.modalOption}
              activeOpacity={0.7}
              onPress={() => handlePhotoOption('camera')}>
              <View
                style={[
                  styles.modalOptionIcon,
                  { backgroundColor: theme.colors.primary.main + '15' },
                ]}>
                <Icon
                  name="camera"
                  size={ms(22)}
                  color={theme.colors.primary.main}
                />
              </View>
              <Text variant="body" color="primary" style={styles.modalOptionText}>
                Take Photo
              </Text>
              <Icon
                name="chevron-right"
                size={ms(20)}
                color={theme.colors.secondary.main}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              activeOpacity={0.7}
              onPress={() => handlePhotoOption('library')}>
              <View
                style={[
                  styles.modalOptionIcon,
                  { backgroundColor: theme.colors.primary.main + '15' },
                ]}>
                <Icon
                  name="image"
                  size={ms(22)}
                  color={theme.colors.primary.main}
                />
              </View>
              <Text variant="body" color="primary" style={styles.modalOptionText}>
                Choose from Library
              </Text>
              <Icon
                name="chevron-right"
                size={ms(20)}
                color={theme.colors.secondary.main}
              />
            </TouchableOpacity>

            {avatar && (
              <TouchableOpacity
                style={styles.modalOption}
                activeOpacity={0.7}
                onPress={() => handlePhotoOption('remove')}>
                <View
                  style={[
                    styles.modalOptionIcon,
                    { backgroundColor: theme.colors.error.background },
                  ]}>
                  <Icon
                    name="trash-can-outline"
                    size={ms(22)}
                    color={theme.colors.error.main}
                  />
                </View>
                <Text variant="body" style={[styles.modalOptionText, { color: theme.colors.error.main }]}>
                  Remove Photo
                </Text>
                <Icon
                  name="chevron-right"
                  size={ms(20)}
                  color={theme.colors.error.main}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.modalCancelButton,
                {
                  backgroundColor: isDark ? colors.modal.dark.cancelBg : colors.modal.light.cancelBg,
                  borderWidth: 1,
                  borderColor: isDark ? colors.modal.dark.cancelBorder : colors.modal.light.cancelBorder,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => setShowPhotoModal(false)}>
              <Text variant="body" style={{ color: isDark ? colors.modal.dark.cancelText : colors.modal.light.cancelText, fontWeight: '600' }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !isUpdating && setShowConfirmModal(false)}>
          <Pressable
            style={[
              styles.confirmModalContainer,
              { backgroundColor: theme.colors.card },
            ]}
            onPress={() => { }}>
            <View style={styles.confirmModalIcon}>
              <Icon
                name="account-check-outline"
                size={ms(48)}
                color={theme.colors.primary.main}
              />
            </View>

            <Text variant="h4" color="primary" style={styles.confirmModalTitle}>
              Save Changes?
            </Text>

            <Text variant="body" color="secondary" style={styles.confirmModalMessage}>
              Are you sure you want to update your profile information?
            </Text>

            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[
                  styles.confirmModalButton,
                  styles.confirmModalCancelBtn,
                  {
                    backgroundColor: isDark ? colors.modal.dark.cancelBg : colors.modal.light.cancelBg,
                    borderColor: isDark ? colors.modal.dark.cancelBorder : colors.modal.light.cancelBorder,
                  },
                ]}
                activeOpacity={0.7}
                disabled={isUpdating}
                onPress={() => setShowConfirmModal(false)}>
                <Text variant="button" style={{ color: isDark ? colors.modal.dark.cancelText : colors.modal.light.cancelText }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmModalButton,
                  styles.confirmModalSaveBtn,
                  { backgroundColor: theme.colors.primary.main },
                ]}
                activeOpacity={0.7}
                disabled={isUpdating}
                onPress={performSave}>
                {isUpdating ? (
                  <ActivityIndicator size="small" color={theme.colors.primary.contrast} />
                ) : (
                  <Text variant="button" style={{ color: theme.colors.primary.contrast }}>
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showDiscardModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDiscardModal(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDiscardModal(false)}>
          <Pressable
            style={[
              styles.confirmModalContainer,
              { backgroundColor: theme.colors.card },
            ]}
            onPress={() => { }}>
            <View style={[styles.discardModalIcon, { backgroundColor: theme.colors.error.main + '15' }]}>
              <Icon
                name="alert-circle-outline"
                size={ms(32)}
                color={theme.colors.error.main}
              />
            </View>

            <Text variant="h4" color="primary" style={styles.confirmModalTitle}>
              Discard Changes?
            </Text>

            <Text variant="body" color="secondary" style={styles.confirmModalMessage}>
              You have unsaved changes. Are you sure you want to discard them?
            </Text>

            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[
                  styles.confirmModalButton,
                  styles.confirmModalCancelBtn,
                  {
                    backgroundColor: isDark ? colors.modal.dark.cancelBg : colors.modal.light.cancelBg,
                    borderColor: isDark ? colors.modal.dark.cancelBorder : colors.modal.light.cancelBorder,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => setShowDiscardModal(false)}>
                <Text variant="button" style={{ color: isDark ? colors.modal.dark.cancelText : colors.modal.light.cancelText }}>
                  Keep Editing
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmModalButton,
                  styles.discardBtn,
                  { backgroundColor: theme.colors.error.main },
                ]}
                activeOpacity={0.7}
                onPress={performDiscard}>
                <Text variant="button" style={{ color: colors.common.white }}>
                  Discard
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <AlertModal
        visible={alertState.visible}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: vs(12),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: vs(12),
    borderBottomWidth: 1,
  },
  headerButton: {
    paddingVertical: vs(10),
    paddingHorizontal: spacing.sm,
    minHeight: ms(40),
    justifyContent: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: vs(24),
    paddingBottom: vs(40),
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: vs(32),
  },
  avatarContainer: {
    position: 'relative',
    width: ms(100),
    height: ms(100),
    borderRadius: ms(50),
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ms(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    marginBottom: vs(24),
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -spacing.xs,
  },
  halfField: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  readOnlySection: {
    marginTop: vs(16),
  },
  sectionLabel: {
    marginBottom: vs(4),
  },
  readOnlyHint: {
    marginBottom: vs(12),
  },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: vs(14),
    borderRadius: ms(12),
  },
  readOnlyContent: {
    flex: 1,
    marginLeft: ms(12),
  },
  saveButton: {
    marginTop: vs(8),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.medium,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalContainer: {
    width: '100%',
    borderRadius: ms(16),
    paddingTop: vs(20),
    paddingBottom: vs(16),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: vs(16),
  },
  modalDivider: {
    height: 1,
    marginBottom: vs(8),
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(14),
    paddingHorizontal: spacing.lg,
  },
  modalOptionIcon: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionText: {
    flex: 1,
    marginLeft: ms(14),
  },
  modalCancelButton: {
    alignItems: 'center',
    paddingVertical: vs(14),
    marginHorizontal: spacing.lg,
    marginTop: vs(8),
    borderRadius: ms(12),
  },
  confirmModalContainer: {
    width: '100%',
    borderRadius: ms(16),
    padding: spacing.lg,
    alignItems: 'center',
  },
  confirmModalIcon: {
    marginBottom: vs(16),
  },
  confirmModalTitle: {
    marginBottom: vs(8),
    textAlign: 'center',
  },
  confirmModalMessage: {
    textAlign: 'center',
    marginBottom: vs(24),
    paddingHorizontal: spacing.md,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: ms(12),
  },
  confirmModalButton: {
    flex: 1,
    paddingVertical: vs(14),
    borderRadius: ms(12),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: ms(48),
  },
  confirmModalCancelBtn: {
    borderWidth: 1,
  },
  confirmModalSaveBtn: {},
  discardModalIcon: {
    width: ms(64),
    height: ms(64),
    borderRadius: ms(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(16),
  },
  discardBtn: {},
});

export default EditProfileScreen;
