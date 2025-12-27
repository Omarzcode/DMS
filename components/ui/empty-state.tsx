import type React from "react"
import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center animate-fade-in">
      <div className="rounded-full bg-gradient-to-br from-purple-100 to-pink-100 p-4 sm:p-6 mb-4">
        <Icon className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
      </div>
      <h3 className="text-lg sm:text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-sm leading-relaxed">
        {description}
      </p>
      {action}
    </div>
  )
}