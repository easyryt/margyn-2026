import { currentUser, getCart, getProfile, getIndianStates } from "@/lib/api";
import Header from "@/components/header";
import Checkout from "@/components/checkout";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = { title: "Checkout" };
export default async function Page() {
  const user = await currentUser();
  const [cart, profile, states] = await Promise.all([
    getCart(),
    user ? getProfile() : Promise.resolve(null),
    getIndianStates(),
  ]);
  return (
    <>
      <Header user={user} />
      <Checkout
        cart={cart}
        user={user}
        states={states}
        savedAddresses={profile?.addresses || []}
      />
    </>
  );
}
