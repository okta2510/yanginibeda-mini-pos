"use client"

import { useMemo, useState } from "react"
import { Header } from "@/components/header"
import { AuthGuard } from "@/components/auth-guard"
import { useStore, type Order, type Item } from "@/lib/store"
import { formatCurrency, formatNumber } from "@/lib/currency"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts"
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Eye,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const COLORS = ["oklch(0.65 0.2 160)", "oklch(0.6 0.15 200)", "oklch(0.65 0.18 280)", "oklch(0.75 0.15 80)"]

function DashboardContent() {
  const { items, orders, getTodayStats } = useStore()
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const todayStats = getTodayStats()

  // Calculate statistics
  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter((o) => o.status === "paid")
      .reduce((sum, o) => sum + o.total, 0)

    const totalOrders = orders.filter((o) => o.status === "paid").length

    const totalItems = items.reduce((sum, i) => sum + i.stock, 0)

    // Get last 7 days data for chart
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date.toDateString()
    })

    const dailyData = last7Days.map((dateStr) => {
      const dayOrders = orders.filter(
        (o) =>
          new Date(o.createdAt).toDateString() === dateStr && o.status === "paid"
      )
      const dayTotal = dayOrders.reduce((sum, o) => sum + o.total, 0)
      const date = new Date(dateStr)
      return {
        name: date.toLocaleDateString("id-ID", { weekday: "short" }),
        total: dayTotal,
        orders: dayOrders.length,
      }
    })

    // Payment method distribution
    const paymentData = orders
      .filter((o) => o.status === "paid")
      .reduce(
        (acc, o) => {
          const method = o.paymentMethod || "Other"
          acc[method] = (acc[method] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

    const paymentChartData = Object.entries(paymentData).map(([name, value]) => ({
      name,
      value,
    }))

    // Category distribution
    const categoryData = items.reduce(
      (acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.stock
        return acc
      },
      {} as Record<string, number>
    )

    const categoryChartData = Object.entries(categoryData).map(([name, value]) => ({
      name: name === "comic" ? "Komik" : "Merchandise",
      value,
    }))

    // Low stock items
    const lowStockItems = items.filter((i) => i.stock <= 5).sort((a, b) => a.stock - b.stock)

    // Best sellers (based on order items)
    const itemSales = orders
      .filter((o) => o.status === "paid")
      .flatMap((o) => o.items)
      .reduce(
        (acc, oi) => {
          acc[oi.item.id] = (acc[oi.item.id] || 0) + oi.quantity
          return acc
        },
        {} as Record<string, number>
      )

    const bestSellers = Object.entries(itemSales)
      .map(([id, qty]) => ({
        item: items.find((i) => i.id === id),
        quantity: qty,
      }))
      .filter((bs) => bs.item)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    return {
      totalRevenue,
      totalOrders,
      totalItems,
      dailyData,
      paymentChartData,
      categoryChartData,
      lowStockItems,
      bestSellers,
    }
  }, [items, orders])

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order)
    setDetailOpen(true)
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Admin</h1>
          <p className="text-muted-foreground">
            Pantau performa toko dan kelola transaksi
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pendapatan Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>Hari ini:</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(todayStats.sales)}
                </span>
                {todayStats.sales > 0 && (
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats.totalOrders)}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>Hari ini:</span>
                <span className="font-medium text-foreground">{todayStats.orders}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{items.length}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>Stok total:</span>
                <span className="font-medium text-foreground">
                  {formatNumber(stats.totalItems)}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Item Terjual Hari Ini</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayStats.items}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {new Date().toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Penjualan 7 Hari Terakhir</CardTitle>
              <CardDescription>Grafik pendapatan harian</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis
                      tickFormatter={(value) =>
                        `${(value / 1000).toFixed(0)}k`
                      }
                      className="text-xs"
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Pendapatan"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar
                      dataKey="total"
                      fill="oklch(0.65 0.2 160)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribusi Pembayaran</CardTitle>
              <CardDescription>Metode pembayaran yang digunakan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {stats.paymentChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.paymentChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {stats.paymentChartData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    Belum ada data transaksi
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Tables */}
        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="orders">Transaksi Terbaru</TabsTrigger>
            <TabsTrigger value="products">Produk</TabsTrigger>
            <TabsTrigger value="lowstock">Stok Menipis</TabsTrigger>
            <TabsTrigger value="bestsellers">Best Sellers</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Transaksi Terbaru</CardTitle>
                <CardDescription>
                  10 transaksi terakhir yang tercatat
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Pelanggan</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Bayar</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.slice(0, 10).map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatDate(order.createdAt)}
                          </TableCell>
                          <TableCell>
                            {order.customerName || "-"}
                          </TableCell>
                          <TableCell>
                            {order.items.reduce((s, i) => s + i.quantity, 0)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(order.total)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{order.paymentMethod}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                order.status === "paid"
                                  ? "default"
                                  : order.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {order.status === "paid"
                                ? "Lunas"
                                : order.status === "pending"
                                ? "Pending"
                                : "Batal"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewOrder(order)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Lihat Detail
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {orders.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground">
                            Belum ada transaksi
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Semua Produk</CardTitle>
                <CardDescription>Daftar semua produk yang tersedia</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Harga</TableHead>
                        <TableHead>Stok</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {item.category === "comic" ? "Komik" : "Merchandise"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(item.price)}</TableCell>
                          <TableCell>{item.stock}</TableCell>
                          <TableCell>
                            {item.stock === 0 ? (
                              <Badge variant="destructive">Habis</Badge>
                            ) : item.stock <= 5 ? (
                              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                                Menipis
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                                Tersedia
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lowstock">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Stok Menipis
                  {stats.lowStockItems.length > 0 && (
                    <Badge variant="destructive">{stats.lowStockItems.length}</Badge>
                  )}
                </CardTitle>
                <CardDescription>Produk dengan stok 5 atau kurang</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.lowStockItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Package className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">
                      Semua produk memiliki stok cukup
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Stok</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.lowStockItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {item.category === "comic" ? "Komik" : "Merchandise"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-destructive">{item.stock}</span>
                            </TableCell>
                            <TableCell>
                              {item.stock === 0 ? (
                                <div className="flex items-center gap-1 text-destructive">
                                  <ArrowDownRight className="h-4 w-4" />
                                  Habis
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-yellow-600">
                                  <ArrowDownRight className="h-4 w-4" />
                                  Menipis
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bestsellers">
            <Card>
              <CardHeader>
                <CardTitle>Produk Terlaris</CardTitle>
                <CardDescription>5 produk dengan penjualan tertinggi</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.bestSellers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <TrendingUp className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">
                      Belum ada data penjualan
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Nama</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Terjual</TableHead>
                          <TableHead>Pendapatan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.bestSellers.map((bs, idx) => (
                          <TableRow key={bs.item!.id}>
                            <TableCell className="font-bold">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{bs.item!.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {bs.item!.category === "comic" ? "Komik" : "Merchandise"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold">{bs.quantity}</span> unit
                            </TableCell>
                            <TableCell className="font-medium text-primary">
                              {formatCurrency(bs.item!.price * bs.quantity)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
                  <ScrollArea className="h-40">
                    <div className="space-y-2">
                      {selectedOrder.items.map((orderItem, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                        >
                          <div>
                            <p className="font-medium text-sm">{orderItem.item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {orderItem.quantity} x {formatCurrency(orderItem.item.price)}
                            </p>
                          </div>
                          <span className="font-semibold">
                            {formatCurrency(orderItem.item.price * orderItem.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-xl font-bold">
                    {formatCurrency(selectedOrder.total)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pembayaran</span>
                  <Badge variant="secondary">{selectedOrder.paymentMethod}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant={
                      selectedOrder.status === "paid"
                        ? "default"
                        : selectedOrder.status === "pending"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {selectedOrder.status === "paid"
                      ? "Lunas"
                      : selectedOrder.status === "pending"
                      ? "Pending"
                      : "Batal"}
                  </Badge>
                </div>
                {selectedOrder.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Catatan</p>
                    <p className="text-sm">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  )
}
