import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppTheme } from '../contexts/ThemeContext';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { ChangePasswordScreen } from '../screens/settings/ChangePasswordScreen';
import { ChangePINScreen } from '../screens/settings/ChangePINScreen';
import { WebViewScreen } from '../screens/settings/WebViewScreen';
import { EmailTemplateListScreen } from '../screens/settings/EmailTemplateListScreen';
import { EmailTemplateEditScreen } from '../screens/settings/EmailTemplateEditScreen';
import { TicketScanScreen } from '../screens/settings/TicketScanScreen';
import { TicketScanHistoryScreen } from '../screens/settings/TicketScanHistoryScreen';

export type SettingsStackParamList = {
  SettingsMain: undefined;
  Profile: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  ChangePIN: undefined;
  WebView: { url: string; title: string };
  EmailTemplateList: undefined;
  EmailTemplateEdit: { templateKey: string; templateId?: string; templateName: string };
  TicketScan: undefined;
  TicketScanHistory: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export const SettingsNavigator: React.FC = () => {
  const theme = useAppTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="ChangePIN" component={ChangePINScreen} />
      <Stack.Screen name="WebView" component={WebViewScreen} />
      <Stack.Screen name="EmailTemplateList" component={EmailTemplateListScreen} />
      <Stack.Screen name="EmailTemplateEdit" component={EmailTemplateEditScreen} />
      <Stack.Screen name="TicketScan" component={TicketScanScreen} />
      <Stack.Screen name="TicketScanHistory" component={TicketScanHistoryScreen} />
    </Stack.Navigator>
  );
};

export default SettingsNavigator;
