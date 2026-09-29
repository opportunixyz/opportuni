import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Mono } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
  variable: "--font-body",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono",
});

const SITIO = "https://opportuni.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(SITIO),
  title: "Opportuni · Becas, vacantes y programas para jóvenes en México",
  description:
    "Opportuni es la comunidad de más de 12 mil jóvenes en México y Colombia. Becas, vacantes y programas verificados, con más de 200 nuevas cada semana.",
  openGraph: {
    title: "Opportuni",
    description: "Becas, vacantes y programas verificados para jóvenes en México y Colombia.",
    type: "website",
    siteName: "Opportuni",
    locale: "es_MX",
    images: [{ url: "/logo-opportuni.png", alt: "Opportuni" }],
  },
};

// Datos estructurados para que Google reconozca la marca y el sitio oficial.
const DATOS_ESTRUCTURADOS = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITIO}/#org`,
      name: "Opportuni",
      url: SITIO,
      logo: `${SITIO}/logo-opportuni.png`,
      description: "Comunidad de más de 12 mil jóvenes en México y Colombia.",
      areaServed: ["MX", "CO"],
      sameAs: ["https://www.instagram.com/opportuni__mx/", "https://www.linkedin.com/company/opportunn/"],
    },
    {
      "@type": "WebSite",
      name: "Opportuni",
      url: SITIO,
      inLanguage: "es",
      publisher: { "@id": `${SITIO}/#org` },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${bricolage.variable} ${dmMono.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Gabarito:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={bricolage.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(DATOS_ESTRUCTURADOS) }}
        />
        {children}
      </body>
    </html>
  );
}
