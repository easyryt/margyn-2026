export type AiPlan = { id: string; name: string; pricePaise: number | null; durationDays: number; imageLimit: number; storageLimitBytes: number; offers: string[] };
export type AiSubscription = { planId: string | null; planName: string; status: "active" | "paused" | "cancelled" | "expired"; expiresAt: number | null; canUseAi: boolean; requiresReview: boolean; imageLimit: number; usedImages: number; remainingImages: number; canGenerateImages: boolean; storageLimitBytes: number; storageUsedBytes: number; storageSyncedAt: number | null; offers: string[] };
export type AiPurchase = { id: string; plan: AiPlan; status: "creating" | "pending" | "paid" | "active" | "failed"; createdAt: number; activatedAt: number | null; paymentId: string | null; mode: "test" };
export type TestCheckout = { keyId: string; orderId: string; amount: number; currency: "INR"; mode: "test" };
export type CheckoutResponse = { purchase: AiPurchase; checkout: TestCheckout | null };
