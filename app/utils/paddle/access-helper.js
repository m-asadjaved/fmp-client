export function hasActiveSubscription(sub) {
  if (!sub) return false;
  return sub.status === "active" || sub.status === "trialing";
}

export function getSubscriptionUiState(sub) {
  if (!sub) return "no-subscription";
  if (sub.scheduled_change_action) {
    return sub.status === "paused"
      ? "pause-scheduled"
      : "cancel-scheduled";
  }
  return sub.status; // 'active' | 'trialing' | 'paused' | 'canceled' | 'past_due'
}
