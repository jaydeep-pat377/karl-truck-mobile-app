

export type UserRole = 'dispatcher' | 'customer' | 'driver' | 'admin' | 'authenticated';

export type UserType = 'admin' | 'producer' | 'contractor' | 'none';

/**
 * Role values returned by the Login API in the `userRole` field.
 */
export type ApiUserRole =
  | 'tk-admin'
  | 'concrete-producer-users'
  | 'contractor-users'
  | 'eastern-region-access'
  | 'yukon-batch-plant-access'
  | 'mixed-access'
  | null;

export interface TenantInfo {
  tenant_client_id: string;
  tenant_id: number;
  tenant_name: string;
  tenant_redirect_url: string;
  tenant_subdomain: string;
  tenant_supabase_url: string;
  tenant_uuid: string;
}

export interface UserMetadata {
  email_verified: boolean;
  central_user_id?: number;
  central_user_uuid?: string;
  full_name?: string;
  tenant?: TenantInfo;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  role: UserRole;
  userType?: UserType;
  userRole?: ApiUserRole;
  metadata?: UserMetadata;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  company?: string | null;
  avatarUrl?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  phoneNumber: string;
  phoneCountryCode: string;
  title: string;
  company: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  avatarUrl: string | null;
}

export interface ProfileResponse {
  success: boolean;
  message: string;
  data: UserProfile;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
}

export interface DeviceInfo {
  device_token: string;
  device_type: 'android' | 'ios';
  device_name: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  device_info?: DeviceInfo;
}

export interface LoginRequest {
  email: string;
  password: string;
  device_info: DeviceInfo;
}

export interface MobileLoginResponseData {
  code: string;
  client_secret: string;
  redirect_url: string;
  expires_in: number;
  tenant: {
    id: number;
    name: string;
    subdomain: string;
  };
}

export interface MobileLoginResponse {
  success: boolean;
  message: string;
  data: MobileLoginResponseData;
}

export interface ExchangeCodeRequest {
  code: string;
  client_secret: string;
  device_info: DeviceInfo;
}

export interface LoginResponseData {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: LoginResponseData;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
