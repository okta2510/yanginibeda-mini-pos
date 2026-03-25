"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useStore, type Item } from "@/lib/store"
import { formatCurrency } from "@/lib/currency"
import { Plus, Minus, ShoppingCart, Package } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ItemCardProps {
  item: Item
  showActions?: boolean
  onEdit?: (item: Item) => void
  onDelete?: (item: Item) => void
  priority?: boolean
}

export function ItemCard({ item, showActions = true, onEdit, onDelete, priority = false }: ItemCardProps) {
  const { currentOrder, addToOrder, removeFromOrder, updateOrderItemQuantity } = useStore()

  const orderItem = currentOrder.find((o) => o.item.id === item.id)
  const quantity = orderItem?.quantity ?? 0
  const isOutOfStock = item.stock <= 0

  const handleAdd = () => {
    if (isOutOfStock) {
      toast.error("Stok habis")
      return
    }
    if (quantity >= item.stock) {
      toast.error(`Stok tersisa: ${item.stock}`)
      return
    }
    addToOrder(item)
    toast.success(`${item.name} ditambahkan ke keranjang`)
  }

  const handleRemove = () => {
    if (quantity <= 1) {
      removeFromOrder(item.id)
    } else {
      updateOrderItemQuantity(item.id, quantity - 1)
    }
  }

  return (
    <Card className={cn(
      "group overflow-hidden transition-all hover:shadow-lg",
      isOutOfStock && "opacity-60"
    )}>
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={item.image}
          alt={item.name}
          fill
          priority={priority}
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <Badge variant={item.category === "comic" ? "default" : "secondary"}>
            {item.category === "comic" ? "Komik" : "Merchandise"}
          </Badge>
          {isOutOfStock && (
            <Badge variant="destructive">Habis</Badge>
          )}
        </div>
        {quantity > 0 && (
          <div className="absolute left-2 top-2">
            <Badge className="bg-primary text-primary-foreground">
              {quantity} di keranjang
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold leading-tight line-clamp-2 min-h-[2.5rem]">
          {item.name}
        </h3>
        {item.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {item.description}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-lg font-bold text-primary">
            {formatCurrency(item.price)}
          </span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Package className="h-3 w-3" />
            <span>Stok: {item.stock}</span>
          </div>
        </div>
      </CardContent>
      {showActions && (
        <CardFooter className="p-4 pt-0">
          {quantity > 0 ? (
            <div className="flex w-full items-center justify-between gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleRemove}
                className="h-9 w-9"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="font-semibold">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleAdd}
                disabled={isOutOfStock || quantity >= item.stock}
                className="h-9 w-9"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              className="w-full gap-2"
              onClick={handleAdd}
              disabled={isOutOfStock}
            >
              <ShoppingCart className="h-4 w-4" />
              Tambah
            </Button>
          )}
        </CardFooter>
      )}
      {(onEdit || onDelete) && (
        <CardFooter className="border-t p-4 pt-4">
          <div className="flex w-full gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onEdit(item)}
              >
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={() => onDelete(item)}
              >
                Hapus
              </Button>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  )
}
