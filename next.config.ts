import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "*.wikimedia.org" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // Legacy Portuguese paths → English equivalents (permanent 301).
  // Each pair covers both locale prefixes so old bookmarks keep working.
  async redirects() {
    const legacy = [
      ["/comparar", "/compare"],
      ["/financiamento", "/financing"],
      ["/marcas", "/brands"],
      ["/carro", "/car"],
      ["/categoria", "/category"],
      ["/mais-vendidos", "/best-sellers"],
    ] as const;
    return legacy.flatMap(([from, to]) => [
      { source: `/pt-BR${from}/:path*`, destination: `/pt-BR${to}/:path*`, permanent: true },
      { source: `/en-US${from}/:path*`, destination: `/en-US${to}/:path*`, permanent: true },
    ]);
  },
};

export default withNextIntl(nextConfig);
