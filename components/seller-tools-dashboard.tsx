import Link from "next/link";
import type { User } from "@/lib/types";
import { SELLER_TOOLS, toolPath, type SellerTool } from "@/lib/seller-tools";
import { Icon } from "./icons";
export function SellerToolsDashboard({ user }: { user: User }) {
  return (
    <main className="tools-overview">
      <header className="tools-page-heading">
        <div>
          <span className="tools-eyebrow">YOUR SELLER WORKSPACE</span>
          <h1>Dashboard</h1>
          <p>
            {user.name ? "Welcome back, " + user.name + "." : "Welcome back."}{" "}
            Let’s make room for a productive day.
          </p>
        </div>
        <span className="tools-account-status">
          <Icon name="shield" size={14} /> Account verified
        </span>
      </header>
      <section className="tools-welcome-panel">
        <div>
          <span className="tools-live-badge">
            <span /> IMAGE GENERATOR IS LIVE
          </span>
          <h2>
            Your next great product image
            <br />
            starts here.
          </h2>
          <p>
            Create product images, compose backgrounds, and refine your
            photos—all in one studio.
          </p>
          <Link href="/tools/image-generator" className="tools-primary-button">
            Open Image Generator <Icon name="arrow" size={16} />
          </Link>
        </div>
        <div className="tools-welcome-art" aria-hidden="true">
          <div>
            <Icon name="layers" size={46} />
            <span>CREATE. REFINE. SHIP.</span>
            <i />
            <i />
            <i />
          </div>
          <span>
            <Icon name="check" size={13} /> Ready for your next dispatch.
          </span>
        </div>
      </section>
      <section
        className="tools-overview-metrics"
        aria-label="Workspace overview"
      >
        <div>
          <span className="tools-metric-icon">
            <Icon name="grid" size={18} />
          </span>
          <span>
            <strong>{String(SELLER_TOOLS.length).padStart(2, "0")}</strong>
            <small>Tool workspaces</small>
          </span>
        </div>
        <div>
          <span className="tools-metric-icon teal">
            <Icon name="check" size={18} />
          </span>
          <span>
            <strong>
              {String(
                SELLER_TOOLS.filter((tool) => tool.available).length,
              ).padStart(2, "0")}
            </strong>
            <small>Available now</small>
          </span>
        </div>
        <div>
          <span className="tools-metric-icon violet">
            <Icon name="spark" size={18} />
          </span>
          <span>
            <strong>
              {String(
                SELLER_TOOLS.filter((tool) => !tool.available).length,
              ).padStart(2, "0")}
            </strong>
            <small>Coming next</small>
          </span>
        </div>
      </section>
      <section className="tools-collection">
        <div className="tools-collection-heading">
          <h2>Your tools</h2>
          <span>A place for every part of your workday.</span>
        </div>
        <div className="tools-card-grid">
          {SELLER_TOOLS.map((tool) => (
            <article
              className={"seller-tool-card tools-tone-" + tool.color}
              key={tool.id}
            >
              <div className="tools-card-heading">
                <span className="tools-card-icon">
                  <Icon name={tool.icon} size={24} />
                </span>
                <span
                  className={
                    tool.available ? "tools-card-live" : "tools-card-soon"
                  }
                >
                  {tool.available ? "Available" : "Coming soon"}
                </span>
              </div>
              <h3>{tool.name}</h3>
              <p>{tool.description}</p>
              <Link href={toolPath(tool.id)} aria-label={"Open " + tool.name}>
                {tool.available ? "Open tool" : "View workspace"}
                <Icon name="arrow" size={16} />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
export function SellerToolWorkspace({ tool }: { tool: SellerTool }) {
  return (
    <main className={"tools-placeholder tools-tone-" + tool.color}>
      <header className="tools-page-heading">
        <div>
          <span className="tools-eyebrow">{tool.category} / MARGYN TOOLS</span>
          <h1>{tool.name}</h1>
          <p>{tool.description}</p>
        </div>
      </header>
      <section
        className="tools-placeholder-canvas"
        aria-label={tool.name + " workspace preview"}
      >
        <span className="tools-placeholder-icon">
          <Icon name={tool.icon} size={44} />
        </span>
        <span className="tools-card-soon">COMING SOON</span>
        <h2>A space for what’s next.</h2>
        <p>
          Your {tool.name} workspace is here. The tool’s features will be added
          in the next step.
        </p>
        <Link href="/tools" className="tools-primary-button">
          Back to dashboard <Icon name="arrow" size={16} />
        </Link>
      </section>
    </main>
  );
}
