"use client"

import { useState, useMemo } from "react"
import { Header } from "@/components/header"
import { ItemCard } from "@/components/item-card"
import { useStore, type Category } from "@/lib/store"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, BookOpen, ShoppingBag, Sparkles } from "lucide-react"

export default function HomePage() {
  const items = useStore((state) => state.items)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<Category | "all">("all")

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = category === "all" || item.category === category
      return matchesSearch && matchesCategory
    })
  }, [items, search, category])

  const comicCount = items.filter((i) => i.category === "comic").length
  const merchandiseCount = items.filter((i) => i.category === "merchandise").length

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {/* Hero Section */}
        <section className="mb-8 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Selamat Datang di Sanctory Store
              </h1>
              <p className="mt-1 text-muted-foreground">
                Temukan koleksi komik dan merchandise santo terlengkap
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="text-sm">
                <p className="font-medium">{items.length} Produk</p>
                <p className="text-muted-foreground">Tersedia</p>
              </div>
            </div>
          </div>
        </section>

        {/* Search and Filter */}
        <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={category} onValueChange={(v) => setCategory(v as Category | "all")}>
            <TabsList>
              <TabsTrigger value="all" className="gap-2">
                Semua
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  ({items.length})
                </span>
              </TabsTrigger>
              <TabsTrigger value="comic" className="gap-2">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Komik</span>
                <span className="text-xs text-muted-foreground">({comicCount})</span>
              </TabsTrigger>
              <TabsTrigger value="merchandise" className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline">Merchandise</span>
                <span className="text-xs text-muted-foreground">({merchandiseCount})</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </section>

        {/* Products Grid */}
        <section>
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Tidak ada produk</h3>
              <p className="mt-1 text-muted-foreground">
                {search
                  ? `Tidak ada hasil untuk "${search}"`
                  : "Belum ada produk dalam kategori ini"}
              </p>
              {search && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setSearch("")}
                >
                  Hapus pencarian
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredItems.map((item, index) => (
                <ItemCard key={item.id} item={item} priority={index < 4} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
