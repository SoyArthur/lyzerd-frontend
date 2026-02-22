// app/layout.jsx
import './globals.css';
import Script from 'next/script';
import LegalModal from '@/components/LegalModal';
import AuthInterceptor from '@/components/AuthInterceptor';

export const metadata = {
  title: 'Lyzerd - Crypto Token Analyzer',
  description: 'Fast, powerful crypto token analysis with AI',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        {/* Fonts via Google CDN — no next/font (incompatible con static export) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Syne:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5809310406579457"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="font-mono font-sans antialiased bg-black text-white">

        <AuthInterceptor />
        <LegalModal />
        {children}

        <Script id="adsense-init" strategy="afterInteractive">
          {`(adsbygoogle = window.adsbygoogle || []).push({});`}
        </Script>

        {/* ── FOOTER FRUTIGER AERO ── */}
        <footer className="relative mt-24 overflow-hidden">

          {/* Orbs de ambiente */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-cyan-500/8 blur-[96px]" />
            <div className="absolute -right-24 top-0 h-64 w-64 rounded-full bg-teal-400/6 blur-[80px]" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 h-48 w-96 rounded-full bg-sky-500/5 blur-[64px]" />
          </div>

          {/* Línea superior con gradiente */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent" />

          {/* Panel principal — glass */}
          <div
            className="relative mx-auto max-w-5xl px-8 py-10"
            style={{
              background: 'linear-gradient(135deg, rgba(6,182,212,0.04) 0%, rgba(0,0,0,0) 60%)',
            }}
          >
            <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">

              {/* Brand */}
              <div className="flex flex-col gap-2">
                <span
                  className="text-xs font-black uppercase tracking-[0.3em]"
                  style={{
                    background: 'linear-gradient(90deg, #67e8f9, #38bdf8)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Lyzerd
                </span>
                <p className="text-[10px] text-gray-600 font-mono tracking-widest uppercase">
                  Alpha Protocol © 2026
                </p>
              </div>

              {/* Legal links */}
              <div className="flex gap-6">
                {[
                  { href: '/terms',   label: 'Términos' },
                  { href: '/privacy', label: 'Privacidad' },
                ].map(({ href, label }) => (
                  <a
                    key={href}
                    href={href}
                    className="group relative text-[11px] font-medium text-gray-500 transition-colors hover:text-cyan-400"
                  >
                    {label}
                    <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-gradient-to-r from-cyan-400 to-teal-400 transition-all duration-300 group-hover:w-full" />
                  </a>
                ))}
              </div>

              {/* Risk notice — glass pill */}
              <div
                className="max-w-xs rounded-xl border border-white/5 px-4 py-3 text-[9px] leading-relaxed text-gray-600 uppercase font-mono tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.04), rgba(0,0,0,0.3))',
                  backdropFilter: 'blur(8px)',
                }}
              >
                ⚠ Solo entretenimiento especulativo. No asesoría financiera.
                Puedes perder el 100% de tu capital.
              </div>

            </div>

            {/* Bottom bar */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-800/50" />
              <span className="text-[8px] font-mono text-gray-700 uppercase tracking-[0.6em] whitespace-nowrap">
                Sin Ruido · Solo Datos
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-800/50" />
            </div>
          </div>
        </footer>

      </body>
    </html>
  );
}
