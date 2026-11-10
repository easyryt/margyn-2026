import { redirect } from "next/navigation";
import { currentUser } from "./api";

// Check the session on every dashboard/workspace request, including direct URLs.
export async function requireToolUser(path: string) {
  const user = await currentUser();
  if (!user) redirect("/login?next=" + encodeURIComponent(path));
  return user;
}
