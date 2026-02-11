

export type UserRole = 'dispatcher' | 'customer' | 'driver' | 'admin' | 'authenticated';

export interface UserMetadata {
  email_verified: boolean;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  role: UserRole;
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
