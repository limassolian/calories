export const colors = {
  // Primary backgrounds
  background: '#FDF6E9',
  backgroundDark: '#F5EBD8',
  card: '#FFFFFF',

  // Text colors
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#9B9B9B',

  // Accent colors
  primary: '#FF8C42',
  primaryLight: '#FFB285',

  // Macro colors
  calories: '#FFB800',
  caloriesLight: '#FFF3D0',
  carbs: '#FF4757',
  carbsLight: '#FFE4E6',
  protein: '#FF9F43',
  proteinLight: '#FFF0E0',
  fat: '#26DE81',
  fatLight: '#E0FFF0',

  // Status colors
  success: '#26DE81',
  warning: '#FFB800',
  error: '#FF4757',

  // UI colors
  border: '#E8E0D5',
  shadow: 'rgba(0, 0, 0, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Input colors
  inputBackground: '#FEFCF9',
  inputBorder: '#E8E0D5',
  inputPlaceholder: '#B5B5B5',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const typography = {
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
};

const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
};

export default theme;
