import Constants from 'expo-constants';

/** App name comes from app.json, so the home screen and the in-app title always match. Change it with scripts/set-branding.sh. */
export const APP_NAME: string = Constants.expoConfig?.name ?? 'Music';

/**
 * Icons the user can switch between (Settings → App icon). `id: null` is the built-in default icon (assets/icon.png);
 * the others must also be listed under the expo-alternate-app-icons plugin in app.json, with the same name.
 */
export const APP_ICONS = [
  { id: null, label: 'Portrait', source: require('../assets/icons/portrait.png') },
  { id: 'Tiger', label: 'Tiger', source: require('../assets/icons/tiger.png') },
] as const;
