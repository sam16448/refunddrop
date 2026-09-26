import { router, type Href } from 'expo-router';

/** Close any flow screens on top of the tabs, then switch to a tab. */
export function goToTab(href: Href): void {
  if (router.canDismiss()) router.dismissAll();
  router.navigate(href);
}
