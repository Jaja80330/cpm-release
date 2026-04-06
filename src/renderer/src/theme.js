import { createDarkTheme } from '@fluentui/react-components'

// Palette Cinnamon — brun chaud / orange doux
const cinnamonBrand = {
  10: '#1a0e06',
  20: '#2e1a0a',
  30: '#47270f',
  40: '#623617',
  50: '#7d4620',
  60: '#9a582b',
  70: '#b86c38',
  80: '#d48247',
  90: '#e8975a',
  100: '#f0a96e',
  110: '#f5ba84',
  120: '#f8ca9b',
  130: '#fbd8b3',
  140: '#fde6cc',
  150: '#fef2e5',
  160: '#fff8f2'
}

const baseDark = createDarkTheme(cinnamonBrand)

export const cinnamonDarkTheme = {
  ...baseDark,

  // Backgrounds
  colorNeutralBackground1: '#1a1210',
  colorNeutralBackground2: '#221815',
  colorNeutralBackground3: '#2a1e1a',
  colorNeutralBackground4: '#33231e',
  colorNeutralBackground5: '#3d2a24',
  colorNeutralBackground6: '#47302a',

  // Surfaces
  colorNeutralBackgroundStatic: '#120d0b',
  colorNeutralBackgroundInverted: '#f5ba84',

  // Accents brand
  colorBrandBackground: '#d48247',
  colorBrandBackgroundHover: '#e8975a',
  colorBrandBackgroundPressed: '#b86c38',
  colorBrandBackgroundSelected: '#c97540',
  colorBrandForeground1: '#f0a96e',
  colorBrandForeground2: '#f5ba84',
  colorBrandForegroundLink: '#e8975a',
  colorBrandForegroundLinkHover: '#f0a96e',
  colorBrandStroke1: '#d48247',
  colorBrandStroke2: '#9a582b',

  // Foregrounds
  colorNeutralForeground1: '#f5ece6',
  colorNeutralForeground2: '#ddc9bf',
  colorNeutralForeground3: '#b8998e',
  colorNeutralForeground4: '#8a6a60',
  colorNeutralForegroundDisabled: '#5a3d36',

  // Strokes / borders
  colorNeutralStroke1: '#4a2f28',
  colorNeutralStroke2: '#3d2520',
  colorNeutralStroke3: '#2e1c18',
  colorNeutralStrokeAccessible: '#9a582b',

  // Shadows
  colorNeutralShadowAmbient: 'rgba(0,0,0,0.5)',
  colorNeutralShadowKey: 'rgba(0,0,0,0.6)',

  // Status
  colorStatusSuccessBackground1: '#1b2e1e',
  colorStatusSuccessForeground1: '#6fcf97',
  colorStatusWarningBackground1: '#2e2210',
  colorStatusWarningForeground1: '#f2994a',
  colorStatusDangerBackground1: '#2e1010',
  colorStatusDangerForeground1: '#eb5757',

  // Border radius
  borderRadiusSmall: '4px',
  borderRadiusMedium: '8px',
  borderRadiusLarge: '12px',
  borderRadiusXLarge: '16px',

  // Font
  fontFamilyBase: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif"
}
