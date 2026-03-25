import type { Order } from './store'
import { formatCurrency } from './currency'

interface BluetoothDevice {
  gatt?: {
    connect: () => Promise<BluetoothRemoteGATTServer>
  }
  name?: string
}

interface BluetoothRemoteGATTServer {
  getPrimaryService: (service: string) => Promise<BluetoothRemoteGATTService>
  connected: boolean
  disconnect: () => void
}

interface BluetoothRemoteGATTService {
  getCharacteristic: (characteristic: string) => Promise<BluetoothRemoteGATTCharacteristic>
}

interface BluetoothRemoteGATTCharacteristic {
  writeValue: (value: BufferSource) => Promise<void>
}

// ESC/POS Commands
const ESC = 0x1b
const GS = 0x1d

const COMMANDS = {
  INIT: [ESC, 0x40],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT: [GS, 0x21, 0x10],
  DOUBLE_WIDTH: [GS, 0x21, 0x20],
  DOUBLE_SIZE: [GS, 0x21, 0x30],
  NORMAL_SIZE: [GS, 0x21, 0x00],
  CUT_PAPER: [GS, 0x56, 0x00],
  FEED_LINE: [0x0a],
}

class ThermalPrinter {
  private device: BluetoothDevice | null = null
  private server: BluetoothRemoteGATTServer | null = null
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null

  async connect(): Promise<boolean> {
    try {
      if (!navigator.bluetooth) {
        throw new Error('Bluetooth tidak didukung di browser ini')
      }

      this.device = await (navigator.bluetooth as { requestDevice: (options: { filters?: { services?: string[] }[], optionalServices?: string[], acceptAllDevices?: boolean }) => Promise<BluetoothDevice> }).requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
      })

      if (!this.device.gatt) {
        throw new Error('GATT tidak tersedia')
      }

      this.server = await this.device.gatt.connect()
      const service = await this.server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb')
      this.characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb')

      return true
    } catch (error) {
      console.error('Bluetooth connection error:', error)
      return false
    }
  }

  disconnect(): void {
    if (this.server?.connected) {
      this.server.disconnect()
    }
    this.device = null
    this.server = null
    this.characteristic = null
  }

  isConnected(): boolean {
    return this.server?.connected ?? false
  }

  getDeviceName(): string {
    return this.device?.name ?? 'Unknown Device'
  }

  private async write(data: number[]): Promise<void> {
    if (!this.characteristic) {
      throw new Error('Printer tidak terhubung')
    }
    await this.characteristic.writeValue(new Uint8Array(data))
  }

  private textToBytes(text: string): number[] {
    const encoder = new TextEncoder()
    return Array.from(encoder.encode(text))
  }

  async printReceipt(order: Order): Promise<void> {
    if (!this.characteristic) {
      throw new Error('Printer tidak terhubung')
    }

    const date = new Date(order.createdAt)
    const dateStr = date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    const timeStr = date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })

    // Initialize printer
    await this.write(COMMANDS.INIT)

    // Header
    await this.write(COMMANDS.ALIGN_CENTER)
    await this.write(COMMANDS.DOUBLE_SIZE)
    await this.write(this.textToBytes('SANCTORY STORE'))
    await this.write(COMMANDS.FEED_LINE)
    await this.write(COMMANDS.NORMAL_SIZE)
    await this.write(this.textToBytes('Komik & Merchandise Santo'))
    await this.write(COMMANDS.FEED_LINE)
    await this.write(this.textToBytes('================================'))
    await this.write(COMMANDS.FEED_LINE)

    // Order Info
    await this.write(COMMANDS.ALIGN_LEFT)
    await this.write(this.textToBytes(`No: ${order.id.toUpperCase()}`))
    await this.write(COMMANDS.FEED_LINE)
    await this.write(this.textToBytes(`Tanggal: ${dateStr} ${timeStr}`))
    await this.write(COMMANDS.FEED_LINE)
    if (order.customerName) {
      await this.write(this.textToBytes(`Pelanggan: ${order.customerName}`))
      await this.write(COMMANDS.FEED_LINE)
    }
    await this.write(this.textToBytes('--------------------------------'))
    await this.write(COMMANDS.FEED_LINE)

    // Items
    for (const orderItem of order.items) {
      await this.write(this.textToBytes(orderItem.item.name))
      await this.write(COMMANDS.FEED_LINE)
      await this.write(
        this.textToBytes(
          `  ${orderItem.quantity} x ${formatCurrency(orderItem.item.price)} = ${formatCurrency(orderItem.item.price * orderItem.quantity)}`
        )
      )
      await this.write(COMMANDS.FEED_LINE)
    }

    await this.write(this.textToBytes('--------------------------------'))
    await this.write(COMMANDS.FEED_LINE)

    // Total
    await this.write(COMMANDS.BOLD_ON)
    await this.write(this.textToBytes(`TOTAL: ${formatCurrency(order.total)}`))
    await this.write(COMMANDS.BOLD_OFF)
    await this.write(COMMANDS.FEED_LINE)
    await this.write(this.textToBytes(`Bayar: ${order.paymentMethod}`))
    await this.write(COMMANDS.FEED_LINE)

    // Notes
    if (order.notes) {
      await this.write(this.textToBytes('--------------------------------'))
      await this.write(COMMANDS.FEED_LINE)
      await this.write(this.textToBytes(`Catatan: ${order.notes}`))
      await this.write(COMMANDS.FEED_LINE)
    }

    // Footer
    await this.write(this.textToBytes('================================'))
    await this.write(COMMANDS.FEED_LINE)
    await this.write(COMMANDS.ALIGN_CENTER)
    await this.write(this.textToBytes('Terima kasih!'))
    await this.write(COMMANDS.FEED_LINE)
    await this.write(this.textToBytes('Semoga diberkati'))
    await this.write(COMMANDS.FEED_LINE)
    await this.write(COMMANDS.FEED_LINE)
    await this.write(COMMANDS.FEED_LINE)

    // Cut paper
    await this.write(COMMANDS.CUT_PAPER)
  }
}

export const printer = new ThermalPrinter()

// Generate receipt text for preview or manual print
export function generateReceiptText(order: Order): string {
  const date = new Date(order.createdAt)
  const dateStr = date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const timeStr = date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })

  let receipt = ''
  receipt += '================================\n'
  receipt += '       SANCTORY STORE\n'
  receipt += '    Komik & Merchandise Santo\n'
  receipt += '================================\n'
  receipt += `No: ${order.id.toUpperCase()}\n`
  receipt += `Tanggal: ${dateStr} ${timeStr}\n`
  if (order.customerName) {
    receipt += `Pelanggan: ${order.customerName}\n`
  }
  receipt += '--------------------------------\n'

  for (const orderItem of order.items) {
    receipt += `${orderItem.item.name}\n`
    receipt += `  ${orderItem.quantity} x ${formatCurrency(orderItem.item.price)} = ${formatCurrency(orderItem.item.price * orderItem.quantity)}\n`
  }

  receipt += '--------------------------------\n'
  receipt += `TOTAL: ${formatCurrency(order.total)}\n`
  receipt += `Bayar: ${order.paymentMethod}\n`

  if (order.notes) {
    receipt += '--------------------------------\n'
    receipt += `Catatan: ${order.notes}\n`
  }

  receipt += '================================\n'
  receipt += '       Terima kasih!\n'
  receipt += '      Semoga diberkati\n'
  receipt += '================================\n'

  return receipt
}
