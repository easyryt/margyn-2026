import Link from "next/link";
import { Logo } from "@/components/icons";
export default function NotFound() {
  return (
    <main className="access-page">
      <Logo />
      <h1>This one got lost in transit.</h1>
      <p>The page you’re looking for doesn’t exist.</p>
      <Link href="/" className="button button-orange">
        Back to marketplace →
      </Link>
    </main>
  );
}
