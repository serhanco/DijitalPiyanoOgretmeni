import { DRAWINGS, type IconName } from './drawings'

export type { IconName }

/** One of the app's own icons (`drawings.tsx`); decorative, so screen readers skip it. */
export function Icon({ name, size, className = '' }: { name: IconName; size?: number | string; className?: string }) {
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden
      focusable="false"
      data-icon={name}
    >
      {DRAWINGS[name]}
    </svg>
  )
}
