import { currentUser, getCart } from "@/lib/api";
import Header from "@/components/header";
import CartPage from "@/components/cart-page";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = { title: "Your cart" };
export default async function Cart() {
  const user = await currentUser();
  const cart = await getCart();
  return (
    <>
      <Header user={user} />
      <CartPage initialCart={cart} />
    </>
  );
}
