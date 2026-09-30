/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // smart-account-kit importa con import() dinámico este paquete opcional
    // (adaptador de wallets externas) que la puerta no usa.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@creit-tech/stellar-wallets-kit": false,
      "@creit-tech/stellar-wallets-kit/modules/utils": false,
    };
    return config;
  },
  // Descubrimiento OAuth del conector de Claude (PRD 8.9): las rutas
  // /.well-known las sirven API routes.
  async rewrites() {
    return [
      { source: "/.well-known/oauth-protected-resource", destination: "/api/oauth/metadata/recurso" },
      { source: "/.well-known/oauth-protected-resource/:path*", destination: "/api/oauth/metadata/recurso" },
      { source: "/.well-known/oauth-authorization-server", destination: "/api/oauth/metadata/servidor" },
      { source: "/.well-known/oauth-authorization-server/:path*", destination: "/api/oauth/metadata/servidor" },
    ];
  },
  // La pantalla de login del conector no se puede meter en un iframe.
  async headers() {
    return [
      {
        source: "/oauth/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
  // En producción todo host que no sea opportuni.xyz (www y los *.vercel.app
  // del proyecto) redirige al dominio, para que Google indexe uno solo.
  async redirects() {
    if (process.env.VERCEL_ENV !== "production") return [];
    return [
      {
        source: "/:path*",
        missing: [{ type: "host", value: "opportuni\\.xyz" }],
        destination: "https://opportuni.xyz/:path*",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
