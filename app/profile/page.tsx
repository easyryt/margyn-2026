import { redirect } from "next/navigation";
import { currentUser, getProfile, getIndianStates } from "@/lib/api";
import Header from "@/components/header";
import ProfilePage from "@/components/profile-page";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = {
  title: "Your profile",
  robots: { index: false, follow: false },
};
export default async function Profile() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/profile");
  const [profile, states] = await Promise.all([
    getProfile(),
    getIndianStates(),
  ]);
  return (
    <div className="margyn-landing">
      <Header user={user} />
      <ProfilePage initialProfile={profile} states={states} />
    </div>
  );
}
