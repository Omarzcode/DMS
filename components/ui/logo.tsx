// components/ui/logo.tsx

import Image from "next/image"

interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 56, className = "" }: LogoProps) {
  return (
    <Image
      src="/zeta.png"
      alt="Logo"
      width={size}
      height={size}
      className={`object-contain drop-shadow-sm ${className}`}
      priority
    />
  )
}