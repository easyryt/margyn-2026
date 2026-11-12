import Link from "next/link";
import { Icon } from "@/components/icons";
import { IMAGE_GENERATOR_MODES } from "@/lib/image-generator/modes";

const toolCopy = {
  covers: { icon: "phone", description: "Turn a phone cover photo into product images for your listings." },
  charms: { icon: "spark", description: "Upload a cover and a charm to show them together." },
  "charm-packs": { icon: "box", description: "Show multiple pieces in a pack from one product photo." },
  backgrounds: { icon: "layers", description: "Place a transparent PNG on one or more backgrounds." },
  enhance: { icon: "sliders", description: "Adjust lighting, sharpness, and export size on your device." },
};

const groups = [
  { title: "Generate images", local: false },
  { title: "Edit images on your device", local: true },
];

export default function ImageGeneratorHome() {
  return (
    <div className="image-tool-home">
      <h1>Image Generator</h1>
      {groups.map((group) => (
        <section key={group.title} aria-labelledby={group.local ? "image-edit-tools" : "image-generation-tools"}>
          <h2 id={group.local ? "image-edit-tools" : "image-generation-tools"}>{group.title}</h2>
          <div className="image-tool-grid" data-local={group.local}>
            {IMAGE_GENERATOR_MODES.filter((mode) => mode.local === group.local).map((mode) => {
              const { icon, description } = toolCopy[mode.id];
              return (
                <Link key={mode.id} className="image-tool-card" href={mode.path}>
                  <span className="image-tool-icon"><Icon name={icon} size={21} /></span>
                  <span className="image-tool-copy"><strong>{mode.label}</strong><span>{description}</span></span>
                  <Icon name="arrow" size={18} className="image-tool-arrow" />
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
