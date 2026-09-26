/**
 * Local follow-up reminders. When a claim is marked Sent, one reminder is
 * scheduled for 14 days later (10:00 local). Nothing is sent to a server.
 */
import * as Notifications from 'expo-notifications';
import type { SavedClaim } from '@/state/claims';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export const FOLLOW_UP_DAYS = 14;

async function ensurePermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

/** Schedules the day-14 reminder. Returns the notification id, or undefined if not allowed. */
export async function scheduleFollowUp(claim: SavedClaim, sentOn: string): Promise<string | undefined> {
  if (!(await ensurePermission())) return undefined;
  const when = new Date(`${sentOn}T10:00:00`);
  when.setDate(when.getDate() + FOLLOW_UP_DAYS);
  if (when.getTime() <= Date.now()) return undefined;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `Any reply from ${claim.facts.operatingCarrier.name}?`,
        body: `It's been 14 days since your ${claim.facts.flightNumber} claim. Your follow-up letter is ready in RefundDrop.`,
        data: { claimId: claim.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });
  } catch {
    return undefined;
  }
}

export async function cancelReminder(id: string | undefined): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // already fired or not available
  }
}
