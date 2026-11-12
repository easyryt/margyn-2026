"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import "@/app/image-generator.css";
import {
  IMAGE_GENERATOR_MODES,
  IMAGE_GENERATOR_ROOT,
  type ImageGeneratorMode,
} from "@/lib/image-generator/modes";

const sections = [{ id: "start", label: "Start", path: IMAGE_GENERATOR_ROOT }, ...IMAGE_GENERATOR_MODES];

export default function ImageStudioFrame({
  mode,
  children,
}: {
  mode: ImageGeneratorMode | "start";
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <section className="image-studio" aria-label="Image Generator studio">
      <div className="dashboard-content">
        <nav className="image-studio-nav" aria-label="Image generator modes">
          {sections.map((item) => (
            <Link
              key={item.id}
              href={item.path}
              aria-current={item.id === mode ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <label className="image-studio-mobile-nav">
          Image tool
          <select
            aria-label="Image tool"
            value={sections.find((item) => item.id === mode)?.path}
            onChange={(event) => router.push(event.target.value)}
          >
            {sections.map((item) => <option key={item.id} value={item.path}>{item.label}</option>)}
          </select>
        </label>
        {children}
      </div>
    </section>
  );
}
