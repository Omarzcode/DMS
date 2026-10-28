"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { VariantProps, cva } from "class-variance-authority"
import { PanelLeft, ChevronDown, Search } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ============================================================================
// Constants
// ============================================================================

const SIDEBAR_COOKIE_NAME = "sidebar:state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

// ============================================================================
// Types
// ============================================================================

type SidebarState = "expanded" | "collapsed"

interface SidebarContext {
  state: SidebarState
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

interface SidebarProviderProps extends React.ComponentProps<"div"> {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// ============================================================================
// Context
// ============================================================================

const SidebarContext = React.createContext<SidebarContext | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }
  return context
}

// ============================================================================
// Utility Functions
// ============================================================================

function setCookie(name: string, value: string, maxAge: number) {
  if (typeof document !== "undefined") {
    document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`
  }
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null

  const cookies = document.cookie.split(";")
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split("=")
    if (key === name) return value
  }
  return null
}

// ============================================================================
// Provider Component
// ============================================================================

const SidebarProvider = React.forwardRef<HTMLDivElement, SidebarProviderProps>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile()
    const [openMobile, setOpenMobile] = React.useState(false)
    const [_open, _setOpen] = React.useState(defaultOpen)
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
      setMounted(true)
    }, [])

    const isControlled = openProp !== undefined
    const open = isControlled ? openProp : _open

    const setOpen = React.useCallback(
      (value: boolean | ((prev: boolean) => boolean)) => {
        if (isControlled) {
          const nextOpen = typeof value === "function" ? value(openProp) : value
          setOpenProp?.(nextOpen)
          setCookie(SIDEBAR_COOKIE_NAME, String(nextOpen), SIDEBAR_COOKIE_MAX_AGE)
        } else {
          _setOpen((prev) => {
            const nextOpen = typeof value === "function" ? value(prev) : value
            setCookie(SIDEBAR_COOKIE_NAME, String(nextOpen), SIDEBAR_COOKIE_MAX_AGE)
            return nextOpen
          })
        }
      },
      [isControlled, openProp, setOpenProp]
    )

    const handleSetOpenMobile = React.useCallback((value: boolean) => {
      setOpenMobile(value)
    }, [])

    const toggleSidebar = React.useCallback(() => {
      if (isMobile) {
        setOpenMobile((prev) => !prev)
      } else {
        setOpen((prev) => !prev)
      }
    }, [isMobile, setOpen])

    // Keyboard shortcut
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault()
          toggleSidebar()
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [toggleSidebar])

    // Close mobile sidebar on route change
    React.useEffect(() => {
      if (openMobile && isMobile) {
        const handleRouteChange = () => setOpenMobile(false)
        window.addEventListener("popstate", handleRouteChange)
        return () => window.removeEventListener("popstate", handleRouteChange)
      }
    }, [openMobile, isMobile])

    // Lock body scroll when mobile sidebar is open
    React.useEffect(() => {
      if (isMobile && openMobile) {
        document.body.style.overflow = "hidden"
        return () => {
          document.body.style.overflow = ""
        }
      }
    }, [isMobile, openMobile])

    const state: SidebarState = open ? "expanded" : "collapsed"

    const contextValue = React.useMemo<SidebarContext>(
      () => ({
        state,
        open,
        setOpen,
        isMobile: mounted ? isMobile : false,
        openMobile,
        setOpenMobile: handleSetOpenMobile,
        toggleSidebar,
      }),
      [state, open, setOpen, mounted, isMobile, openMobile, handleSetOpenMobile, toggleSidebar]
    )

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
          <div
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH,
                "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
                ...style,
              } as React.CSSProperties
            }
            className={cn(
              "group/sidebar-wrapper relative min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    )
  }
)
SidebarProvider.displayName = "SidebarProvider"

// ============================================================================
// Sidebar Component
// ============================================================================

interface SidebarProps extends React.ComponentProps<"div"> {
  side?: "left" | "right"
  variant?: "sidebar" | "floating" | "inset"
  collapsible?: "offcanvas" | "icon" | "none"
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  (
    {
      side = "left",
      variant = "sidebar",
      collapsible = "offcanvas",
      className,
      children,
      ...props
    },
    ref
  ) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

    // Non-collapsible sidebar
    if (collapsible === "none") {
      return (
        <div
          className={cn(
            "flex h-full w-[--sidebar-width] flex-col bg-sidebar text-sidebar-foreground",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      )
    }

    // Mobile sidebar (sheet)
    if (isMobile) {
      return (
        <>
          {/* Backdrop overlay */}
          {openMobile && (
            <div
              onClick={() => setOpenMobile(false)}
              className={cn(
                "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm cursor-pointer",
                "animate-in fade-in-0 duration-300"
              )}
              aria-label="Close sidebar"
            />
          )}

          <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
            <SheetContent
              data-sidebar="sidebar"
              data-mobile="true"
              className={cn(
                "w-[--sidebar-width] bg-sidebar/85 dark:bg-sidebar/75 backdrop-blur-2xl p-0 text-sidebar-foreground [&>button]:hidden",
                "border-sidebar-border/40 shadow-2xl"
              )}
              style={
                {
                  "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
                } as React.CSSProperties
              }
              side={side}
            >
              <div className="flex h-full w-full flex-col pb-safe pt-safe">
                {children}
              </div>
            </SheetContent>
          </Sheet>
        </>
      )
    }

    // Desktop sidebar
    return (
      <aside
        ref={ref}
        role="navigation"
        aria-label="Main navigation"
        className="group peer hidden md:block text-sidebar-foreground"
        data-state={state}
        data-collapsible={state === "collapsed" ? collapsible : ""}
        data-variant={variant}
        data-side={side}
      >
        {/* Skip to content link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none"
        >
          Skip to main content
        </a>

        <div
          className={cn(
            "duration-300 fixed inset-y-0 z-10 hidden h-svh w-[--sidebar-width] transition-[left,right,width] ease-out md:flex",
            side === "left"
              ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
              : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
            variant === "floating" || variant === "inset"
              ? "p-2.5 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]"
              : "group-data-[collapsible=icon]:w-[--sidebar-width-icon] group-data-[side=left]:border-r group-data-[side=right]:border-l border-sidebar-border/30",
            className
          )}
          {...props}
        >
          <div
            data-sidebar="sidebar"
            className={cn(
              "flex h-full w-full flex-col bg-sidebar/80 dark:bg-sidebar/70 backdrop-blur-2xl border-r border-sidebar-border/30 relative",
              "after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-gradient-to-b after:from-transparent after:via-primary/20 after:to-transparent after:pointer-events-none",
              "group-data-[variant=floating]:rounded-2xl group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border/50 group-data-[variant=floating]:shadow-xl"
            )}
          >
            {children}
          </div>
        </div>
      </aside>
    )
  }
)
Sidebar.displayName = "Sidebar"

// ============================================================================
// Sidebar Trigger
// ============================================================================

const SidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      toggleSidebar()
    },
    [onClick, toggleSidebar]
  )

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn(
        "h-9 w-9 transition-all duration-200 hover:scale-105 active:scale-95",
        "focus-visible:ring-2 focus-visible:ring-primary/50",
        className
      )}
      onClick={handleClick}
      aria-label="Toggle sidebar"
      {...props}
    >
      <PanelLeft className="h-5 w-5" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

// ============================================================================
// Sidebar Rail
// ============================================================================

const SidebarRail = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button">
>(({ className, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      ref={ref}
      data-sidebar="rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
        "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-sidebar",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className
      )}
      {...props}
    />
  )
})
SidebarRail.displayName = "SidebarRail"

// ============================================================================
// Layout Components
// ============================================================================

const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"main">
>(({ className, ...props }, ref) => {
  return (
    <main
      id="main-content"
      ref={ref}
      className={cn(
        "relative flex min-h-svh flex-1 flex-col bg-background transition-[margin] duration-200",
        "md:peer-data-[state=expanded]:ml-[--sidebar-width]",
        "md:peer-data-[state=collapsed]:ml-[--sidebar-width-icon]",
        "peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))]",
        "md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
        className
      )}
      {...props}
    />
  )
})
SidebarInset.displayName = "SidebarInset"

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, children, ...props }, ref) => {
  const { isMobile } = useSidebar()

  return (
    <div
      ref={ref}
      data-sidebar="header"
      className={cn(
        "flex flex-col gap-3 p-4 md:p-3",
        isMobile &&
          "sticky top-0 z-10 bg-sidebar/95 backdrop-blur-md border-b border-sidebar-border/50",
        className
      )}
      {...props}
    >
      {isMobile ? (
        <div className="flex items-center justify-between">
          <div className="flex-1">{children}</div>
          <SidebarTrigger className="md:hidden" />
        </div>
      ) : (
        children
      )}
    </div>
  )
})
SidebarHeader.displayName = "SidebarHeader"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="footer"
      className={cn(
        "flex flex-col gap-2 p-4 md:p-3 mt-auto",
        "border-t border-sidebar-border/50",
        className
      )}
      {...props}
    />
  )
})
SidebarFooter.displayName = "SidebarFooter"

// ── Scroll-aware SidebarContent ──
const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  const innerRef = React.useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = React.useState({
    top: false,
    bottom: false,
  })

  // Combine refs
  const combinedRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      (innerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
      if (typeof ref === "function") ref(node)
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
    },
    [ref]
  )

  React.useEffect(() => {
    const el = innerRef.current
    if (!el) return

    const handleScroll = () => {
      setScrollState({
        top: el.scrollTop > 8,
        bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 8,
      })
    }

    handleScroll()
    el.addEventListener("scroll", handleScroll, { passive: true })
    const observer = new ResizeObserver(handleScroll)
    observer.observe(el)

    return () => {
      el.removeEventListener("scroll", handleScroll)
      observer.disconnect()
    }
  }, [])

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Top scroll shadow */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-sidebar/80 to-transparent transition-opacity duration-200",
          scrollState.top ? "opacity-100" : "opacity-0"
        )}
      />

      <div
        ref={combinedRef}
        data-sidebar="content"
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
          "scrollbar-thin scrollbar-thumb-sidebar-border scrollbar-track-transparent",
          "sidebar-content",
          className
        )}
        {...props}
      />

      {/* Bottom scroll shadow */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-t from-sidebar/80 to-transparent transition-opacity duration-200",
          scrollState.bottom ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  )
})
SidebarContent.displayName = "SidebarContent"

// ============================================================================
// Input Component
// ============================================================================

const SidebarInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => {
  const [isFocused, setIsFocused] = React.useState(false)

  return (
    <div className="relative">
      <Search
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 pointer-events-none",
          isFocused ? "text-primary" : "text-muted-foreground"
        )}
      />
      <Input
        ref={ref}
        data-sidebar="input"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
          "h-11 md:h-9 w-full pl-10 pr-4",
          "bg-background shadow-none",
          "focus-visible:ring-2 focus-visible:ring-primary/50",
          "placeholder:text-muted-foreground/60",
          "transition-shadow duration-200",
          className
        )}
        {...props}
      />
    </div>
  )
})
SidebarInput.displayName = "SidebarInput"

const SidebarSeparator = React.forwardRef<
  React.ElementRef<typeof Separator>,
  React.ComponentProps<typeof Separator>
>(({ className, ...props }, ref) => {
  return (
    <Separator
      ref={ref}
      data-sidebar="separator"
      className={cn("mx-2 w-auto bg-sidebar-border/50", className)}
      {...props}
    />
  )
})
SidebarSeparator.displayName = "SidebarSeparator"

// ============================================================================
// Group Components
// ============================================================================

const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  )
})
SidebarGroup.displayName = "SidebarGroup"

interface SidebarGroupLabelProps extends React.ComponentProps<"div"> {
  asChild?: boolean
}

const SidebarGroupLabel = React.forwardRef<HTMLDivElement, SidebarGroupLabelProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div"

    return (
      <Comp
        ref={ref}
        data-sidebar="group-label"
        className={cn(
          "duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 outline-none ring-sidebar-ring transition-[margin,opacity] ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
          "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
          className
        )}
        {...props}
      />
    )
  }
)
SidebarGroupLabel.displayName = "SidebarGroupLabel"

interface SidebarGroupActionProps extends React.ComponentProps<"button"> {
  asChild?: boolean
}

const SidebarGroupAction = React.forwardRef<HTMLButtonElement, SidebarGroupActionProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        ref={ref}
        data-sidebar="group-action"
        className={cn(
          "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
          "after:absolute after:-inset-2 after:md:hidden",
          "group-data-[collapsible=icon]:hidden",
          className
        )}
        {...props}
      />
    )
  }
)
SidebarGroupAction.displayName = "SidebarGroupAction"

const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group-content"
    className={cn("w-full text-sm", className)}
    {...props}
  />
))
SidebarGroupContent.displayName = "SidebarGroupContent"

// ============================================================================
// Collapsible Group Component
// ============================================================================

interface SidebarGroupCollapsibleProps extends React.ComponentProps<"div"> {
  title: string
  defaultOpen?: boolean
}

const SidebarGroupCollapsible = React.forwardRef<
  HTMLDivElement,
  SidebarGroupCollapsibleProps
>(({ title, children, defaultOpen = true, className, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const contentId = React.useId()

  return (
    <SidebarGroup ref={ref} className={className} {...props}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full",
          "min-h-[44px] md:min-h-[36px] px-4 md:px-2 py-2",
          "hover:bg-sidebar-accent rounded-md transition-all duration-200",
          "tap-highlight-transparent",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:rounded-md"
        )}
        aria-expanded={isOpen}
        aria-controls={contentId}
        aria-label={`Toggle ${title} section`}
      >
        <SidebarGroupLabel>{title}</SidebarGroupLabel>
        {!isCollapsed && (
          <ChevronDown
            className={cn(
              "h-4 w-4 text-sidebar-foreground/50 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
            aria-hidden="true"
          />
        )}
      </button>

      <div
        id={contentId}
        role="region"
        aria-labelledby={`${contentId}-label`}
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          isOpen && !isCollapsed ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <SidebarGroupContent>{children}</SidebarGroupContent>
        </div>
      </div>
    </SidebarGroup>
  )
})
SidebarGroupCollapsible.displayName = "SidebarGroupCollapsible"

// ============================================================================
// Menu Components
// ============================================================================

const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu"
    role="list"
    className={cn("flex w-full min-w-0 flex-col gap-1", className)}
    {...props}
  />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    data-sidebar="menu-item"
    className={cn("group/menu-item relative", className)}
    {...props}
  />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

// ============================================================================
// Menu Button
// ============================================================================

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-3 overflow-hidden rounded-xl p-2.5 text-left outline-none ring-sidebar-ring transition-all duration-200 ease-out hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground hover:translate-x-0.5 focus-visible:ring-2 active:bg-sidebar-accent disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-primary/12 data-[active=true]:font-medium data-[active=true]:text-primary dark:data-[active=true]:bg-primary/20 dark:data-[active=true]:text-primary data-[state=open]:hover:bg-sidebar-accent/80 group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-2 group-data-[collapsible=icon]:justify-center [&>span:last-child]:truncate [&>svg]:size-4.5 [&>svg]:shrink-0 tap-highlight-transparent select-none",
  {
    variants: {
      variant: {
        default:
          "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
        outline:
          "bg-background/80 shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "min-h-[44px] md:min-h-[38px] text-base md:text-sm",
        sm: "min-h-[40px] md:min-h-[32px] text-sm md:text-xs",
        lg: "min-h-[52px] md:min-h-[44px] text-lg md:text-base group-data-[collapsible=icon]:!p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface SidebarMenuButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof sidebarMenuButtonVariants> {
  asChild?: boolean
  isActive?: boolean
  tooltip?: string | React.ComponentProps<typeof TooltipContent>
  icon?: React.ReactNode
  badge?: string | number
}

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  SidebarMenuButtonProps
>(
  (
    {
      asChild = false,
      isActive = false,
      variant = "default",
      size = "default",
      tooltip,
      icon,
      badge,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    const { isMobile, state, setOpenMobile } = useSidebar()
    const isCollapsed = state === "collapsed"

    // Auto-close mobile sidebar on click
    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        props.onClick?.(e)
        if (isMobile) {
          // Small delay to allow navigation to start
          setTimeout(() => setOpenMobile(false), 150)
        }
      },
      [isMobile, setOpenMobile, props.onClick]
    )

    const button = (
      <Comp
        ref={ref}
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        className={cn(
          sidebarMenuButtonVariants({ variant, size }),
          // Active indicator bar
          "relative",
          isActive &&
            "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-[3px] before:rounded-full before:bg-primary group-data-[collapsible=icon]:before:hidden",
          isCollapsed && "justify-center",
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {icon && (
              <span
                className={cn(
                  "shrink-0 transition-transform duration-200",
                  isCollapsed && "scale-110"
                )}
              >
                {icon}
              </span>
            )}
            {!isCollapsed && (
              <span className="flex-1 text-left truncate">{children}</span>
            )}
            {!isCollapsed && badge !== undefined && (
              <Badge
                variant="secondary"
                className="mr-auto h-5 min-w-5 px-1.5 text-xs font-medium"
              >
                {badge}
              </Badge>
            )}
          </>
        )}
      </Comp>
    )

    if (!tooltip) return button

    const tooltipProps =
      typeof tooltip === "string" ? { children: tooltip } : tooltip

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          side="right"
          align="center"
          hidden={state !== "collapsed" || isMobile}
          className="font-medium"
          {...tooltipProps}
        />
      </Tooltip>
    )
  }
)
SidebarMenuButton.displayName = "SidebarMenuButton"

// ============================================================================
// Menu Action and Badge
// ============================================================================

interface SidebarMenuActionProps extends React.ComponentProps<"button"> {
  asChild?: boolean
  showOnHover?: boolean
}

const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  SidebarMenuActionProps
>(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-action"
      className={cn(
        "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:scale-110 focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground active:scale-95 [&>svg]:size-4 [&>svg]:shrink-0",
        "after:absolute after:-inset-2 after:md:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        showOnHover &&
          "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuAction.displayName = "SidebarMenuAction"

const SidebarMenuBadge = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="menu-badge"
    className={cn(
      "absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground select-none pointer-events-none",
      "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
      "peer-data-[size=sm]/menu-button:top-1",
      "peer-data-[size=default]/menu-button:top-1.5",
      "peer-data-[size=lg]/menu-button:top-2.5",
      "group-data-[collapsible=icon]:hidden",
      className
    )}
    {...props}
  />
))
SidebarMenuBadge.displayName = "SidebarMenuBadge"

// ============================================================================
// Menu Skeleton
// ============================================================================

interface SidebarMenuSkeletonProps extends React.ComponentProps<"div"> {
  showIcon?: boolean
}

const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  SidebarMenuSkeletonProps
>(({ className, showIcon = false, ...props }, ref) => {
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`
  }, [])

  return (
    <div
      ref={ref}
      data-sidebar="menu-skeleton"
      className={cn(
        "rounded-md h-10 md:h-8 flex gap-2 px-2 items-center animate-pulse",
        className
      )}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-md"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 flex-1 max-w-[--skeleton-width]"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  )
})
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton"

// ============================================================================
// Menu Sub Components
// ============================================================================

const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu-sub"
    role="list"
    className={cn(
      "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
      "group-data-[collapsible=icon]:hidden",
      className
    )}
    {...props}
  />
))
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ ...props }, ref) => <li ref={ref} {...props} />)
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

interface SidebarMenuSubButtonProps extends React.ComponentProps<"a"> {
  asChild?: boolean
  size?: "sm" | "md"
  isActive?: boolean
}

const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  SidebarMenuSubButtonProps
>(({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a"
  const { isMobile, setOpenMobile } = useSidebar()

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      props.onClick?.(e as any)
      if (isMobile) {
        setTimeout(() => setOpenMobile(false), 150)
      }
    },
    [isMobile, setOpenMobile, props.onClick]
  )

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      onClick={handleClick}
      className={cn(
        "flex min-h-[44px] md:min-h-[34px] min-w-0 -translate-x-px items-center gap-2.5 overflow-hidden rounded-lg px-2.5 text-sidebar-foreground outline-none ring-sidebar-ring transition-all duration-200 ease-out hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground hover:translate-x-0.5 focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground",
        "data-[active=true]:bg-primary/12 data-[active=true]:text-primary data-[active=true]:font-medium dark:data-[active=true]:bg-primary/20 [&[data-active=true]>svg]:text-primary",
        "tap-highlight-transparent select-none",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

// ============================================================================
// Exports
// ============================================================================

export {
  Sidebar,
  SidebarTrigger,
  useSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarGroupCollapsible,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  sidebarMenuButtonVariants,
}
