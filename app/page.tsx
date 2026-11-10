/* eslint-disable @next/next/no-img-element */
import { currentUser, listProducts, getPromoBanner } from "@/lib/api";
import Link from "next/link";
import Header from "@/components/header";
import Storefront from "@/components/storefront";
import Tools from "@/components/tools";
import PromoBanner from "@/components/promo-banner";
import { Icon, MargynLogo } from "@/components/icons";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function Home() {
  const [user, products, promoBanner] = await Promise.all([
    currentUser(),
    listProducts(),
    getPromoBanner(),
  ]);
  return (
    <div className="margyn-landing">
      <Header user={user} />
      <main>
        <div className="landing-hero-stage">
          <section
            className="landing-hero landing-container"
            aria-labelledby="landing-title"
          >
            <div className="landing-hero-copy">
              <span className="landing-kicker">
                <span /> SMALL DETAILS. BIG POSSIBILITIES.
              </span>
              <h1 id="landing-title">
                Packaging for
                <br />
                your next
                <br />
                <em>big thing.</em>
              </h1>
              <p>
                Boxes, mailers, labels and more. Everything you need to send
                your best work out into the world.
              </p>
              <div className="landing-hero-actions">
                <a className="landing-button" href="#catalog">
                  Shop packaging <Icon name="arrow" size={19} />
                </a>
                <a className="landing-text-link" href="#categories">
                  Find your fit <Icon name="arrow" size={17} />
                </a>
              </div>
              <div className="landing-hero-note">
                <span className="hero-note-icon">
                  <Icon name="check" size={14} />
                </span>{" "}
                From your first order to your next thousand.
              </div>
            </div>
            <figure className="landing-studio">
              <div className="studio-topline">
                <span>THOUGHTFULLY CHOSEN. BEAUTIFULLY PACKED.</span>
                <Icon name="spark" size={23} />
              </div>
              <img
                className="studio-image"
                src="/images/margyn-studio-hero.png"
                alt="Studio arrangement of kraft shipping boxes, a blue mailer, thermal labels and packing tape"
                fetchPriority="high"
                width={1312}
                height={1199}
              />
              <div className="studio-floating-card" aria-hidden="true">
                <span>
                  <Icon name="box" size={23} />
                </span>
                <div>
                  <strong>Ready. Set. Dispatch.</strong>
                  <small>Good packaging. Great possibilities.</small>
                </div>
                <Icon name="arrow" size={19} />
              </div>
              <div className="studio-seal" aria-hidden="true">
                <span>READY FOR</span>
                <Icon name="arrow" size={27} />
                <span>WHAT’S NEXT</span>
              </div>
              <figcaption>
                <span>THE EVERYDAY ESSENTIALS</span>
                <span>01 — MARGYN COLLECTION</span>
              </figcaption>
            </figure>
          </section>
        </div>
        <div className="landing-values-band">
          <div className="landing-values landing-container">
            {[
              {
                icon: "box",
                title: "The right fit for every order",
                text: "Everyday packaging, all together.",
              },
              {
                icon: "layers",
                title: "Your scale. Your pack size.",
                text: "Small beginnings to bigger ambitions.",
              },
              {
                icon: "tag",
                title: "More quantity. More possibility.",
                text: "Explore wholesale pricing tiers.",
              },
            ].map((item) => (
              <div key={item.title}>
                <span className="landing-value-icon">
                  <Icon name={item.icon} size={22} />
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Storefront products={products} />
        <section className="landing-story landing-container" id="why-margyn">
          <div className="story-heading">
            <span className="landing-section-label">A LITTLE MORE MARGYN.</span>
            <h2>
              Less searching.
              <br />
              More <em>getting it done.</em>
            </h2>
            <p>
              Running a business comes with a long list. Finding your packaging
              shouldn’t make it longer.
            </p>
            <a className="landing-text-link" href="#catalog">
              Meet your new essentials <Icon name="arrow" size={18} />
            </a>
          </div>
          <div className="landing-story-steps">
            {[
              {
                number: "01",
                icon: "search",
                title: "Find your perfect fit",
                text: "Explore sizes, materials and pack quantities to find what works for your products.",
              },
              {
                number: "02",
                icon: "calculator",
                title: "Know what you’re buying",
                text: "See wholesale price tiers and review your full order total before you submit.",
              },
              {
                number: "03",
                icon: "box",
                title: "Get back to building",
                text: "Keep your packaging essentials and your next order together in one place.",
              },
            ].map((item) => (
              <div className="landing-story-step" key={item.number}>
                <span className="step-number">{item.number}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
                <Icon name={item.icon} size={23} />
              </div>
            ))}
          </div>
        </section>
        <Tools />
        <PromoBanner settings={promoBanner} />
      </main>
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-main">
            <div>
              <Link href="/" aria-label="Margyn home">
                <MargynLogo />
              </Link>
              <p>
                For the things you make.
                <br />
                And the business you’re making.
              </p>
              <span className="footer-made">
                <span /> Made for your next chapter.
              </span>
            </div>
            <div className="landing-footer-links">
              <div>
                <h3>Explore</h3>
                <a href="#catalog">Shop packaging</a>
                <Link href="/categories">Browse categories</Link>
                <Link href="/tools">Seller toolkit</Link>
              </div>
              <div>
                <h3>Your Margyn</h3>
                <Link href="/profile">Your account</Link>
                <Link href="/orders">Your orders</Link>
                <Link href="/cart">Your cart</Link>
              </div>
              <div>
                <h3>Behind the scenes</h3>
                <a href="#why-margyn">Why Margyn</a>
                <Link href="/admin">Store admin</Link>
                <a href="#catalog">Find your next essential ↗</a>
              </div>
            </div>
          </div>
          <div className="landing-footer-bottom">
            <span>
              © {new Date().getFullYear()} Margyn. All rights reserved.
            </span>
            <span>
              GOOD PACKAGING. GREAT POSSIBILITIES.{" "}
              <Icon name="spark" size={17} />
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
