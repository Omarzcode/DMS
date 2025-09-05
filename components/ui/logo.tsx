import { BookHeart } from 'lucide-react'

export function Logo() {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <BookHeart className="h-5 w-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold">نظام الدعوة</span>
        <span className="text-xs text-muted-foreground">لوحة التحكم</span>
      </div>
    </div>
  )
}

