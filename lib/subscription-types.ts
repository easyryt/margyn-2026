export type SubscriptionPlan = { id: string; name: string; tokenLimit: number; imageLimit: number; storageLimitBytes: number; durationDays: number; pricePaise: number | null; offers: string[]; published: boolean };
export type AdminPlanPurchase = { id: string; phone: string; name: string; status: string; createdAt: number; paymentId: string | null; plan: { name: string; pricePaise: number | null } };
export type SubscriptionSettings = { defaultTokenLimit: number; defaultImageLimit: number; defaultStorageLimitBytes: number; plans: SubscriptionPlan[] };
export type Subscription = {
  planId: string | null;
  planName: string;
  status: "active" | "paused" | "cancelled" | "expired";
  tokenLimit: number;
  imageLimit: number;
  usedImages: number;
  remainingImages: number;
  storageLimitBytes: number;
  storageUsedBytes: number;
  storageSyncedAt: number | null;
  expiresAt: number | null;
  periodStartedAt: number;
  usedTokens: number;
  inputTokens: number;
  outputTokens: number;
  remainingTokens: number;
  unreportedCalls: number;
  revision: number;
  canUseAi: boolean;
};
export type SubscriptionAccount = {
  id: string; phone: string; name: string; role: "admin" | "customer"; subscription: Subscription;
};
