"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { formatCurrency } from "@/lib/currency"
import {
  Home,
  Package,
  ShoppingCart,
  CreditCard,
  LayoutDashboard,
  Menu,
  Moon,
  Sun,
  LogIn,
  LogOut,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useTheme } from "next-themes"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

const navItems = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/items", label: "Produk", icon: Package },
  { href: "/orders", label: "Pesanan", icon: ShoppingCart },
  { href: "/checkout", label: "Kasir", icon: CreditCard },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
]

export function Header() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const currentOrder = useStore((state) => state.currentOrder)
  const isAuthenticated = useStore((state) => state.isAuthenticated)
  const logout = useStore((state) => state.logout)

  const cartCount = currentOrder.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = currentOrder.reduce(
    (sum, orderItem) => sum + orderItem.item.price * orderItem.quantity,
    0
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-left">Sanctory Store</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-2">
                {navItems.map((item) => {
                  const requiresAuth = item.href === "/items" || item.href === "/dashboard"
                  if (requiresAuth && !isAuthenticated) return null
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        pathname === item.href
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                      {item.href === "/checkout" && cartCount > 0 && (
                        <Badge variant="secondary" className="ml-auto">
                          {cartCount}
                        </Badge>
                      )}
                    </Link>
                  )
                })}
                <div className="my-2 border-t" />
                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      logout()
                      setOpen(false)
                    }}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      pathname === "/login"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <LogIn className="h-4 w-4" />
                    Login Admin
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              SS
            </div>
            <span className="hidden font-semibold sm:inline-block">
              Sanctory Store
            </span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const requiresAuth = item.href === "/items" || item.href === "/dashboard"
            if (requiresAuth && !isAuthenticated) return null
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={pathname === item.href ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {item.href === "/checkout" && cartCount > 0 && (
                    <Badge
                      variant={pathname === item.href ? "secondary" : "default"}
                      className="ml-1"
                    >
                      {cartCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          {cartCount > 0 && (
            <Link href="/checkout" className="hidden sm:block">
              <Button variant="outline" size="sm" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden lg:inline">{formatCurrency(cartTotal)}</span>
                <Badge variant="secondary">{cartCount}</Badge>
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          {isAuthenticated ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Logout</span>
            </Button>
          ) : (
            <Link href="/login">
              <Button variant="ghost" size="icon" title="Login">
                <LogIn className="h-5 w-5" />
                <span className="sr-only">Login</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
