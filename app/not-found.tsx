import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
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
      <h1 className="text-5xl font-bold text-foreground">404</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Page not found
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  )
}