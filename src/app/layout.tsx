import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Mozilla_Headline, Mozilla_Text } from "next/font/google";
import "./globals.css";

const mozillaText = Mozilla_Text({
  variable: "--font-mozilla-text",
  subsets: ["latin"],
});

const mozillaHeadline = Mozilla_Headline({
  variable: "--font-mozilla-headline",
  subsets: ["latin"],
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
