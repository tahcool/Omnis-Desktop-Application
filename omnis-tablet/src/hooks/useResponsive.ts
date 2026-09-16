import { useWindowDimensions } from 'react-native';

/**
 * Shared responsive hook for adaptive layouts across all Omnis screens.
 *
 * Breakpoints:
 * - isPhone:      shortest side < 500px  (typical phones)
 * - isSmallPhone: shortest side < 380px  (compact phones like iPhone SE)
 * - isPortrait:   height > width
 *
 * Usage:
 *   const { isPhone, isPortrait, hp, fontSize, ... } = useResponsive();
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isPortrait  = height > width;
  const shortSide   = Math.min(width, height);
  const isPhone      = shortSide < 500;
  const isSmallPhone = shortSide < 380;

  return {
    // Raw values
    width,
    height,
    isPortrait,
    isPhone,
    isSmallPhone,

    // Adaptive horizontal padding
    hp: isPhone ? 12 : 24,

    // Adaptive font size scaler — keeps tablets unchanged
    fontSize: (base: number) => (isPhone ? Math.round(base * 0.88) : base),

    // Logo visibility & size
    showLogo: !isPhone,
    logoSize: isPhone
      ? { w: 160, h: 40 }
      : { w: 300, h: 75 },

    // Dashboard performance cards — stack vertically on phone-portrait
    cardColumns: isPhone && isPortrait ? 1 : 2,

    // Dashboard shortcut bar — 2 rows of 4 on phone-portrait, 1 row of 8 on tablet
    shortcutColumns: isPhone && isPortrait ? 4 : 8,

    // FAB position — center on phones, right on tablets
    fabStyle: isPhone
      ? { right: undefined as number | undefined, left: width / 2 - 32, alignSelf: 'center' as const }
      : { right: 32, left: undefined as number | undefined, alignSelf: undefined },

    // Drawer width — smaller on small phones
    drawerWidth: isSmallPhone ? 240 : 280,
  };
}
