import { safeMarketplaceReturn } from "@/lib/marketplace-routes";
import { safeInventoryReturn } from "@/lib/inventory-tool-routes";
import { safeListingReturn } from "@/lib/listing-tool-routes";
import { TOOL_LOGIN_PATHS } from "@/lib/seller-tools";
import { currentUser } from "@/lib/api";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon, Logo } from "@/components/icons";
import LoginForm from "@/components/login-form";
export const dynamic = "force-dynamic";
export const metadata = { title: "Login" };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = [
    "/admin",
    "/cart",
    "/checkout",
    "/profile",
    "/tools/subscription",
    ...TOOL_LOGIN_PATHS,
  ].includes(params.next || "") || safeListingReturn(params.next || "") || safeInventoryReturn(params.next || "") || safeMarketplaceReturn(params.next || "")
    ? params.next!
    : "/";
  if (await currentUser()) redirect(next);
  return (
    <main className="login-page">
      <aside className="login-story">
        <Link href="/">
          <Logo light />
        </Link>
        <div className="login-story-content">
          <span className="eyebrow">PACKAGING FOR WHAT’S NEXT</span>
          <h2>
            For the dreamers.
            <br />
            The doers.
            <br />
            The <span>dispatchers.</span>
          </h2>
          <p>
            Everything your business needs to make
            <br />a great first impression, all in one place.
          </p>
          <div className="login-box-art">
            <Icon name="box" size={140} />
            <span>
              Good things
              <br />
              are on their way.
            </span>
            <i>↗</i>
          </div>
        </div>
        <div className="story-bottom">
          <span>PACK. PROTECT. SHIP.</span>
          <Icon name="spark" size={25} />
        </div>
      </aside>
      <section className="login-main">
        <Link href="/" className="back-link">
          ← Back to marketplace
        </Link>
        <div className="login-mobile-brand">
          <Logo />
        </div>
        <LoginForm next={next} />
        <div className="login-page-footer">
          <span>© {new Date().getFullYear()} MARGYN</span>
          <span>Made for your business.</span>
        </div>
      </section>
    </main>
  );
}
