import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ImageCropPicker from 'react-native-image-crop-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from '../../components/common/Text';
import { Input } from '../../components/common/Input';
import { colors } from '../../theme/colors';
import { ms, vs, spacing } from '../../utils/responsive';

interface EditProfileScreenProps {
  navigation?: any;
}

const initialData = {
  firstName: 'John',
  lastName: 'Anderson',
  email: 'john.anderson@dolese.com',
  phone: '(405) 555-0123',
  department: 'Operations',
  avatar: null as string | null,
};

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({
  navigation,
}) => {
  const { theme, isDark } = useTheme();
  const [firstName, setFirstName] = useState(initialData.firstName);
  const [lastName, setLastName] = useState(initialData.lastName);
  const [email, setEmail] = useState(initialData.email);
  const [phone, setPhone] = useState(initialData.phone);
  const [avatar, setAvatar] = useState(initialData.avatar);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  const checkForChanges = () => {
    return (
      firstName !== initialData.firstName ||
      lastName !== initialData.lastName ||
      email !== initialData.email ||
      phone !== initialData.phone ||
      avatar !== initialData.avatar
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

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      Alert.alert(
        'Profile Updated',
        'Your profile has been updated successfully.',
        [{ text: 'OK', onPress: () => navigation?.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (checkForChanges()) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation?.goBack() },
        ]
      );
    } else {
      navigation?.goBack();
    }
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
        Alert.alert('Error', 'Failed to select image. Please try again.');
      }
    }
  };

  const getInitials = (): string => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={handleCancel}
          activeOpacity={0.7}
          style={styles.headerButton}>
          <Text variant="body" style={{ color: theme.colors.primary.main }}>
            Cancel
          </Text>
        </TouchableOpacity>

        <Text variant="h4" color="primary">
          Edit Profile
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={isLoading || !checkForChanges()}
          activeOpacity={0.7}
          style={styles.headerButton}>
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
                    { backgroundColor: theme.colors.primary.main },
                  ]}>
                  <Text variant="h1" style={{ color: theme.colors.primary.contrast }}>
                    {getInitials()}
                  </Text>
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
              returnKeyType="done"
            />

            <View style={styles.readOnlySection}>
              <Text variant="label" color="secondary" style={styles.sectionLabel}>
                COMPANY INFORMATION
              </Text>
              <Text variant="caption" color="hint" style={styles.readOnlyHint}>
                Contact your administrator to update these details
              </Text>

              <View style={[styles.readOnlyField, { backgroundColor: theme.colors.card }]}>
                <Icon name="office-building-outline" size={ms(20)} color={theme.colors.secondary.main} />
                <View style={styles.readOnlyContent}>
                  <Text variant="caption" color="hint">
                    Department
                  </Text>
                  <Text variant="body" color="secondary">
                    {initialData.department}
                  </Text>
                </View>
                <Icon name="lock-outline" size={ms(16)} color={theme.colors.secondary.main} />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Photo Options Modal */}
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
            onPress={() => {}}>
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
                { backgroundColor: isDark ? theme.colors.surface : theme.colors.background },
              ]}
              activeOpacity={0.7}
              onPress={() => setShowPhotoModal(false)}>
              <Text variant="body" style={{ color: theme.colors.primary.main, fontWeight: '600' }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingVertical: vs(8),
    paddingHorizontal: spacing.sm,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
});

export default EditProfileScreen;
