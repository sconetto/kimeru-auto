import Image from "next/image";

// Logos whose identity is carried by color (multiple hues), not just the
// transparent silhouette — monochrome-white on dark would collapse them into
// featureless shapes (BMW's quadrants, Subaru's stars, Denza's mark).
const COLOR_LOGO_SLUGS = new Set([
  "bmw",
  "chevrolet",
  "denza",
  "fiat",
  "gac",
  "mitsubishi",
  "seres",
  "subaru",
  "suzuki",
]);

function logoSlug(logoUrl: string): string {
  return (logoUrl.split("/").pop() ?? "").replace(/\.png$/i, "");
}

/** Brand logo with a transparent background, falling back to the initial. */
export function BrandLogo({
  logoUrl,
  name,
  size = 48,
  className = "",
}: {
  logoUrl: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  if (logoUrl) {
    const invertOnDark = !COLOR_LOGO_SLUGS.has(logoSlug(logoUrl));
    return (
      <Image
        src={logoUrl}
        alt={`Logo ${name}`}
        width={size}
        height={size}
        className={`object-contain ${invertOnDark ? "dark:brightness-0 dark:invert" : ""} ${className}`}
        unoptimized
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300 ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {name.charAt(0)}
    </div>
  );
}
