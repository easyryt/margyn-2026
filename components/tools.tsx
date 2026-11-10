import Link from "next/link";
import { SELLER_TOOLS, toolPath } from "@/lib/seller-tools";
import { Icon } from "./icons";
export default function Tools() {
  return (
    <section className="landing-toolkit" id="tools">
      <div className="landing-container">
        <div className="landing-section-heading">
          <div>
            <span className="landing-section-label">
              YOUR NEXT BUSINESS SIDEKICKS.
            </span>
            <h2>
              Good tools.
              <br />
              <em>Less busywork.</em>
            </h2>
          </div>
          <div className="landing-tools-intro">
            <p>
              Your seller workspaces, together in Margyn. All four tools are ready to use.
            </p>
            <Link href="/tools" className="landing-text-link">
              Explore your tools <Icon name="arrow" size={17} />
            </Link>
          </div>
        </div>
        <div className="landing-tool-grid">
          {SELLER_TOOLS.map((tool, index) => (
            <Link
              href={toolPath(tool.id)}
              className={"landing-tool tool-tone-" + index}
              key={tool.id}
              aria-label={"Explore " + tool.name}
            >
              <div className="tool-card-top">
                <span className="landing-tool-icon">
                  <Icon name={tool.icon} size={27} />
                </span>
                <span className="tool-soon-badge">
                  {tool.available ? "Available now" : "Coming soon"}
                </span>
              </div>
              <span className="tool-index">
                {String(index + 1).padStart(2, "0")} / {tool.category}
              </span>
              <h3>{tool.name}</h3>
              <p>{tool.description}</p>
              <span className="tool-preview">
                Open workspace <Icon name="arrow" size={18} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
