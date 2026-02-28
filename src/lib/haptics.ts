/**
 * Haptic feedback utilities for mobile interactions.
 * Uses navigator.vibrate when available (Android, some PWA).
 */

/** Light tap — button press, toggle, selection */
export const hapticLight = () => {
  if (navigator.vibrate) navigator.vibrate(10);
};

/** Medium tap — confirm action, swipe complete */
export const hapticMedium = () => {
  if (navigator.vibrate) navigator.vibrate(20);
};

/** Strong tap — important validation, error */
export const hapticStrong = () => {
  if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
};

/** Success pattern — double pulse */
export const hapticSuccess = () => {
  if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
};
