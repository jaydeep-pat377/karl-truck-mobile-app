export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    CHANGE_PASSWORD: '/auth/change-password',
  },
  USER: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    UPLOAD_AVATAR: '/users/profile/avatar',
  },
  DASHBOARD: {
    GET: '/new-dashboard',
  },
  ORDERS: {
    LIST: '/orders',
    DETAILS: '/orders/details',
    TRACKING: '/orders/tracking',
    FAVOURITE: '/orders',
    SCHEDULED_LOADS: '/orders/scheduled-loads',
  },
  TICKETS: {
    LIST: '/tickets',
    BY_ORDER: '/tickets/by-order',
    DETAILS: '/tickets/details',
  },
  WEATHER: {
    ALL: '/weather/all',
  },
  TRUCKS: {
    LIST: '/trucks',
  },
  NOTIFICATIONS: {
    QUEUE: '/notification-queue',
  },
  ANNOUNCEMENTS: {
    ME: '/announcements/me',
  },
} as const;
