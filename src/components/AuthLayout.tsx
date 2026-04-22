import { ReactNode } from "react";

interface AuthLayoutProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

const AuthLayout = ({ title, subtitle, children }: AuthLayoutProps) => {
  return (
    <div
      className="flex min-h-screen flex-col relative overflow-hidden"
      style={{ background: "var(--gradient-hero-bright)" }}
    >
      {/* Organic background blobs — Future DA */}
      <div className="pointer-events-none absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute top-20 -right-32 w-[26rem] h-[26rem] rounded-full bg-secondary/30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[20rem] h-[20rem] rounded-full bg-accent/20 blur-3xl" />

      {/* Subtle dotted accent */}
      <div className="pointer-events-none absolute top-28 right-10 grid grid-cols-4 gap-1.5 opacity-40">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/40" />
        ))}
      </div>
      <div className="pointer-events-none absolute top-16 right-8 opacity-50">
        <svg width="48" height="22" viewBox="0 0 48 22">
          <path
            d="M2 11c6-10 12-10 20 0s14 10 24 0"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Header text */}
      <div className="relative z-10 px-6 pt-14 pb-8">
        {title && (
          <h1 className="text-4xl font-bold leading-tight tracking-tight bg-gradient-to-br from-foreground via-foreground to-primary bg-clip-text text-transparent text-balance">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="text-foreground/70 mt-3 text-base leading-relaxed max-w-md">
            {subtitle}
          </p>
        )}
      </div>

      {/* Glass card */}
      <div
        className="relative z-10 flex-1 rounded-t-[2.5rem] px-6 pt-10 pb-10 border border-white/40"
        style={{
          background: "hsl(var(--glass-bg))",
          backdropFilter: "blur(var(--glass-blur))",
          WebkitBackdropFilter: "blur(var(--glass-blur))",
          boxShadow: "var(--glass-shadow)",
        }}
      >
        {/* Top handle bar */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-muted-foreground/20" />
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
