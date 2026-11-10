export const IMAGE_GENERATOR_MODES = [
  {
    id: "covers",
    label: "Phone covers",
    path: "/tools/image-generator",
    local: false,
  },
  {
    id: "charms",
    label: "Cover & charm",
    path: "/tools/image-generator/charms",
    local: false,
  },
  {
    id: "charm-packs",
    label: "Charm packs",
    path: "/tools/image-generator/charm-packs",
    local: false,
  },
  {
    id: "backgrounds",
    label: "Backgrounds",
    path: "/tools/image-generator/backgrounds",
    local: true,
  },
  {
    id: "enhance",
    label: "Image enhancer",
    path: "/tools/image-generator/enhance",
    local: true,
  },
] as const;
export type ImageGeneratorMode = (typeof IMAGE_GENERATOR_MODES)[number]["id"];
