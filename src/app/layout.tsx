import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted: these Mozilla brand fonts are absent from Next 16's Google
// Fonts metrics map, so next/font/google warns even with adjustFontFallback
// disabled. Local fonts compute their own metrics from the file.
const mozillaText = localFont({
  src: "../fonts/mozilla-text-latin-400.woff2",
  variable: "--font-mozilla-text",
  display: "swap",
});

const mozillaHeadline = localFont({
  src: "../fonts/mozilla-headline-latin-400.woff2",
  variable: "--font-mozilla-headline",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Kimeru Auto — Compare e decida seu próximo carro",
    template: "%s | Kimeru Auto",
  },
  description:
    "Compare carros do mercado brasileiro: especificações técnicas, preços FIPE, financiamento com CET e dados de vendas FENABRAVE.",
  applicationName: "Kimeru Auto",
  keywords: ["comparar carros", "tabela FIPE", "financiamento", "CET", "carros Brasil"],
  openGraph: {
    type: "website",
    siteName: "Kimeru Auto",
    title: "Kimeru Auto — Compare e decida seu próximo carro",
    description:
      "Compare carros do mercado brasileiro: especificações técnicas, preços FIPE, financiamento com CET e dados de vendas.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: browser extensions (e.g. LanguageTool) inject
    // attributes like data-lt-installed onto <html>, causing hydration mismatches.
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${mozillaText.variable} ${mozillaHeadline.variable} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
