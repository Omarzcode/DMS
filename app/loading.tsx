import Image from "next/image"

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
      <div className="animate-breathe">
        <Image
          src="/zeta_light.png"
          alt="Logo"
          width={64}
          height={64}
          className="object-contain block dark:hidden"
          priority
        />
        <Image
          src="/zeta_dark.png"
          alt="Logo"
          width={64}
          height={64}
          className="object-contain hidden dark:block"
          priority
        />
      </div>
      <div className="h-1 w-24 rounded-full bg-muted overflow-hidden">
        <div className="h-full w-1/2 rounded-full bg-primary animate-slide" />
      </div>
    </div>
  )
}