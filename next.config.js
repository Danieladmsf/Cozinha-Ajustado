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
  reactStrictMode: process.env.NODE_ENV === 'production', // Desabilitado em dev para evitar duplicação
  eslint: {
    // Durante builds em produção, não falhar por warnings
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Durante builds em produção, não falhar por erros de tipo
    ignoreBuildErrors: false,
  },
  // Configurações para melhorar performance e reduzir logs
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  // Configurar redirecionamentos para evitar 404s de arquivos VSDA
  async redirects() {
    return [
      {
        source: '/static/node_modules/vsda/:path*',
        destination: '/404',
        permanent: false,
      },
      {
        source: '/:path*/vsda.js',
        destination: '/404',
        permanent: false,
      },
      {
        source: '/:path*/vsda_bg.wasm',
        destination: '/404',
        permanent: false,
      },
    ];
  },
  // Configurações de arquivos estáticos
  async rewrites() {
    return [
      {
        source: '/favicon.ico',
        destination: '/favicon.ico',
      },
    ];
  },
  // Configurar headers de segurança
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), usb=(), serial=(), hid=(), cross-origin-isolated=()',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
}

export default nextConfig
