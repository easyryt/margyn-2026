import Link from "next/link";
import { Suspense } from "react";
import type { Product, User } from "@/lib/types";
import Header from "./header";
import CategoryCatalog from "./category-catalog";
import { Icon, MargynLogo } from "./icons";
export default function CategoryShell({
  products,
  user,
  category,
}: {
  products: Product[];
  user: User | null;
  category?: string;
}) {
  return (
    <div className="margyn-landing category-page">
      <Header user={user} />
      <Suspense
        fallback={
          <main className="category-loading">
            Loading your packaging collection…
          </main>
        }
      >
        <CategoryCatalog
          key={category || "all"}
          products={products}
          category={category}
        />
      </Suspense>
      <footer className="category-footer">
        <Link href="/" aria-label="Margyn home">
          <MargynLogo />
        </Link>
        <span>For the things you make. And the business you’re making.</span>
        <Link href="/">
          Back to marketplace <Icon name="arrow" size={16} />
        </Link>
      </footer>
    </div>
  );
}
