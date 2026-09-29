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
};

module.exports = nextConfig;
