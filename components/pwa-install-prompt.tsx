"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Download, Smartphone, Wifi, Zap, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered:", registration.scope)
        })
        .catch((error) => {
          console.log("SW registration failed:", error)
        })
    }

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
      return
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(isIOSDevice)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Check if user has dismissed before
      const dismissed = localStorage.getItem("pwa-prompt-dismissed")
      const dismissedAt = localStorage.getItem("pwa-prompt-dismissed-at")
      
      // Show again after 7 days
      if (dismissed && dismissedAt) {
        const daysPassed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24)
        if (daysPassed < 7) return
      }
      
      // Show modal after 2 seconds
      setTimeout(() => setShowModal(true), 2000)
    }

    window.addEventListener("beforeinstallprompt", handler)

    // For iOS, show the manual instruction modal after delay
    if (isIOSDevice) {
      const dismissed = localStorage.getItem("pwa-prompt-dismissed")
      const dismissedAt = localStorage.getItem("pwa-prompt-dismissed-at")
      
      if (dismissed && dismissedAt) {
        const daysPassed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24)
        if (daysPassed < 7) return
      }
      
      setTimeout(() => setShowModal(true), 3000)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      setIsInstalled(true)
    }

    setDeferredPrompt(null)
    setShowModal(false)
  }

  const handleDismiss = () => {
    setShowModal(false)
    localStorage.setItem("pwa-prompt-dismissed", "true")
    localStorage.setItem("pwa-prompt-dismissed-at", Date.now().toString())
  }

  if (isInstalled) return null

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-3xl shadow-lg">
              SS
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Install Sanctory POS
          </DialogTitle>
          <DialogDescription className="text-center">
            Install aplikasi untuk akses lebih cepat dan pengalaman yang lebih baik
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Akses Cepat</p>
              <p className="text-xs text-muted-foreground">
                Buka langsung dari home screen
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Wifi className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Mode Offline</p>
              <p className="text-xs text-muted-foreground">
                Tetap bisa diakses tanpa internet
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Seperti Aplikasi Native</p>
              <p className="text-xs text-muted-foreground">
                Fullscreen tanpa address bar
              </p>
            </div>
          </div>
        </div>

        {isIOS ? (
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm font-medium mb-2">Cara Install di iOS:</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Tap tombol Share di Safari</li>
              <li>Scroll dan pilih &quot;Add to Home Screen&quot;</li>
              <li>Tap &quot;Add&quot; di pojok kanan atas</li>
            </ol>
          </div>
        ) : null}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {!isIOS && deferredPrompt ? (
            <Button onClick={handleInstall} className="w-full gap-2">
              <Download className="h-4 w-4" />
              Install Sekarang
            </Button>
          ) : null}
          <Button variant="outline" onClick={handleDismiss} className="w-full">
            Nanti Saja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
