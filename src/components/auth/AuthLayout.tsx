import type { ReactNode } from 'react'
import { BadgeCheck, CheckCircle2, Lock, QrCode, ShieldCheck } from 'lucide-react'

interface AuthLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

function PrinterIllustration() {
  return (
    <div className="relative w-full max-w-lg select-none">
      <div className="relative w-full overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm">
        <div className="pointer-events-none absolute -top-12 -right-12 size-48 rounded-full bg-primary/5 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 size-48 rounded-full bg-accent/40 blur-2xl" />
        <svg
          className="h-auto w-full drop-shadow-sm"
          viewBox="0 0 460 260"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="printerBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2f3133" />
              <stop offset="100%" stopColor="#1a1c1e" />
            </linearGradient>
            <linearGradient id="printerLid" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#414755" />
              <stop offset="100%" stopColor="#2f3133" />
            </linearGradient>
            <linearGradient id="paperGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f3f3f6" />
            </linearGradient>
            <filter id="dropShadowPaper" x="-10%" y="0%" width="120%" height="130%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#1a1c1e" floodOpacity="0.14" />
            </filter>
          </defs>

          <g stroke="#c1c6d7" strokeDasharray="3 3" strokeWidth="1" opacity="0.45">
            <line x1="20" y1="130" x2="440" y2="130" />
            <line x1="230" y1="20" x2="230" y2="240" />
            <circle cx="230" cy="130" r="96" fill="none" />
          </g>

          <g id="dispensed-label" filter="url(#dropShadowPaper)">
            <rect x="110" y="88" width="240" height="155" rx="10" fill="url(#paperGrad)" stroke="#c1c6d7" strokeWidth="1.5" />
            <rect x="110" y="88" width="240" height="34" rx="10" fill="#eeeef0" />
            <rect x="110" y="110" width="240" height="12" fill="#eeeef0" />
            <circle cx="126" cy="105" r="4" fill="#0058bc" />
            <text x="136" y="108" fill="#1a1c1e" fontFamily="JetBrains Mono" fontSize="9" fontWeight="600" letterSpacing="1">
              LABEL #LM-9024
            </text>
            <rect x="270" y="97" width="68" height="16" rx="4" fill="#7bf8a1" fillOpacity="0.4" />
            <text x="276" y="108" fill="#006d37" fontFamily="JetBrains Mono" fontSize="8" fontWeight="700">
              ✓ PRINTED OK
            </text>
            <text x="126" y="140" fill="#717786" fontFamily="JetBrains Mono" fontSize="8.5" fontWeight="500">
              CLIENT / RECIPIENT
            </text>
            <text x="126" y="154" fill="#1a1c1e" fontFamily="Hanken Grotesk" fontSize="12" fontWeight="700">
              SAIBAL KOLE — LOGISTICS HUB
            </text>
            <line x1="126" y1="164" x2="334" y2="164" stroke="#e2e2e5" strokeWidth="1" />
            <text x="126" y="182" fill="#717786" fontFamily="JetBrains Mono" fontSize="8.5">
              NET WT: <tspan fill="#1a1c1e" fontWeight="600">0.650 GM</tspan>
            </text>
            <text x="232" y="182" fill="#717786" fontFamily="JetBrains Mono" fontSize="8.5">
              BATCH: <tspan fill="#0058bc" fontWeight="600">SEC-409</tspan>
            </text>
            <text x="126" y="204" fill="#717786" fontFamily="JetBrains Mono" fontSize="8.5">
              ROUTE: <tspan fill="#1a1c1e" fontWeight="600">ZONE 4A EX-AIR</tspan>
            </text>
            <text x="232" y="204" fill="#717786" fontFamily="JetBrains Mono" fontSize="8.5">
              MODE: <tspan fill="#006d37" fontWeight="600">PRIORITY</tspan>
            </text>
            <rect x="126" y="218" width="208" height="16" rx="3" fill="#f3f3f6" />
            <circle cx="134" cy="226" r="2.5" fill="#0058bc" />
            <text x="142" y="229" fill="#414755" fontFamily="JetBrains Mono" fontSize="7.5" fontWeight="600">
              AUTHENTICATED DISPATCH INVOICE ATTACHED
            </text>
          </g>

          <g id="printer-unit">
            <rect x="85" y="18" width="290" height="82" rx="16" fill="url(#printerBody)" stroke="#1a1c1e" strokeWidth="2" filter="drop-shadow(0 10px 20px rgba(0,0,0,0.18))" />
            <rect x="92" y="22" width="276" height="38" rx="12" fill="url(#printerLid)" />
            <line x1="102" y1="32" x2="132" y2="32" stroke="#1a1c1e" strokeWidth="2" strokeLinecap="round" />
            <line x1="102" y1="36" x2="132" y2="36" stroke="#1a1c1e" strokeWidth="2" strokeLinecap="round" />
            <line x1="102" y1="40" x2="132" y2="40" stroke="#1a1c1e" strokeWidth="2" strokeLinecap="round" />
            <rect x="316" y="30" width="38" height="16" rx="8" fill="#1a1c1e" />
            <circle cx="326" cy="38" r="3.5" fill="#7efba4" />
            <circle cx="326" cy="38" r="1.5" fill="#ffffff" />
            <text x="333" y="41" fill="#7efba4" fontFamily="JetBrains Mono" fontSize="7" fontWeight="700">
              READY
            </text>
            <circle cx="288" cy="38" r="7" fill="#2f3133" stroke="#414755" strokeWidth="1" />
            <path d="M288 34V37M286 36A3 3 0 1 0 290 36" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
            <rect x="104" y="80" width="252" height="10" rx="5" fill="#0d0e10" />
            <rect x="110" y="82" width="240" height="4" rx="2" fill="#2f3133" />
            <rect x="104" y="78" width="252" height="2" fill="#0070eb" opacity="0.7" />
          </g>

          <g transform="translate(270, 18)">
            <rect x="0" y="0" width="164" height="42" rx="10" fill="#ffffff" stroke="#0070eb" strokeWidth="1.5" filter="drop-shadow(0 6px 14px rgba(0,88,188,0.12))" />
            <rect x="8" y="8" width="26" height="26" rx="6" fill="#d8e2ff" />
            <path d="M15 21L19 25L27 16" stroke="#0058bc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <text x="42" y="20" fill="#1a1c1e" fontFamily="Hanken Grotesk" fontSize="10" fontWeight="700">
              1-Click Print
            </text>
            <text x="42" y="32" fill="#0058bc" fontFamily="JetBrains Mono" fontSize="8" fontWeight="600">
              THERMAL &amp; INVOICE READY
            </text>
          </g>
        </svg>
      </div>
    </div>
  )
}

function BrandPanel() {
  return (
    <aside className="relative hidden flex-col overflow-hidden lg:col-span-6 lg:flex">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-35">
        <svg className="h-full w-full text-outline-variant" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern height="48" id="industrial-grid" patternUnits="userSpaceOnUse" width="48">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeDasharray="2 4" strokeWidth="0.75" />
            </pattern>
          </defs>
          <rect fill="url(#industrial-grid)" height="100%" width="100%" />
        </svg>
      </div>

      <div className="relative flex flex-col space-y-8">
        <div className="inline-flex w-fit items-center gap-2 self-start rounded-full bg-accent px-3.5 py-1.5 text-primary shadow-sm">
          <BadgeCheck className="size-4" />
          <span className="font-label-sm text-label-sm font-semibold tracking-wider uppercase">
            Next-Gen Labeling &amp; Inventory Platform
          </span>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2.5 text-primary">
            <QrCode className="size-9" />
            <span className="font-label-md text-label-md font-semibold tracking-widest text-outline uppercase">
              Maira 3D Ecosystem
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg leading-none font-extrabold tracking-tight text-on-background">
            Maira Cam <span className="text-primary">3D</span>
          </h1>
          <p className="max-w-lg font-body-lg text-body-lg text-on-surface-variant">
            High-precision labeling, batch management &amp; intelligent logistics in one unified
            platform.
          </p>
        </div>

        <PrinterIllustration />
      </div>

      <div className="flex flex-wrap items-center gap-6 pt-8 font-label-sm text-label-sm text-outline">
        <span className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-secondary" />
          <span className="font-semibold text-on-surface">99.99% Print Accuracy</span>
        </span>
        <span>•</span>
        <span className="flex items-center gap-2">
          <BadgeCheck className="size-4 text-primary" />
          <span className="font-semibold text-on-surface">ISO 15415 Compliant</span>
        </span>
        <span>•</span>
        <span className="flex items-center gap-2">
          <Lock className="size-4" />
          Bank-Grade Encryption
        </span>
      </div>
    </aside>
  )
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-surface px-5 py-12">
      <div className="grid w-full max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <BrandPanel />

        <div className="flex w-full justify-center lg:col-span-6 lg:justify-end">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
                <QrCode className="size-5" />
              </span>
              <span className="font-headline-md text-headline-md font-semibold text-primary">
                Maira Cam 3D
              </span>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-lg">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-primary" />
              <div className="p-7 sm:p-9">
                <div className="mb-7">
                  <h2 className="font-headline-lg text-headline-lg text-on-surface">{title}</h2>
                  {subtitle ? (
                    <p className="mt-1.5 font-body-md text-body-md text-on-surface-variant">
                      {subtitle}
                    </p>
                  ) : null}
                </div>
                {children}
              </div>

              <div className="bg-surface-container-low px-7 py-4 sm:px-9">
                <div className="flex items-center justify-center gap-1.5 text-outline">
                  <ShieldCheck className="size-4 shrink-0" />
                  <p className="font-label-sm text-label-sm">
                    Access is limited to authorized company members.
                  </p>
                </div>
              </div>
            </div>

            {footer ? <div className="mt-6">{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>
  )
}