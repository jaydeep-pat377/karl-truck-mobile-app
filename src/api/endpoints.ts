export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    MOBILE_LOGIN: '/auth/mobile/login',
    EXCHANGE_CODE: '/auth/mobile/exchange-code',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    CHANGE_PASSWORD: '/auth/change-password',
    APP_PERMISSIONS: '/auth/app-permissions',
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
    WEATHER: '/tickets',
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
  ORDER_REQUESTS: {
    LIST: '/order-requests',
    DETAIL: '/order-requests',
    CREATE: '/order-requests',
    UPDATE: '/order-requests',
    STATUS: '/order-requests',
    VERIFICATION: '/order-requests',
    MESSAGES: '/order-requests',
    FORM_DATA: '/order-requests/form-data',
    SEARCH_ORDERS: '/order-requests/search-orders',
    SEARCH_PRODUCTS: '/order-requests/search-products',
    RECENT_ENTITIES: '/order-requests/recent-entities',
  },
  EMAIL_TEMPLATES: {
    LIST: '/email-templates',
    DEFAULTS: '/email-templates/defaults',
    DETAIL: '/email-templates',
    CREATE: '/email-templates',
    UPDATE: '/email-templates',
    DELETE: '/email-templates',
  },
  CHAT: {
    READ_STATUS: '/chat/read-status',
    UNREAD_COUNTS: '/chat/unread-counts',
    MARK_READ: '/chat/mark-read',
  },
  SHORT_URLS: {
    RESOLVE: '/short-urls/resolve',
  },
} as const;
