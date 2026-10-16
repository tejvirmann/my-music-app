import Constants from 'expo-constants';

/** Name and icon come from app.json / assets/icon.png, so the home screen and the in-app logo always match. Change them with scripts/set-branding.sh. */
export const APP_NAME: string = Constants.expoConfig?.name ?? 'My Music';
export const APP_ICON = require('../assets/icon.png');
