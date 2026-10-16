import { createNavigationContainerRef } from '@react-navigation/native';

/** Lets non-screen code (mini player, sheets) navigate. */
export const navRef = createNavigationContainerRef<any>();
export const navigate = (name: string, params?: object) => navRef.isReady() && navRef.navigate(name, params);
