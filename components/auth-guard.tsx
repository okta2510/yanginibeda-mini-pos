"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Spinner } from "@/components/ui/spinner"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const isAuthenticated = useStore((state) => state.isAuthenticated)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Small delay to let zustand rehydrate from localStorage
    const timer = setTimeout(() => {
      setIsChecking(false)
      if (!isAuthenticated) {
        router.push("/login")
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [isAuthenticated, router])

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
