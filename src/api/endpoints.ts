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
  },
  DASHBOARD: {
    GET: '/dashboard',
  },
  ORDERS: {
    LIST: '/orders',
    DETAILS: '/orders/details',
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
} as const;
