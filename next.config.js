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
