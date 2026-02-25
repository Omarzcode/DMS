import Image from "next/image"

interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 56, className = "" }: LogoProps) {
  return (
    <>
      <Image
        src="/zeta_light.png"
        alt="Logo"
        width={size}
        height={size}
        className={`object-contain block dark:hidden ${className}`}
        priority
      />
      <Image
        src="/zeta_dark.png"
        alt="Logo"
        width={size}
        height={size}
        className={`object-contain hidden dark:block ${className}`}
        priority
      />
    </>
  )
}