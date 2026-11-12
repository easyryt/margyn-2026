export const IMAGE_GENERATOR_ROOT = "/tools/image-generator";

export const IMAGE_GENERATOR_MODES = [
  {
    id: "covers",
    label: "Phone covers",
    path: IMAGE_GENERATOR_ROOT + "/covers",
    local: false,
  },
  {
    id: "charms",
    label: "Cover & charm",
    path: IMAGE_GENERATOR_ROOT + "/charms",
    local: false,
  },
  {
    id: "charm-packs",
    label: "Charm packs",
    path: IMAGE_GENERATOR_ROOT + "/charm-packs",
    local: false,
  },
  {
    id: "backgrounds",
    label: "Backgrounds",
    path: IMAGE_GENERATOR_ROOT + "/backgrounds",
    local: true,
  },
  {
    id: "enhance",
    label: "Image enhancer",
    path: IMAGE_GENERATOR_ROOT + "/enhance",
    local: true,
  },
] as const;
export type ImageGeneratorMode = (typeof IMAGE_GENERATOR_MODES)[number]["id"];
