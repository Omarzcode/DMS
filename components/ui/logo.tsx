import { BookHeart, Sparkles } from 'lucide-react'

export function Logo() {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="relative">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg-primary shadow-lg">
          <BookHeart className="h-5 w-5 text-white" />
        </div>
        <div className="absolute -top-1 -right-1 h-3 w-3 gradient-bg-secondary rounded-full flex items-center justify-center">
          <Sparkles className="h-1.5 w-1.5 text-white" />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold gradient-text-primary">نظام الدعوة</span>
        <span className="text-xs text-muted-foreground">لوحة التحكم المتطورة</span>
      </div>
    </div>
  )
}