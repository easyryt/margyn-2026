type PhoneQuad = readonly [readonly [number, number], readonly [number, number], readonly [number, number], readonly [number, number]];


export type CoverIdentity = { brief: string; visibleText: string[]; bounds: [number, number, number, number] | null; surfaceQuad: PhoneQuad | null; lowerArtwork: string; backMaterial: "clear" | "opaque" | "unknown" };


export type CoverReview = { designMatches: boolean | null; cameraMatches: boolean | null; fitMatches: boolean | null; edgeArtworkMatches: boolean | null; compositionMatches: boolean | null; issues: string[] };

export type CoverAssessment = CoverReview & { status: "passed" | "mismatch" | "needs-review" | "unavailable" };
