/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  swcMinify: true,
  experimental: {
    esmExternals: false,
  },
  // Configurações para evitar problemas entre dev e prod
  reactStrictMode: true,
  eslint: {
    // Durante builds em produção, não falhar por warnings
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Durante builds em produção, não falhar por erros de tipo
    ignoreBuildErrors: false,
  },
}

export default nextConfig
