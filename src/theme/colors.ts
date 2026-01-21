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
      disabled: '#585957',  // Dark Gray
      hint: '#585957',
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
      hint: '#BFBFBF',
    },
  },
  common: {
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
  },
  overlay: {
    light: 'rgba(255, 255, 255, 0.1)',
    medium: 'rgba(0, 0, 0, 0.5)',
    dark: 'rgba(0, 0, 0, 0.7)',
    modal: 'rgba(0, 0, 0, 0.6)',
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
  // Ticket Screen Colors
  ticket: {
    // Light mode status colors
    status: {
      atPlant: {
        bg: '#F5F5F5',
        text: '#666666',
        iconBg: '#E0E0E0',
      },
      inTransit: {
        bg: '#E3F2FD',
        text: '#1976D2',
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
        timeText: '#888888',
        chevron: '#AAAAAA',
        filterBg: '#F0F0F0',
        filterBorder: '#E8E8E8',
        filterText: '#666666',
        progressBg: '#E3F2FD',
        emptyIcon: '#4CAF50',
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
  PRE_POUR: colors.status.prePour,
  IN_PROCESS: colors.status.inProcess,
  COMPLETED: colors.status.completed,
  CANCELLED: colors.status.cancelled,
  DELAYED: colors.status.delayed,
  ON_HOLD: colors.status.onHold,
  ENRT: colors.status.enRoute,
  ONSIT: colors.status.onSite,
  NORMAL: colors.status.inProcess,
  WILL_CALL: colors.status.prePour,
  WEATHER_PERMITTING: colors.status.prePour,
  HOLD: colors.status.onHold,
  WAIT_LIST: colors.status.onHold,
};

export type ColorTheme = 'light' | 'dark';
