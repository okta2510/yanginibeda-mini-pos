"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/header"
import { AuthGuard } from "@/components/auth-guard"
import { useStore, type PaymentMethod } from "@/lib/store"
import { formatCurrency } from "@/lib/currency"
import { printer, generateReceiptText } from "@/lib/printer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Banknote,
  Smartphone,
  CircleDollarSign,
  HelpCircle,
  Bluetooth,
  BluetoothOff,
  Printer,
  CheckCircle2,
  ArrowRight,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const paymentMethods: { value: PaymentMethod; label: string; icon: typeof Banknote; description: string }[] = [
  { value: "Cash", label: "Cash", icon: Banknote, description: "Pembayaran tunai" },
  { value: "QRIS", label: "QRIS", icon: Smartphone, description: "Scan QR untuk bayar" },
  { value: "Transfer", label: "Transfer", icon: CircleDollarSign, description: "Transfer bank" },
  { value: "Other", label: "Lainnya", icon: HelpCircle, description: "Metode lain" },
]

const PRINTER_AUTO_CONNECT_KEY = "printer:autoConnect"
const PRINTER_DEVICE_ID_KEY = "printer:deviceId"
const PRINTER_DEVICE_NAME_KEY = "printer:deviceName"
const DEFAULT_PRINTER_DEVICE_ID = "Irn8cMlUCswQ367SrRwyBA=="

export default function CheckoutPage() {
  const {
    currentOrder,
    removeFromOrder,
    updateOrderItemQuantity,
    clearCurrentOrder,
    createOrder,
  } = useStore()

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [isPrinterConnected, setIsPrinterConnected] = useState(false)
  const [otherPaymentLabel, setOtherPaymentLabel] = useState("")
  const [autoConnectEnabled, setAutoConnectEnabled] = useState(false)
  const [lastPrinterName, setLastPrinterName] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [lastOrder, setLastOrder] = useState<ReturnType<typeof createOrder>>(null)
  const hasAutoConnectRun = useRef(false)

  const subtotal = currentOrder.reduce(
    (sum, item) => sum + item.item.price * item.quantity,
    0
  )

  const connectPrinter = async (isAutoConnect = false) => {
    const savedDeviceId = typeof window !== "undefined"
      ? localStorage.getItem(PRINTER_DEVICE_ID_KEY) || undefined
      : undefined

    const savedDeviceName = typeof window !== "undefined"
      ? localStorage.getItem(PRINTER_DEVICE_NAME_KEY) || undefined
      : undefined

    // For auto-connect, use saved device ID or fall back to default
    const deviceIdToUse = isAutoConnect
      ? (savedDeviceId || DEFAULT_PRINTER_DEVICE_ID)
      : savedDeviceId

    const connected = isAutoConnect
      ? await printer.reconnect(deviceIdToUse, savedDeviceName)
      : await printer.connect(savedDeviceId)

    setIsPrinterConnected(connected)

    if (connected) {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          PRINTER_AUTO_CONNECT_KEY,
          (isAutoConnect || autoConnectEnabled) ? "true" : "false"
        )
        const deviceId = printer.getDeviceId()
        const deviceName = printer.getDeviceName()
        if (deviceId) {
          localStorage.setItem(PRINTER_DEVICE_ID_KEY, deviceId)
        }
        localStorage.setItem(PRINTER_DEVICE_NAME_KEY, deviceName)
        setLastPrinterName(deviceName)
      }
      toast.success(`Terhubung ke ${printer.getDeviceName()}`)
    } else {
      if (!isAutoConnect && !printer.wasCancelled) {
        toast.error("Gagal menghubungkan printer")
      }
    }

    return connected
  }

  const handleConnectPrinter = async () => {
    await connectPrinter(false)
  }

  const handleDisconnectPrinter = () => {
    printer.disconnect()
    setIsPrinterConnected(false)
    toast.info("Printer terputus")
  }

  const handleAutoConnectChange = (checked: boolean) => {
    setAutoConnectEnabled(checked)
    localStorage.setItem(PRINTER_AUTO_CONNECT_KEY, checked ? "true" : "false")

    if (!checked) {
      localStorage.removeItem(PRINTER_DEVICE_ID_KEY)
      return
    }

    if (isPrinterConnected) {
      const deviceId = printer.getDeviceId()
      if (deviceId) {
        localStorage.setItem(PRINTER_DEVICE_ID_KEY, deviceId)
      }
    }
  }

  useEffect(() => {
    if (hasAutoConnectRun.current) return
    hasAutoConnectRun.current = true

    const shouldAutoConnect = localStorage.getItem(PRINTER_AUTO_CONNECT_KEY) === "true"
    const savedPrinterName = localStorage.getItem(PRINTER_DEVICE_NAME_KEY)
    const savedDeviceId = localStorage.getItem(PRINTER_DEVICE_ID_KEY)
    
    // Enable auto-connect on first load if not yet configured
    if (!localStorage.getItem(PRINTER_AUTO_CONNECT_KEY)) {
      localStorage.setItem(PRINTER_AUTO_CONNECT_KEY, "true")
    }
    
    setAutoConnectEnabled(shouldAutoConnect || !savedDeviceId)
    setLastPrinterName(savedPrinterName)

    // On page load, always use auto-reconnect (no user gesture needed)
    // handleConnectPrinter cannot be called from useEffect as it requires user gesture for Bluetooth picker
    void (async () => {
      const connected = await connectPrinter(true)
      if (!connected && (savedDeviceId || savedPrinterName)) {
        toast.info("Auto connect belum berhasil. Coba tombol Hubungkan Printer.")
      }
    })()
  }, [])

  const handleCheckout = async () => {
    if (currentOrder.length === 0) {
      toast.error("Keranjang kosong")
      return
    }

    setIsProcessing(true)

    try {
      const combinedNotes = paymentMethod === "Other" && otherPaymentLabel
        ? [otherPaymentLabel, notes].filter(Boolean).join(" - ")
        : notes

      const order = createOrder(
        paymentMethod,
        customerName || undefined,
        customerPhone || undefined,
        combinedNotes || undefined
      )
      if (order) {
        setLastOrder(order)

        // Print receipt if printer connected
        if (isPrinterConnected) {
          try {
            await printer.printReceipt(order)
          } catch {
            console.error("Print error")
          }
        }

        setSuccessDialogOpen(true)
        setCustomerName("")
        setCustomerPhone("")
        setNotes("")
        setOtherPaymentLabel("")
      }
    } catch {
      toast.error("Gagal memproses pesanan")
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrintReceipt = async () => {
    if (!lastOrder) return

    try {
      let canUsePrinter = isPrinterConnected && printer.isConnected()

      if (!canUsePrinter) {
        const savedDeviceId = localStorage.getItem(PRINTER_DEVICE_ID_KEY) || DEFAULT_PRINTER_DEVICE_ID
        const savedDeviceName = localStorage.getItem(PRINTER_DEVICE_NAME_KEY) || undefined
        const reconnected = await printer.reconnect(savedDeviceId, savedDeviceName)
        setIsPrinterConnected(reconnected)
        canUsePrinter = reconnected
      }

      if (canUsePrinter) {
        await printer.printReceipt(lastOrder)
        toast.success("Struk dicetak")
        return
      }
    } catch {
      setIsPrinterConnected(false)
    }

    const receiptText = generateReceiptText(lastOrder)
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Struk - ${lastOrder.id}</title>
            <style>
              body { font-family: monospace; white-space: pre; padding: 20px; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>${receiptText}</body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleSuccessDialogChange = (open: boolean) => {
    setSuccessDialogOpen(open)
    if (!open) {
      setLastOrder(null)
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Kasir</h1>
          <p className="text-muted-foreground">
            Proses pembayaran dan cetak struk
          </p>
        </div>

        {currentOrder.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Keranjang Kosong</h3>
            <p className="mt-1 text-muted-foreground">
              Tambahkan produk dari halaman beranda
            </p>
            <Link href="/">
              <Button className="mt-4 gap-2">
                Mulai Belanja
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Keranjang ({currentOrder.length} produk)
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearCurrentOrder}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Kosongkan
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentOrder.map((orderItem) => (
                    <div
                      key={orderItem.item.id}
                      className="flex gap-3 rounded-lg border p-3"
                    >
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                        <Image
                          src={orderItem.item.image}
                          alt={orderItem.item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <h4 className="font-medium text-sm line-clamp-1">
                            {orderItem.item.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(orderItem.item.price)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                updateOrderItemQuantity(
                                  orderItem.item.id,
                                  orderItem.quantity - 1
                                )
                              }
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">
                              {orderItem.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                updateOrderItemQuantity(
                                  orderItem.item.id,
                                  orderItem.quantity + 1
                                )
                              }
                              disabled={orderItem.quantity >= orderItem.item.stock}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {formatCurrency(
                                orderItem.item.price * orderItem.quantity
                              )}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => removeFromOrder(orderItem.item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Metode Pembayaran</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    {paymentMethods.map((method) => (
                      <div key={method.value}>
                        <RadioGroupItem
                          value={method.value}
                          id={method.value}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={method.value}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all",
                            "hover:bg-muted/50",
                            "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                          )}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <method.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{method.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {method.description}
                            </p>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                    {paymentMethod === "Other" && (
                      <div className="grid gap-2 pt-4">
                        <Label htmlFor="otherPaymentLabel">Keterangan Metode Lainnya</Label>
                        <Input
                          id="otherPaymentLabel"
                          value={otherPaymentLabel}
                          onChange={(e) => setOtherPaymentLabel(e.target.value)}
                          placeholder="Contoh: GoPay, OVO, Dana..."
                        />
                      </div>
                    )}
                </CardContent>
              </Card>

              {/* Customer Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Info Pelanggan (Opsional)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="customerName">Nama Pelanggan</Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Masukkan nama pelanggan"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="customerPhone">No. HP</Label>
                    <Input
                      id="customerPhone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Masukkan nomor HP pelanggan"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="notes">Catatan</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Catatan untuk pesanan"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="space-y-4">
              <Card className="sticky top-24">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Ringkasan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {currentOrder.map((orderItem) => (
                      <div
                        key={orderItem.item.id}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          {orderItem.item.name} x{orderItem.quantity}
                        </span>
                        <span>
                          {formatCurrency(
                            orderItem.item.price * orderItem.quantity
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-xl text-primary">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Bayar</span>
                    <Badge variant="secondary" className="gap-1">
                      {(() => {
                        const method = paymentMethods.find(
                          (m) => m.value === paymentMethod
                        )
                        if (method) {
                          return (
                            <>
                              <method.icon className="h-3 w-3" />
                              {method.label}
                              {method.value === "Other" && otherPaymentLabel && ` - ${otherPaymentLabel}`}
                            </>
                          )
                        }
                        return null
                      })()}
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-3">
                  {/* Printer Connection */}
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={
                      isPrinterConnected
                        ? handleDisconnectPrinter
                        : handleConnectPrinter
                    }
                  >
                    {isPrinterConnected ? (
                      <>
                        <Bluetooth className="h-4 w-4 text-primary" />
                        Printer Terhubung
                      </>
                    ) : (
                      <>
                        <BluetoothOff className="h-4 w-4" />
                        Hubungkan Printer
                      </>
                    )}
                  </Button>
                  {/* {lastPrinterName && (
                    <div className="w-full rounded-md border border-dashed px-3 py-2 text-center">
                      <p className="text-xs text-muted-foreground">Printer Terakhir</p>
                      <p className="text-sm font-medium truncate">{lastPrinterName}</p>
                    </div>
                  )} */}
                  <div className="flex w-full items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Auto Connect Printer</p>
                      <p className="text-xs text-muted-foreground">
                        Hubungkan otomatis saat membuka kasir
                      </p>
                    </div>
                    <Switch
                      checked={autoConnectEnabled}
                      onCheckedChange={handleAutoConnectChange}
                      aria-label="Auto connect printer"
                    />
                  </div>
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={isProcessing || currentOrder.length === 0}
                  >
                    {isProcessing ? (
                      "Memproses..."
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        Bayar {formatCurrency(subtotal)}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}

        {/* Success Dialog */}
        <Dialog open={successDialogOpen} onOpenChange={handleSuccessDialogChange}>
          <DialogContent className="max-w-sm text-center">
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <DialogTitle className="text-xl">Pembayaran Berhasil!</DialogTitle>
              <DialogDescription>
                Transaksi #{lastOrder?.id.toUpperCase().slice(0, 8)} telah selesai
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-2xl font-bold text-primary">
                  {lastOrder && formatCurrency(lastOrder.total)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {lastOrder?.paymentMethod}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => void handlePrintReceipt()}
                >
                  <Printer className="h-4 w-4" />
                  Cetak Struk
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleSuccessDialogChange(false)}
                >
                  Selesai
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </main>
      </div>
    </AuthGuard>
  )
}
