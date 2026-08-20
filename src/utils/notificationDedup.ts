// Chat messages reach the device through two independent paths:
//   1. FCM push (notificationService.onMessage → displayChatNotification)
//   2. notification_queue realtime INSERT (useRealtimeSubscription /
//      useNotificationQueue)
// Both paths add the message to the in-app bell list AND raise an OS
// notification. Without dedup, the user sees the same chat twice in both
// places (banner + list entry). The previous per-path "is this a chat row?"
// detection was brittle — when entity_type / event_code / subject didn't
// match the hard-coded patterns, the queue path still fired alongside FCM.
//
// This module replaces that with a single content-keyed claim: the first
// path to observe a (title, body) tuple within DEDUP_TTL_MS owns it and
// the other path silently drops the event. We key on content (not id)
// because FCM data and the notification_queue row carry different id
// shapes — title+body is the only field that's guaranteed identical
// across both deliveries.
//
// TTL is intentionally short so that a user genuinely re-sending the same
// short message after a few seconds is not suppressed. The two duplicate
// deliveries we've measured arrive within ~1.4s of each other, so 5s
// comfortably covers them while leaving room for a real repeat to ring.

const DEDUP_TTL_MS = 5_000;

const recentClaims: Map<string, number> = new Map();

function gc(now: number): void {
  if (recentClaims.size < 32) return;
  for (const [k, t] of recentClaims) {
    if (now - t > DEDUP_TTL_MS) recentClaims.delete(k);
  }
}

export function claimNotification(key: string): boolean {
  if (!key) return true;
  const now = Date.now();
  gc(now);
  const last = recentClaims.get(key);
  if (last != null && now - last <= DEDUP_TTL_MS) return false;
  recentClaims.set(key, now);
  return true;
}

export interface NotifKeyInput {
  title?: string | null;
  body?: string | null;
  // Accepted for call-site convenience and forward compatibility but
  // intentionally ignored — see module comment for why we key on content
  // only.
  entityType?: string | null;
  entityId?: string | number | null;
  chatId?: string | number | null;
  messageId?: string | number | null;
}

export function buildNotifKey(input: NotifKeyInput): string {
  const title = (input.title ?? '').trim().slice(0, 120);
  const body = (input.body ?? '').trim().slice(0, 240);
  return `${title}|${body}`;
}

export function _resetForTests(): void {
  recentClaims.clear();
}
