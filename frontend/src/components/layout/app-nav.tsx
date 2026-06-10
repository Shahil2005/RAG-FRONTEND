'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Chat' },
  { href: '/mail', label: 'Mail' },
  { href: '/settings', label: 'Settings' },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="glass sticky top-0 z-30 flex shrink-0 items-center justify-between gap-3 border-b border-border/70 px-4 py-2.5">
      <Link href="/dashboard" className="transition-opacity hover:opacity-80">
        <Logo size={28} />
      </Link>

      <div className="flex items-center gap-1 rounded-full border border-border/60 bg-surface/50 p-1 text-sm">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'rounded-full px-3.5 py-1.5 font-medium transition-[background-color,color,box-shadow] duration-fast ease-out',
                active
                  ? 'bg-gradient-to-b from-primary to-primary/85 text-primary-foreground shadow-glow-sm'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
