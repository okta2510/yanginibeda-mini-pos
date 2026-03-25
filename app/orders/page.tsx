"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { useStore, type Order } from "@/lib/store"
import { formatCurrency } from "@/lib/currency"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Receipt,
  Eye,
  Trash2,
  Printer,
  ShoppingCart,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
  CircleDollarSign,
  HelpCircle,
} from "lucide-react"
import { printer, generateReceiptText } from "@/lib/printer"
import { toast } from "sonner"

const paymentIcons = {
  Cash: Banknote,
  QRIS: Smartphone,
  Transfer: CircleDollarSign,
  Other: HelpCircle,
}

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  paid: "bg-green-500/10 text-green-600 dark:text-green-400",
  cancelled: "bg-red-500/10 text-red-600 dark:text-red-400",
}

const statusLabels = {
  pending: "Menunggu",
  paid: "Lunas",
  cancelled: "Dibatalkan",
}

export default function OrdersPage() {
  const { orders, deleteOrder } = useStore()
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null)

  const handleViewDetail = (order: Order) => {
    setSelectedOrder(order)
    setDetailOpen(true)
  }

  const handleOpenDelete = (order: Order) => {
    setDeletingOrder(order)
    setDeleteOpen(true)
  }

  const handleDelete = () => {
    if (deletingOrder) {
      deleteOrder(deletingOrder.id)
      toast.success("Pesanan berhasil dihapus")
    }
    setDeleteOpen(false)
    setDeletingOrder(null)
  }

  const handlePrint = async (order: Order) => {
    if (printer.isConnected()) {
      try {
        await printer.printReceipt(order)
        toast.success("Struk berhasil dicetak")
      } catch {
        toast.error("Gagal mencetak struk")
      }
    } else {
      // Show receipt text for manual print
      const receiptText = generateReceiptText(order)
      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Struk - ${order.id}</title>
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
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Riwayat Pesanan</h1>
          <p className="text-muted-foreground">
            Lihat semua transaksi yang telah dilakukan
          </p>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Receipt className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Belum ada pesanan</h3>
            <p className="mt-1 text-muted-foreground">
              Transaksi akan muncul di sini setelah checkout
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => {
              const PaymentIcon = paymentIcons[order.paymentMethod || "Other"]
              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Receipt className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            #{order.id.toUpperCase().slice(0, 8)}
                          </CardTitle>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(order.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={statusColors[order.status]}
                        >
                          {statusLabels[order.status]}
                        </Badge>
                        <Badge variant="secondary" className="gap-1">
                          <PaymentIcon className="h-3 w-3" />
                          {order.paymentMethod}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ShoppingCart className="h-4 w-4" />
                          <span>
                            {order.items.reduce((s, i) => s + i.quantity, 0)} item
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CreditCard className="h-4 w-4" />
                          <span className="font-semibold text-foreground">
                            {formatCurrency(order.total)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetail(order)}
                          className="gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          Detail
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrint(order)}
                          className="gap-1"
                        >
                          <Printer className="h-4 w-4" />
                          Cetak
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDelete(order)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Order Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Detail Pesanan #{selectedOrder?.id.toUpperCase().slice(0, 8)}
              </DialogTitle>
              <DialogDescription>
                {selectedOrder && formatDate(selectedOrder.createdAt)}
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                {selectedOrder.customerName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Pelanggan</p>
                    <p className="font-medium">{selectedOrder.customerName}</p>
                  </div>
                )}
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">Item</p>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {selectedOrder.items.map((orderItem, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                        >
                          <div>
                            <p className="font-medium text-sm">
                              {orderItem.item.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {orderItem.quantity} x{" "}
                              {formatCurrency(orderItem.item.price)}
                            </p>
                          </div>
                          <span className="font-semibold">
                            {formatCurrency(
                              orderItem.item.price * orderItem.quantity
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-xl font-bold">
                    {formatCurrency(selectedOrder.total)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pembayaran</span>
                  <Badge variant="secondary" className="gap-1">
                    {(() => {
                      const Icon =
                        paymentIcons[selectedOrder.paymentMethod || "Other"]
                      return <Icon className="h-3 w-3" />
                    })()}
                    {selectedOrder.paymentMethod}
                  </Badge>
                </div>
                {selectedOrder.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Catatan</p>
                    <p className="text-sm">{selectedOrder.notes}</p>
                  </div>
                )}
                <Button
                  className="w-full gap-2"
                  onClick={() => {
                    handlePrint(selectedOrder)
                    setDetailOpen(false)
                  }}
                >
                  <Printer className="h-4 w-4" />
                  Cetak Struk
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Pesanan?</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus pesanan #
                {deletingOrder?.id.toUpperCase().slice(0, 8)}? Tindakan ini tidak
                dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}
