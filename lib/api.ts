import { cookies } from "next/headers";
import type {
  AnnouncementSettings,
  PromoBannerSettings,
  Cart,
  Order,
  Product,
  User,
  Profile,
  IndianState,
} from "./types";
// Frontend data access only. Business logic and credentials live in the separate Express project.
async function apiGet<T>(path: string): Promise<T> {
  const origin = (process.env.BACKEND_URL || "http://127.0.0.1:4000").replace(
    /\/$/,
    "",
  );
  const response = await fetch(`${origin}/api${path}`, {
    cache: "no-store",
    headers: { Cookie: (await cookies()).toString() },
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(
      data.error || "The Margyn API could not load this page.",
    ) as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return data;
}
export async function currentUser(): Promise<User | null> {
  return (await apiGet<{ user: User | null }>("/auth/me")).user;
}
export async function listProducts(admin = false): Promise<Product[]> {
  return (
    await apiGet<{ products: Product[] }>(
      admin ? "/admin/products" : "/products",
    )
  ).products;
}
export async function getProduct(id: string): Promise<Product | null> {
  try {
    return (
      await apiGet<{ product: Product }>(`/products/${encodeURIComponent(id)}`)
    ).product;
  } catch (error) {
    if ((error as Error & { status?: number }).status === 404) return null;
    throw error;
  }
}
export async function listUsers(): Promise<User[]> {
  return (await apiGet<{ users: User[] }>("/admin/users")).users;
}
export async function getCart(): Promise<Cart> {
  return (await apiGet<{ cart: Cart }>("/cart")).cart;
}
export async function listOrders(): Promise<Order[]> {
  return (await apiGet<{ orders: Order[] }>("/orders/mine")).orders;
}
export async function getOrder(id: string): Promise<Order | null> {
  try {
    return (await apiGet<{ order: Order }>(`/orders/${encodeURIComponent(id)}`))
      .order;
  } catch (error) {
    if ((error as Error & { status?: number }).status === 404) return null;
    throw error;
  }
}

export async function getAnnouncement(): Promise<AnnouncementSettings | null> {
  return (
    await apiGet<{ announcement: AnnouncementSettings | null }>(
      "/site/announcement",
    )
  ).announcement;
}
export async function getAdminAnnouncement(): Promise<AnnouncementSettings> {
  return (
    await apiGet<{ announcement: AnnouncementSettings }>("/admin/announcement")
  ).announcement;
}

export async function getPromoBanner(): Promise<PromoBannerSettings | null> {
  return (
    await apiGet<{ banner: PromoBannerSettings | null }>("/site/promo-banner")
  ).banner;
}
export async function getAdminPromoBanner(): Promise<PromoBannerSettings> {
  return (await apiGet<{ banner: PromoBannerSettings }>("/admin/promo-banner"))
    .banner;
}

export async function getProfile(): Promise<Profile> {
  return (await apiGet<{ profile: Profile }>("/profile")).profile;
}

export async function getIndianStates(): Promise<IndianState[]> {
  return (await apiGet<{ states: IndianState[] }>("/locations/states")).states;
}
