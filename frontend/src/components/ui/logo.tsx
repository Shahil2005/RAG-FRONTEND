import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  /** Size of the square mark in pixels. */
  size?: number;
}

/** Starbot brand mark — a gradient rounded square with a stylized spark and soft glow. */
export function LogoMark({ className, size = 32 }: LogoProps) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-[28%] bg-gradient-to-br from-primary to-accent-2 shadow-glow-sm ring-1 ring-inset ring-white/15',
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.6}
        height={size * 0.6}
        fill="none"
        className="relative text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
      >
        <path
          d="M12 2.5l2.2 5.9a3 3 0 0 0 1.4 1.6L21 12l-5.4 2a3 3 0 0 0-1.4 1.6L12 21.5l-2.2-5.9a3 3 0 0 0-1.4-1.6L3 12l5.4-2a3 3 0 0 0 1.4-1.6L12 2.5z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

interface LogoWordmarkProps {
  className?: string;
  size?: number;
  subtitle?: string;
}

/** Logo mark + "Starbot" wordmark, optionally with a small subtitle. */
export function Logo({ className, size = 30, subtitle }: LogoWordmarkProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <div className="leading-tight">
        <span className="block text-base font-semibold tracking-tight text-foreground">
          Starbot
        </span>
        {subtitle && (
          <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
