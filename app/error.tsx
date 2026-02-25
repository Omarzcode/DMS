"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"

export default function Error({
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
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
      <h1 className="text-2xl font-bold text-foreground">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        An unexpected error occurred
      </p>
      <Button onClick={reset} variant="outline" className="mt-6">
        Try again
      </Button>
    </div>
  )
}