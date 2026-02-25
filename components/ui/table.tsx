import * as React from "react"
import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto" dir="ltr">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "[&_tr]:border-b bg-muted/50 sticky top-0 z-10",
      className
    )}
    {...props}
  />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & {
    sortable?: boolean
    sorted?: "asc" | "desc" | false
    onSort?: () => void
  }
>(({ className, sortable, sorted, onSort, children, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground",
      sortable && "cursor-pointer select-none hover:text-foreground",
      "[&:has([role=checkbox])]:pr-0",
      className
    )}
    onClick={sortable ? onSort : undefined}
    {...props}
  >
    {sortable ? (
      <div className="flex items-center gap-1.5">
        {children}
        <span className="inline-flex flex-col">
          <svg
            className={cn(
              "h-3 w-3",
              sorted === "asc" ? "text-foreground" : "text-muted-foreground/30"
            )}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M7 14l5-5 5 5z" />
          </svg>
          <svg
            className={cn(
              "h-3 w-3 -mt-1",
              sorted === "desc" ? "text-foreground" : "text-muted-foreground/30"
            )}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </span>
      </div>
    ) : (
      children
    )}
  </th>
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-3 align-middle [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

// ── Enhanced Components ──

const TableContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border border-border bg-card overflow-hidden",
      className
    )}
    dir="ltr"
    {...props}
  />
))
TableContainer.displayName = "TableContainer"

const TableResponsive = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { maxHeight?: string }
>(({ className, maxHeight = "400px", ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative w-full overflow-auto", className)}
    style={{ maxHeight }}
    {...props}
  />
))
TableResponsive.displayName = "TableResponsive"

const TableLoading = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { rows?: number }
>(({ className, rows = 5, ...props }, ref) => (
  <div ref={ref} className={className} {...props}>
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-4 p-3 border-b border-border animate-pulse"
        style={{ animationDelay: `${i * 80}ms` }}
      >
        <div className="h-4 w-4 rounded bg-muted" />
        <div className="flex-1 space-y-1.5">
          <div
            className="h-3.5 rounded bg-muted"
            style={{ width: `${50 + Math.random() * 30}%` }}
          />
        </div>
        <div className="h-5 w-14 rounded bg-muted" />
      </div>
    ))}
  </div>
))
TableLoading.displayName = "TableLoading"

const TableEmpty = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    title?: string
    description?: string
    icon?: React.ReactNode
    action?: React.ReactNode
  }
>(({ className, title = "No data", description, icon, action, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center",
      className
    )}
    {...props}
  >
    {icon && <div className="mb-3 text-muted-foreground/40">{icon}</div>}
    <p className="text-sm font-medium text-muted-foreground">{title}</p>
    {description && (
      <p className="mt-1 text-xs text-muted-foreground/60 max-w-xs">{description}</p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
))
TableEmpty.displayName = "TableEmpty"

const TablePagination = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    page: number
    totalPages: number
    onPageChange: (page: number) => void
    pageSize?: number
    totalItems?: number
    onPageSizeChange?: (size: number) => void
    pageSizeOptions?: number[]
  }
>(({
  className,
  page,
  totalPages,
  onPageChange,
  pageSize,
  totalItems,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-between gap-3 px-3 py-2 border-t border-border text-sm",
      className
    )}
    {...props}
  >
    <div className="text-xs text-muted-foreground">
      {totalItems !== undefined && pageSize !== undefined && (
        <span>
          {Math.min((page - 1) * pageSize + 1, totalItems)}–
          {Math.min(page * pageSize, totalItems)} of {totalItems}
        </span>
      )}
    </div>

    <div className="flex items-center gap-1">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
        let pageNum = i + 1
        if (totalPages > 5) {
          if (page <= 3) pageNum = i + 1
          else if (page >= totalPages - 2) pageNum = totalPages - 4 + i
          else pageNum = page - 2 + i
        }
        return (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={cn(
              "min-w-[28px] h-7 rounded text-xs font-medium transition-colors",
              page === pageNum
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            {pageNum}
          </button>
        )
      })}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </div>
))
TablePagination.displayName = "TablePagination"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableContainer,
  TableResponsive,
  TableLoading,
  TableEmpty,
  TablePagination,
}