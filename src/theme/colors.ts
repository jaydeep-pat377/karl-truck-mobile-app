export const colors = {
  // Primary Colors from brand palette
  primary: {
    main: '#6BB130',       // Green (Primary)
    light: '#86C543',      // Green Light
    dark: '#5A9628',       // Green Dark (derived)
    contrast: '#FFFFFF',
  },
  secondary: {
    main: '#04BCEF',       // Blue (Accent)
    light: '#36CAFF',      // Blue Light (derived)
    dark: '#039CC7',       // Blue Dark (derived)
    contrast: '#FFFFFF',
  },
  // Greyscale Colors
  grey: {
    100: '#000000',        // Black 100%
    85: '#262626',         // Black 85%
    80: '#323232',         // Black 80%
    60: '#585957',         // Dark Gray
    50: '#808080',         // Mid Gray
    40: '#999999',         // Gray 40%
    25: '#BFBFBF',         // Black 25%
    15: '#D9D9D9',         // Light Gray 15%
    10: '#E5E5E5',         // Very Light Gray 10%
    8: '#EBEBEB',          // Extra Light Gray 8%
    5: '#F2F2F2',          // Black 5%
    3: '#F7F7F7',          // Almost White
    light: '#F4F4F4',      // Light Gray
  },
  // Progress Bar Colors
  progress: {
    trackLight: '#E8E8E8', // Soft gray for light mode
    trackDark: '#3A3A3A',  // Subtle dark gray for dark mode
  },
  status: {
    prePour: '#F59E0B',
    inProcess: '#04BCEF',  // Using brand blue
    completed: '#6BB130',  // Using brand green
    cancelled: '#EF4444',
    delayed: '#EF4444',    // Red for delayed
    onHold: '#585957',     // Using brand dark gray
    enRoute: '#8B5CF6',
    onSite: '#04BCEF',     // Using brand blue
  },
  weather: {
    gradientStart: '#6BB130',
    gradientEnd: '#86C543',
    cloudyBg: '#585957',
  },
  success: {
    main: '#6BB130',       // Using brand green
    light: '#86C543',      // Using brand green light
    dark: '#5A9628',
    background: '#E8F5E0',
  },
  warning: {
    main: '#F59E0B',
    light: '#FBBF24',
    dark: '#D97706',
    background: '#FEF3C7',
  },
  error: {
    main: '#EF4444',
    light: '#F87171',
    dark: '#DC2626',
    background: '#FEE2E2',
  },
  info: {
    main: '#04BCEF',       // Using brand blue
    light: '#36CAFF',
    dark: '#039CC7',
    background: '#E0F7FC',
  },
  dark: {
    background: '#000000', // Black 100%
    surface: '#262626',    // Black 85%
    card: '#323232',       // Black 80%
    cardElevated: '#3D3D3D',
    border: '#585957',     // Dark Gray
    text: {
      primary: '#FFFFFF',
      secondary: '#BFBFBF', // Black 25%
      disabled: '#808080',  // Mid Gray - improved contrast
      hint: '#999999',      // Gray 40% - improved contrast for visibility
    },
  },
  light: {
    background: '#F2F2F2', // Black 5%
    surface: '#FFFFFF',
    card: '#FFFFFF',
    cardElevated: '#F4F4F4', // Light Gray
    border: '#BFBFBF',     // Black 25%
    text: {
      primary: '#000000',  // Black 100%
      secondary: '#585957', // Dark Gray
      disabled: '#BFBFBF', // Black 25%
      hint: '#808080',     // Mid Gray - improved contrast for visibility
    },
  },
  common: {
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
    shadow: '#000000', // Standard shadow color
  },
  overlay: {
    light: 'rgba(255, 255, 255, 0.1)',
    medium: 'rgba(0, 0, 0, 0.5)',
    dark: 'rgba(0, 0, 0, 0.7)',
    modal: 'rgba(0, 0, 0, 0.6)',
  },
  // Modal button colors for better dark mode visibility
  modal: {
    light: {
      cancelBg: '#F2F2F2',
      cancelText: '#585957',
      cancelBorder: '#E5E5E5',
    },
    dark: {
      cancelBg: '#404040',
      cancelText: '#FFFFFF',
      cancelBorder: '#5A5A5A',
    },
  },
  // Weather Screen Theme (Dark Navy Blue)
  weatherTheme: {
    background: '#0A1628',
    cardBackground: '#111D2E',
    cardBorder: '#1E3A5F',
    gradient: {
      colors: ['#0A1628', '#0F1E32', '#162844', '#1E3A5F'] as const,
      locations: [0, 0.3, 0.6, 1] as const,
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#94A3B8',
      hint: '#64748B',
    },
    // Menu colors - subtle and integrated with theme
    menu: {
      background: '#111D2E',              // Same as cardBackground for consistency
      border: '#1E3A5F',                  // Same as cardBorder
      overlay: 'rgba(0, 0, 0, 0.6)',      // Standard overlay
      shadow: '#000000',                  // Standard shadow
      iconBackground: 'rgba(255, 255, 255, 0.06)', // Very subtle light tint
      divider: 'rgba(255, 255, 255, 0.08)',  // Subtle white divider
    },
  },
  // Weather Icon Colors
  weatherIcon: {
    sunGold: '#FFD700',
    sunOrange: '#FFA500',
    cloudLight: '#E0E7FF',
    cloudBlue: '#A5B4FC',
    rain: '#60A5FA',
  },
  // Product Recommendation Colors
  productChip: {
    thermalCracking: '#FF4343',
    plasticCracking: '#EAAD29',
    cream: '#F5F5DC',
  },
  // Loader/Animation Colors
  loader: {
    wheelSpoke: '#3A3B4A',
  },
  // External App/Brand Colors
  brands: {
    googleMaps: '#4285F4',
    appleMaps: '#000000',
  },
  // Action Colors (for buttons, links)
  action: {
    call: {
      main: '#FF5722',
      light: '#FF8A65',
      dark: '#E64A19',
      bgLight: 'rgba(255, 87, 34, 0.1)',
      bgDark: 'rgba(255, 138, 101, 0.15)',
      borderLight: 'rgba(255, 87, 34, 0.2)',
    },
  },
  // Dashboard/Stats Colors
  dashboard: {
    willCall: '#8B5CF6',      // Purple
    inProgress: '#F97316',    // Orange
  },
  // Map Marker Colors
  mapMarker: {
    jobSite: '#FF6B6B',       // Red/coral for job site
    truck: '#04BCEF',         // Blue for truck (uses secondary.main)
    plant: '#04BCEF',         // Blue for plant location
  },
  // Info Section Icon Colors
  infoIcons: {
    cyan: {
      light: '#00BCD4',
      dark: '#4DD0E1',
    },
    orange: {
      light: '#FF5722',
      dark: '#FF8A65',
    },
    purple: {
      light: '#673AB7',
      dark: '#B39DDB',
    },
    blue: {
      light: '#1976D2',
      dark: '#64B5F6',
    },
  },
  // Accent Colors for various UI elements
  accent: {
    blue: '#3949ab',
    indigo: '#6366F1', // Indigo for selected states
    indigoBg: 'rgba(99, 102, 241, 0.1)', // Indigo background with opacity
  },
  // Card Background Colors
  cardBg: {
    light: '#FAFAFA',
    dark: '#1a2a3a',
    border: '#E0E0E0',
    infoBg: '#E8F4FC',
  },
  // Tab Bar Theme Colors
  tabBar: {
    light: {
      background: '#FFFFFF',
      iconInactive: '#8E8E93',
      iconActive: '#FFFFFF',
      labelActive: '#FFFFFF',
      border: '#E5E5EA',
    },
    dark: {
      background: '#4B5563',
      iconInactive: 'rgba(255,255,255,0.55)',
      iconActive: '#FFFFFF',
      labelActive: '#FFFFFF',
    },
  },
  // Status Badge Colors (for StatusBadge component)
  statusBadge: {
    red: {
      text: '#DC2626',
      textDark: '#F87171',
    },
    amber: {
      text: '#D97706',
      textDark: '#FBBF24',
    },
    yellow: {
      text: '#d0c41d',
      textDark: '#FACC15',
    },
    green: {
      text: '#059669',
      textDark: '#34D399',
    },
    blue: {
      text: '#0284C7',
      textDark: '#38BDF8',
    },
    purple: {
      text: '#7C3AED',
      textDark: '#A78BFA',
    },
    gray: {
      text: '#4B5563',
      textDark: '#9CA3AF',
    },
  },
  // Weather Badge Colors
  weatherBadge: {
    sunny: '#F59E0B',
    partlyCloudy: '#6B7280',
    cloudy: '#9CA3AF',
    rain: '#3B82F6',
    storm: '#6366F1',
    snow: '#60A5FA',
    fog: '#9CA3AF',
  },
  // Ticket Detail Badge Status Colors (for floating status badge)
  ticketBadge: {
    pending: {
      bg: 'rgba(255, 255, 255, 0.95)',
      text: '#666666',
      icon: '#888888',
    },
    ticketed: {
      bg: 'rgba(255, 255, 255, 0.95)',
      text: '#0288D1',
      icon: '#0288D1',
    },
    loading: {
      bg: 'rgba(255, 193, 7, 0.95)',
      text: '#5D4037',
      icon: '#5D4037',
    },
    loaded: {
      bg: 'rgba(255, 255, 255, 0.95)',
      text: '#0277BD',
      icon: '#0277BD',
    },
    toJob: {
      bg: 'rgba(33, 150, 243, 0.95)',
      text: '#FFFFFF',
      icon: '#FFFFFF',
    },
    atJob: {
      bg: 'rgba(255, 152, 0, 0.95)',
      text: '#FFFFFF',
      icon: '#FFFFFF',
    },
    pouring: {
      bg: 'rgba(255, 255, 255, 0.95)',
      text: '#2E7D32',
      icon: '#2E7D32',
    },
    washing: {
      bg: 'rgba(3, 169, 244, 0.95)',
      text: '#FFFFFF',
      icon: '#FFFFFF',
    },
    toPlant: {
      bg: 'rgba(156, 39, 176, 0.9)',
      text: '#FFFFFF',
      icon: '#FFFFFF',
    },
    atPlant: {
      bg: 'rgba(255, 255, 255, 0.95)',
      text: '#546E7A',
      icon: '#546E7A',
    },
    cancelled: {
      bg: 'rgba(244, 67, 54, 0.95)',
      text: '#FFFFFF',
      icon: '#FFFFFF',
    },
  },
  // Header Overlay Colors (white with opacity for dark headers)
  headerOverlay: {
    bg: 'rgba(255,255,255,0.15)',
    bgHover: 'rgba(255,255,255,0.2)',
    text: 'rgba(255,255,255,0.7)',
    textBright: 'rgba(255,255,255,0.8)',
    textBrightest: 'rgba(255,255,255,0.9)',
    border: 'rgba(255,255,255,0.2)',
  },
  // Semi-transparent white/dark overlays
  semiTransparent: {
    white08: 'rgba(255,255,255,0.08)',
    white10: 'rgba(255,255,255,0.1)',
    white15: 'rgba(255,255,255,0.15)',
    white20: 'rgba(255,255,255,0.2)',
    white30: 'rgba(255,255,255,0.3)',
  },
  // Product status colors (for weather/product screens)
  productStatus: {
    danger: '#EF5350',
    safe: '#66BB6A',
    info: '#42A5F5',
    truckIcon: '#90CAF9',
  },
  // Ticket Screen Colors
  ticket: {
    // Light mode status colors
    status: {
      atPlant: {
        bg: '#ECEFF1',
        text: '#546E7A',
        iconBg: '#CFD8DC',
      },
      inTransit: {
        bg: '#E3F2FD',
        text: '#1565C0',
        iconBg: '#BBDEFB',
      },
      atSite: {
        bg: '#FFF3E0',
        text: '#E65100',
        iconBg: '#FFE0B2',
      },
      pouring: {
        bg: '#E8F5E9',
        text: '#2E7D32',
        iconBg: '#C8E6C9',
      },
      completed: {
        bg: '#E8F5E9',
        text: '#2E7D32',
        iconBg: '#A5D6A7',
      },
      returning: {
        bg: '#F3E5F5',
        text: '#7B1FA2',
        iconBg: '#E1BEE7',
      },
    },
    // Dark mode status colors
    statusDark: {
      atPlant: {
        bg: 'rgba(150, 150, 150, 0.15)',
        text: '#AAAAAA',
        iconBg: 'rgba(150, 150, 150, 0.3)',
      },
      inTransit: {
        bg: 'rgba(33, 150, 243, 0.15)',
        text: '#64B5F6',
        iconBg: 'rgba(33, 150, 243, 0.3)',
      },
      atSite: {
        bg: 'rgba(255, 152, 0, 0.15)',
        text: '#FFB74D',
        iconBg: 'rgba(255, 152, 0, 0.3)',
      },
      pouring: {
        bg: 'rgba(76, 175, 80, 0.15)',
        text: '#81C784',
        iconBg: 'rgba(76, 175, 80, 0.3)',
      },
      completed: {
        bg: 'rgba(76, 175, 80, 0.15)',
        text: '#81C784',
        iconBg: 'rgba(76, 175, 80, 0.4)',
      },
      returning: {
        bg: 'rgba(156, 39, 176, 0.15)',
        text: '#BA68C8',
        iconBg: 'rgba(156, 39, 176, 0.3)',
      },
    },
    // UI element colors
    ui: {
      light: {
        timeText: '#666666',
        chevron: '#999999',
        filterBg: '#F5F5F5',
        filterBorder: '#E0E0E0',
        filterText: '#555555',
        progressBg: '#E8F5E0',
        emptyIcon: '#6BB130',
      },
      dark: {
        timeText: 'rgba(255,255,255,0.5)',
        chevron: 'rgba(255,255,255,0.4)',
        filterBg: 'rgba(255,255,255,0.08)',
        filterBorder: 'rgba(255,255,255,0.12)',
        filterText: 'rgba(255,255,255,0.75)',
        progressBg: 'rgba(66, 165, 245, 0.15)',
        accentBlue: '#42A5F5',
        accentBlueLight: '#64B5F6',
        badgeBg: 'rgba(33, 150, 243, 0.2)',
      },
    },
    // Empty state gradient colors
    emptyGradient: {
      light: ['#E8F5E9', '#C8E6C9'],
      dark: ['#1B5E20', '#2E7D32'],
    },
  },
  // Theme-based gradients for headers and hero sections
  gradients: {
    // Light theme: Soft, subtle gradients
    light: {
      primary: ['#6BB130', '#86C543'],           // Green primary gradient
      primarySubtle: ['#E8F5E0', '#F5FBF0'],     // Very soft green
      secondary: ['#04BCEF', '#36CAFF'],         // Blue accent gradient
      secondarySubtle: ['#E0F7FC', '#F0FBFE'],   // Very soft blue
      surface: ['#FFFFFF', '#F7F7F7'],           // White to light gray
      header: ['#6BB130', '#7FC23D', '#FFFFFF'], // Primary fading to white
      // Top background gradient - smooth transition to white
      topBackground: ['#5A9628', '#6BB130', '#86C543', '#E8F5E0', '#F2F2F2'],
      topBackgroundLocations: [0, 0.2, 0.4, 0.7, 1],
    },
    // Dark theme: Deep, rich gradients
    dark: {
      primary: ['#5A9628', '#6BB130'],           // Darker to primary green
      primarySubtle: ['#323232', '#262626'],     // Card to surface
      secondary: ['#039CC7', '#04BCEF'],         // Darker to primary blue
      secondarySubtle: ['#262626', '#1A1A1A'],   // Surface tones
      surface: ['#323232', '#262626'],           // Card to surface
      header: ['#5A9628', '#4A7A20', '#262626'], // Primary fading to surface
      // Top background gradient - smooth transition to dark surface
      topBackground: ['#5A9628', '#6BB130', '#323232', '#262626', '#000000'],
      topBackgroundLocations: [0, 0.25, 0.5, 0.75, 1],
    },
  },
};

export const statusColorMap: Record<string, string> = {
  // Pre-Pour / Normal → Green
  PRE_POUR: colors.success.main,
  'Pre-Pour': colors.success.main,
  'pre_pour': colors.success.main,
  'Pre Pour': colors.success.main,
  'pre pour': colors.success.main,
  NORMAL: colors.success.main,
  'Normal': colors.success.main,
  'normal': colors.success.main,

  // In Progress → Green (default, dynamic in OrderCard based on cy/hr)
  IN_PROCESS: colors.success.main,
  'In Progress': colors.success.main,
  'in progress': colors.success.main,
  'in_process': colors.success.main,

  // Completed → Green (default, dynamic in OrderCard based on cy/hr)
  COMPLETED: colors.success.main,
  'Completed': colors.success.main,
  'completed': colors.success.main,

  // Cancelled → Red
  CANCELLED: colors.error.main,
  CANCELED: colors.error.main,
  'Cancelled': colors.error.main,
  'Canceled': colors.error.main,
  'cancelled': colors.error.main,
  'canceled': colors.error.main,

  // Delayed → Red
  DELAYED: colors.error.main,
  'Delayed': colors.error.main,
  'delayed': colors.error.main,

  // Hold → Red
  HOLD: colors.error.main,
  'Hold': colors.error.main,
  'hold': colors.error.main,
  ON_HOLD: colors.error.main,
  'On Hold': colors.error.main,
  'on hold': colors.error.main,
  'Hold Delivery': colors.error.main,
  'hold delivery': colors.error.main,
  'hold_delivery': colors.error.main,

  // En Route / On Site
  ENRT: colors.status.enRoute,
  ONSIT: colors.status.onSite,

  // Will Call → Yellow
  WILL_CALL: colors.warning.main,
  'Will Call': colors.warning.main,
  'will call': colors.warning.main,
  'will_call': colors.warning.main,

  // Weather Permitting → Yellow
  WEATHER_PERMITTING: colors.warning.main,
  'Weather Permitting': colors.warning.main,
  'weather permitting': colors.warning.main,
  'weather_permitting': colors.warning.main,

  // Wait List → Yellow
  WAIT_LIST: colors.warning.main,
  'Wait List': colors.warning.main,
  'wait list': colors.warning.main,
  'wait_list': colors.warning.main,
  'Waitlist': colors.warning.main,
  'waitlist': colors.warning.main,
};

// Performance-based color helper for In Process and Completed orders
// ≥90% → Green, 60%-<90% → Yellow, <60% → Red
export const getPerformanceColor = (performancePercent: number): string => {
  if (performancePercent >= 90) {
    return colors.success.main;  // Green
  } else if (performancePercent >= 60) {
    return colors.warning.main;  // Yellow
  } else {
    return colors.error.main;    // Red
  }
};

export type ColorTheme = 'light' | 'dark';
