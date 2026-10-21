import { createNavigationContainerRef } from '@react-navigation/native';

/** Lets non-screen code (mini player, sheets) navigate. */
export const navRef = createNavigationContainerRef<any>();
export const navigate = (name: string, params?: object) => navRef.isReady() && navRef.navigate(name, params);

/** From the Now Playing modal: close it, then open a screen once the dismiss animation is done (navigating mid-dismiss is dropped). */
export function openAfterDismiss(name: string, params?: object) {
  const open = (retry: boolean) => {
    navigate(name, params);
    if (retry) setTimeout(() => { if (navRef.isReady() && navRef.getCurrentRoute()?.name !== name) open(false); }, 400);
  };
  setTimeout(() => open(true), 500);
}
