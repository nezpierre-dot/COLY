import { ReactNode } from "react";

interface AuthLayoutProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

const AuthLayout = ({ title, subtitle, children }: AuthLayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col bg-coly-blue relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-12 left-1/2 -translate-x-1/3 w-40 h-40 rounded-full bg-white/10" />
      <div className="absolute top-16 right-8">
        <svg width="40" height="20" viewBox="0 0 40 20"><path d="M2 10c5-8 10-8 16 0s10 8 16 0" stroke="white" strokeWidth="2" fill="none" opacity="0.3"/></svg>
      </div>
      <div className="absolute top-28 right-10 grid grid-cols-4 gap-1.5">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20" />
        ))}
      </div>
      <div className="absolute top-40 left-0 w-24 h-24 rounded-full bg-coly-blue-dark/40 -translate-x-1/2" />

      {/* Header text */}
      <div className="relative z-10 px-6 pt-12 pb-6">
        {title && <h1 className="text-3xl font-bold text-white leading-tight">{title}</h1>}
        {subtitle && <p className="text-white/90 mt-2 text-lg">{subtitle}</p>}
      </div>

      {/* Card */}
      <div className="relative z-10 flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-8">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
