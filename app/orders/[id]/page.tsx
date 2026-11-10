import { currentUser, getOrder } from "@/lib/api";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Header from "@/components/header";
import { Icon } from "@/components/icons";
import { money } from "@/lib/pricing.mjs";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = {
  title: "Your order request",
  robots: { index: false, follow: false },
};
export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  return (
    <>
      <Header user={user} />
      <main className="commerce order-confirmation">
        <div className="shop-container">
          <span className="confirmation-icon">
            <Icon name="check" size={35} />
          </span>
          <p className="eyebrow">{order.orderNumber}</p>
          <h1>Your order request is saved.</h1>
          <p>The store will confirm your request and arrange payment.</p>
          <div className="confirmation-grid">
            <section className="order-box">
              <h2>Order details</h2>
              <dl className="summary-lines">
                <div>
                  <dt>Status</dt>
                  <dd className="order-status">{order.status}</dd>
                </div>
                <div>
                  <dt>Payment</dt>
                  <dd>Unpaid · awaiting arrangements</dd>
                </div>
                <div>
                  <dt>Subtotal</dt>
                  <dd>{money(order.subtotal)}</dd>
                </div>
                <div>
                  <dt>Discount</dt>
                  <dd>−{money(order.discount)}</dd>
                </div>
                <div>
                  <dt>GST</dt>
                  <dd>{money(order.tax)}</dd>
                </div>
                <div>
                  <dt>Shipping</dt>
                  <dd>{money(order.shipping)}</dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd>
                    <strong>{money(order.total)}</strong>
                  </dd>
                </div>
              </dl>
              {order.items.map(
                (item: {
                  id: string;
                  name: string;
                  size: string;
                  quantity: number;
                }) => (
                  <p className="confirmation-product" key={item.id}>
                    {item.name}
                    <small>
                      Size {item.size} · {item.quantity} CTN
                    </small>
                  </p>
                ),
              )}
            </section>
            <section className="order-box">
              <h2>Shipping address</h2>
              <p className="confirmation-address">
                <strong>{order.address.name}</strong>
                <br />
                {order.address.line1}
                <br />
                {order.address.line2 && (
                  <>
                    {order.address.line2}
                    <br />
                  </>
                )}
                {order.address.city}, {order.address.state} –{" "}
                {order.address.pincode}
                <br />
                {order.address.phone}
              </p>
              <p className="summary-note">
                Keep your order number for reference.
              </p>
            </section>
          </div>
          <Link href="/#catalog" className="button button-green">
            Continue shopping <Icon name="arrow" size={18} />
          </Link>
        </div>
      </main>
    </>
  );
}
