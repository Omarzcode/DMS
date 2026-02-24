import * as React from "react"
import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto rounded-lg border border-border shadow-sm">
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
      "[&_tr]:border-b border-border",
      "bg-muted/50 backdrop-blur-sm sticky top-0 z-10",
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
    className={cn(
      "[&_tr:last-child]:border-0",
      "[&_tr:hover]:bg-muted/30",
      className
    )}
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
      "border-t border-border bg-gradient-to-r from-primary/5 to-transparent font-medium [&>tr]:last:border-b-0",
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
      "border-b border-border/50 transition-all duration-200",
      "hover:bg-muted/30",
      "data-[state=selected]:bg-primary/10 data-[state=selected]:border-l-2 data-[state=selected]:border-l-primary",
      "group",
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
    sorted?: 'asc' | 'desc' | false
    onSort?: () => void
  }
>(({ className, sortable, sorted, onSort, children, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-right align-middle font-semibold",
      "text-foreground/80 bg-gradient-to-b from-muted/80 to-muted/40",
      "border-l border-border/30 first:border-l-0",
      "transition-colors duration-200",
      "group-hover:text-primary/80",
      sortable && "cursor-pointer select-none hover:bg-muted/60",
      "[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    onClick={sortable ? onSort : undefined}
    {...props}
  >
    <div className="flex items-center gap-2">
      {children}
      {sortable && (
        <span className="inline-flex flex-col text-xs leading-none">
          <svg
            className={cn(
              "h-3 w-3 transition-colors",
              sorted === 'asc' ? "text-primary" : "text-muted-foreground/40"
            )}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M7 14l5-5 5 5z" />
          </svg>
          <svg
            className={cn(
              "h-3 w-3 -mt-1 transition-colors",
              sorted === 'desc' ? "text-primary" : "text-muted-foreground/40"
            )}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </span>
      )}
    </div>
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
      "p-4 align-middle",
      "border-l border-border/20 first:border-l-0",
      "transition-colors duration-200 group-hover:text-foreground/90",
      "[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
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
    className={cn(
      "mt-4 text-sm text-muted-foreground/80",
      "px-4 py-3 bg-muted/30 rounded-lg",
      className
    )}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

// Enhanced Table Components
interface TableContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'card' | 'glass'
}

const TableContainer = React.forwardRef<
  HTMLDivElement,
  TableContainerProps
>(({ className, variant = 'default', ...props }, ref) => {
  const variantClasses = {
    default: "rounded-lg border border-border bg-background shadow-sm",
    card: "rounded-xl border border-border/50 bg-card shadow-lg",
    glass: "rounded-xl glass-effect border border-border/30"
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative w-full overflow-hidden",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
})
TableContainer.displayName = "TableContainer"

interface TableResponsiveProps extends React.HTMLAttributes<HTMLDivElement> {
  maxHeight?: string
}

const TableResponsive = React.forwardRef<
  HTMLDivElement,
  TableResponsiveProps
>(({ className, maxHeight = "400px", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative w-full overflow-auto",
      "scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent",
      className
    )}
    style={{ maxHeight }}
    {...props}
  />
))
TableResponsive.displayName = "TableResponsive"

const TableLoading = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { rows?: number }
>(({ className, rows = 5, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "bg-gradient-to-br from-muted/20 to-transparent",
      className
    )}
    {...props}
  >
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-4 p-4 border-b border-border/30 animate-pulse"
        style={{ animationDelay: `${i * 100}ms` }}
      >
        <div className="h-4 w-4 rounded bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 rounded bg-muted" style={{ width: `${60 + Math.random() * 30}%` }} />
          <div className="h-3 rounded bg-muted/70" style={{ width: `${30 + Math.random() * 20}%` }} />
        </div>
        <div className="h-6 w-16 rounded-full bg-muted" />
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
>(({ className, title = "No Data Available", description, icon, action, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col items-center justify-center p-12 text-center",
      "bg-gradient-to-b from-muted/10 to-transparent",
      className
    )}
    {...props}
  >
    <div className="mb-4 rounded-full bg-muted/30 p-4">
      {icon || (
        <svg
          className="h-10 w-10 text-muted-foreground/50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      )}
    </div>
    <h3 className="mb-2 text-lg font-semibold text-foreground/80">{title}</h3>
    {description && (
      <p className="text-sm text-muted-foreground/70 max-w-md mb-4">{description}</p>
    )}
    {action && <div className="mt-2">{action}</div>}
  </div>
))
TableEmpty.displayName = "TableEmpty"

interface TablePaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  pageSize?: number
  totalItems?: number
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
}

const TablePagination = React.forwardRef<
  HTMLDivElement,
  TablePaginationProps
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
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border",
        "bg-muted/30",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {totalItems !== undefined && pageSize !== undefined && (
          <span>
            Showing {Math.min((page - 1) * pageSize + 1, totalItems)} to{" "}
            {Math.min(page * pageSize, totalItems)} of {totalItems} items
          </span>
        )}

        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>per page</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* First page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          className="p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="First Page"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-1">
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
                  "min-w-[2rem] h-8 px-2 rounded-md text-sm font-medium transition-all duration-200",
                  page === pageNum
                    ? "bg-primary text-primary-foreground shadow-sm scale-105"
                    : "hover:bg-muted"
                )}
              >
                {pageNum}
              </button>
            )
          })}
        </div>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Last page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className="p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Last Page"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
})
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
