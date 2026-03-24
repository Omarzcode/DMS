import type { ReactNode } from "react"
import { AdminBottomNav } from "@/components/admin/admin-bottom-nav"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <AdminBottomNav />
    </>
  )
}
