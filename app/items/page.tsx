"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { AuthGuard } from "@/components/auth-guard"
import { ItemCard } from "@/components/item-card"
import { useStore, type Item, type Category } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Package } from "lucide-react"
import { toast } from "sonner"

const dummyImages = [
  "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1515552726023-7125c8d07fb3?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1503602642458-232111445657?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1491895200222-0fc4a4c35e18?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1503602642458-232111445657?w=400&h=300&fit=crop",
]

interface ItemFormData {
  name: string
  price: string
  category: Category
  image: string
  stock: string
  description: string
}

const initialFormData: ItemFormData = {
  name: "",
  price: "",
  category: "comic",
  image: dummyImages[0],
  stock: "",
  description: "",
}

function ItemsContent() {
  const { items, addItem, updateItem, deleteItem } = useStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [deletingItem, setDeletingItem] = useState<Item | null>(null)
  const [formData, setFormData] = useState<ItemFormData>(initialFormData)

  const handleOpenAdd = () => {
    setEditingItem(null)
    setFormData(initialFormData)
    setDialogOpen(true)
  }

  const handleOpenEdit = (item: Item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      price: item.price.toString(),
      category: item.category,
      image: item.image,
      stock: item.stock.toString(),
      description: item.description || "",
    })
    setDialogOpen(true)
  }

  const handleOpenDelete = (item: Item) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const price = parseInt(formData.price)
    const stock = parseInt(formData.stock)

    if (!formData.name || isNaN(price) || isNaN(stock)) {
      toast.error("Mohon lengkapi semua field")
      return
    }

    if (editingItem) {
      updateItem(editingItem.id, {
        name: formData.name,
        price,
        category: formData.category,
        image: formData.image,
        stock,
        description: formData.description,
      })
      toast.success("Produk berhasil diupdate")
    } else {
      addItem({
        name: formData.name,
        price,
        category: formData.category,
        image: formData.image,
        stock,
        description: formData.description,
      })
      toast.success("Produk berhasil ditambahkan")
    }

    setDialogOpen(false)
    setFormData(initialFormData)
    setEditingItem(null)
  }

  const handleDelete = () => {
    if (deletingItem) {
      deleteItem(deletingItem.id)
      toast.success("Produk berhasil dihapus")
    }
    setDeleteDialogOpen(false)
    setDeletingItem(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kelola Produk</h1>
            <p className="text-muted-foreground">
              Tambah, edit, dan hapus produk toko
            </p>
          </div>
          <Button onClick={handleOpenAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Tambah Produk
          </Button>
        </div>

        {/* Products Grid */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Belum ada produk</h3>
            <p className="mt-1 text-muted-foreground">
              Mulai dengan menambahkan produk pertama
            </p>
            <Button onClick={handleOpenAdd} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Tambah Produk
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                showActions={false}
                onEdit={handleOpenEdit}
                onDelete={handleOpenDelete}
              />
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Produk" : "Tambah Produk Baru"}
              </DialogTitle>
              <DialogDescription>
                {editingItem
                  ? "Ubah informasi produk di bawah ini"
                  : "Isi informasi produk baru di bawah ini"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nama Produk</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Masukkan nama produk"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="price">Harga (Rp)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      placeholder="45000"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="stock">Stok</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData({ ...formData, stock: e.target.value })
                      }
                      placeholder="25"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Kategori</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: Category) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comic">Komik</SelectItem>
                      <SelectItem value="merchandise">Merchandise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="image">Gambar</Label>
                  <Select
                    value={formData.image}
                    onValueChange={(value) =>
                      setFormData({ ...formData, image: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih gambar" />
                    </SelectTrigger>
                    <SelectContent>
                      {dummyImages.map((img, idx) => (
                        <SelectItem key={img} value={img}>
                          Gambar {idx + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Deskripsi (opsional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Deskripsi singkat produk"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit">
                  {editingItem ? "Simpan" : "Tambah"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Produk?</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus &quot;{deletingItem?.name}&quot;?
                Tindakan ini tidak dapat dibatalkan.
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

export default function ItemsPage() {
  return (
    <AuthGuard>
      <ItemsContent />
    </AuthGuard>
  )
}
