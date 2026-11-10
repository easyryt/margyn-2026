import { currentUser, listOrders } from "@/lib/api";
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/header";
import { money } from "@/lib/pricing.mjs";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = {
  title: "Your orders",
  robots: { index: false, follow: false },
};
export default async function Orders() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const orders = await listOrders();
  return (
    <>
      <Header user={user} />
      <main className="commerce">
        <div className="shop-container customer-orders">
          <div className="cart-page-heading">
            <h1>Your orders</h1>
            <p>Order requests and their latest status.</p>
          </div>
          {orders.length ? (
            orders.map((order) => (
              <Link
                className="order-box customer-order-card"
                key={order.id}
                href={`/orders/${order.id}`}
              >
                <div>
                  <strong>{order.orderNumber}</strong>
                  <p>
                    {new Intl.DateTimeFormat("en-IN", {
                      dateStyle: "medium",
                      timeZone: "Asia/Kolkata",
                    }).format(order.createdAt)}{" "}
                    · {order.items.length} items
                  </p>
                </div>
                <span className="order-status">{order.status}</span>
                <div>
                  <strong>{money(order.total)}</strong>
                  <p>Unpaid · payment pending</p>
                </div>
                <span>View details →</span>
              </Link>
            ))
          ) : (
            <div className="empty-cart">
              <h2>Your next dispatch starts here.</h2>
              <p>Submit an order request and track it from this page.</p>
              <Link href="/#catalog" className="button button-green">
                Explore products
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
