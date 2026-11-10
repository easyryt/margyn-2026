import {
  currentUser,
  listProducts,
  listUsers,
  getAdminAnnouncement,
  getAdminPromoBanner,
} from "@/lib/api";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminPanel from "@/components/admin-panel";
import { Icon, Logo } from "@/components/icons";
import Header from "@/components/header";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = {
  title: "Admin panel",
  robots: { index: false, follow: false },
};
export default async function Admin() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin")
    return (
      <>
        <Header user={user} />
        <main className="access-page">
          <Logo />
          <span className="access-icon">
            <Icon name="shield" size={35} />
          </span>
          <h1>Admin access required</h1>
          <p>
            You’re signed in as {user.phone}. This account does not have
            administrator access.
          </p>
          <Link href="/" className="button button-dark">
            Back to marketplace <Icon name="arrow" size={18} />
          </Link>
        </main>
      </>
    );
  return (
    <AdminPanel
      user={user}
      initialProducts={await listProducts(true)}
      initialUsers={await listUsers()}
      initialAnnouncement={await getAdminAnnouncement()}
      initialPromoBanner={await getAdminPromoBanner()}
    />
  );
}
