"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { LISTING_ROOT, validListingSegments } from "@/lib/listing-tool-routes";
import type { SavedGeneralProduct } from "./original/lib/general-products-api";

type PhoneProduct = {
  id: string;
  productName: string;
  models?: { model: string }[];
};

type Listing = {
  id: string;
  title: string;
  detail?: string;
  href: string;
};

type CatalogState = { listings?: Listing[]; failed?: boolean };

const PHONE_CATALOG = LISTING_ROOT + "/products";
const GENERAL_CATALOG = LISTING_ROOT + "/general-products";

async function loadCatalog<T>(path: string, signal: AbortSignal): Promise<T[]> {
  const response = await fetch("/api/tools/listing-tool" + path, {
    cache: "no-store",
    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
  });
  if (!response.ok) throw new Error("Could not load saved products");
  const data: { products?: T[] } = await response.json();
  if (!Array.isArray(data.products)) throw new Error("Invalid saved products response");
  return data.products;
}

export default function RecentListings() {
  const [phone, setPhone] = useState<CatalogState>({});
  const [general, setGeneral] = useState<CatalogState>({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function loadPhones() {
      try {
        const products = await loadCatalog<PhoneProduct>("/products?kind=parent&limit=3", signal);
        if (signal.aborted) return;
        setPhone({ listings: products.map(product => {
          const model = product.models?.[0]?.model;
          const hasModelCatalog = model && validListingSegments(["products", "model", model]);
          return {
            id: product.id,
            title: product.productName,
            detail: model,
            href: hasModelCatalog ? PHONE_CATALOG + "/model/" + encodeURIComponent(model) : PHONE_CATALOG,
          };
        }) });
      } catch {
        if (!signal.aborted) setPhone({ failed: true });
      }
    }

    async function loadGeneral() {
      try {
        const products = await loadCatalog<SavedGeneralProduct>("/general-products?limit=3", signal);
        if (signal.aborted) return;
        setGeneral({ listings: products.map(product => ({
          id: product.databaseId,
          title: product.draft.productName,
          detail: product.draft.category,
          href: GENERAL_CATALOG + "/" + encodeURIComponent(product.databaseId),
        })) });
      } catch {
        if (!signal.aborted) setGeneral({ failed: true });
      }
    }

    void loadPhones();
    void loadGeneral();
    return () => controller.abort();
  }, [attempt]);

  return (
    <section aria-labelledby="listing-recent-heading">
      <div className="listing-home-section-heading">
        <h2 id="listing-recent-heading" className="listing-home-section-title">Recently saved</h2>
        {(phone.failed || general.failed) && (
          <button className="listing-retry" type="button" onClick={() => {
            setPhone({});
            setGeneral({});
            setAttempt(count => count + 1);
          }}>Retry loading</button>
        )}
      </div>
      <div className="listing-recent-grid">
        <Catalog title="Phone covers" href={PHONE_CATALOG} state={phone} />
        <Catalog title="General products" href={GENERAL_CATALOG} state={general} />
      </div>
    </section>
  );
}

function Catalog({ title, href, state }: { title: string; href: string; state: CatalogState }) {
  let content;
  if (state.failed) content = <p role="status">Couldn’t load saved products.</p>;
  else if (!state.listings) content = <p role="status">Loading saved products…</p>;
  else if (!state.listings.length) content = <p>No products saved yet.</p>;
  else content = (
    <ul>
      {state.listings.map(listing => (
        <li key={listing.id}>
          <Link href={listing.href}>
            <span>
              <strong>{listing.title}</strong>
              {listing.detail && <small>{listing.detail}</small>}
            </span>
            <Icon name="arrow" size={15} />
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <section className="listing-recent-card" aria-label={`Recently saved ${title.toLowerCase()}`}>
      <header>
        <h3>{title}</h3>
        <Link href={href} aria-label={`Browse all ${title.toLowerCase()}`}>Browse all</Link>
      </header>
      {content}
    </section>
  );
}
