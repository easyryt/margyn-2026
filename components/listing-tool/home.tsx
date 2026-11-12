import Link from "next/link";
import { BarChart3, FileSpreadsheet } from "lucide-react";
import { Icon } from "@/components/icons";
import { LISTING_ROOT } from "@/lib/listing-tool-routes";
import RecentListings from "./recent-listings";

const actions = [
  {
    path: "/create-product",
    title: "New phone cover",
    description: "Choose a phone model and add its design, price, and photos.",
    icon: "phone",
  },
  {
    path: "/create-general-product",
    title: "New general product",
    description: "Create a listing for any product outside the phone cover catalog.",
    icon: "box",
  },
  {
    path: "/charms/batch",
    title: "New charm batch",
    description: "Add charm listings to saved phone cover designs.",
    icon: "spark",
  },
] as const;

export default function ListingHome() {
  return (
    <main className="listing-home">
      <header className="listing-home-heading">
        <div>
          <h1>Listing Tool</h1>
          <p>Create listings, find saved products, and export to Excel.</p>
        </div>
        <div className="listing-home-utilities">
          <Link href={LISTING_ROOT + "/import"}>
            <FileSpreadsheet size={16} aria-hidden="true" /> Import Excel
          </Link>
          <Link href={LISTING_ROOT + "/analytics"}>
            <BarChart3 size={16} aria-hidden="true" /> View analytics
          </Link>
        </div>
      </header>

      <section aria-labelledby="listing-create-heading">
        <h2 id="listing-create-heading" className="listing-home-section-title">Create a listing</h2>
        <div className="listing-action-grid">
          {actions.map(action => (
            <Link className="listing-action-card" key={action.path} href={LISTING_ROOT + action.path}>
              <span className="listing-action-icon"><Icon name={action.icon} size={21} /></span>
              <span className="listing-action-copy">
                <strong>{action.title}</strong>
                <span>{action.description}</span>
              </span>
              <Icon name="arrow" size={18} className="listing-action-arrow" />
            </Link>
          ))}
        </div>
      </section>

      <RecentListings />
    </main>
  );
}
