import { Droplets } from 'lucide-react';

interface LogoProps {
  logoUrl?: string | null;
  businessName?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ logoUrl, businessName, size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-8 h-8', text: 'text-lg', container: 'gap-2' },
    md: { icon: 'w-11 h-11', text: 'text-xl', container: 'gap-2.5' },
    lg: { icon: 'w-16 h-16', text: 'text-3xl', container: 'gap-3' },
  };
  const s = sizes[size];

  return (
    <div className={`flex items-center ${s.container}`}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={businessName || 'الشعار'}
          className={`${s.icon} rounded-xl object-cover`}
        />
      ) : (
        <div
          className={`${s.icon} flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-500/30`}
        >
          <Droplets className={size === 'lg' ? 'w-9 h-9' : 'w-5 h-5'} />
        </div>
      )}
      {showText && (
        <span className={`font-bold text-slate-900 ${s.text}`}>{businessName || 'مياه الصفا'}</span>
      )}
    </div>
  );
}
