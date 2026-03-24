import type { ReactNode } from "react"
import { PreacherBottomNav } from "@/components/preacher/preacher-bottom-nav"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <PreacherBottomNav />
    </>
  )
}
