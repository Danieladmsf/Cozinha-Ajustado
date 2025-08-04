import { NextResponse } from 'next/server'

export function middleware(request) {
  const response = NextResponse.next()

  // Configurar headers de segurança e performance
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  
  // Desabilitar recursos desnecessários
  response.headers.set(
    'Feature-Policy',
    'camera \'none\'; microphone \'none\'; geolocation \'none\'; usb \'none\'; serial \'none\'; hid \'none\''
  )

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}