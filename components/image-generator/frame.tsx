import Link from "next/link";
import "@/app/image-generator.css";
import {
  IMAGE_GENERATOR_MODES,
  type ImageGeneratorMode,
} from "@/lib/image-generator/modes";
export default function ImageStudioFrame({
  mode,
  children,
}: {
  mode: ImageGeneratorMode;
  children: React.ReactNode;
}) {
  return (
    <section className="image-studio" aria-label="Image Generator studio">
      <div className="dashboard-content">
        <nav className="image-studio-nav" aria-label="Image generator modes">
          {IMAGE_GENERATOR_MODES.map((item) => (
            <Link
              key={item.id}
              href={item.path}
              aria-current={item.id === mode ? "page" : undefined}
            >
              {item.label}
              {item.local && <small>Local</small>}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </section>
  );
}
