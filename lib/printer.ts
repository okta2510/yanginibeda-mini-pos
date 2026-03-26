import type { Order } from './store'
import { formatCurrency } from './currency'

interface BluetoothDevice {
  id?: string
  gatt?: {
    connect: () => Promise<BluetoothRemoteGATTServer>
  }
  name?: string
  addEventListener: (event: string, handler: () => void) => void
  removeEventListener: (event: string, handler: () => void) => void
}

interface WebBluetooth {
  requestDevice: (options: {
    filters?: { name?: string; namePrefix?: string; services?: string[] }[]
    optionalServices?: string[]
    acceptAllDevices?: boolean
  }) => Promise<BluetoothDevice>
  getDevices?: () => Promise<BluetoothDevice[]>
}

declare global {
  interface Navigator {
    bluetooth?: WebBluetooth
  }
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
  private onDisconnected: (() => void) | null = null
  private _wasCancelled = false

  get wasCancelled(): boolean {
    return this._wasCancelled
  }
  

  private async connectToDevice(device: BluetoothDevice): Promise<boolean> {
    if (!device.gatt) {
      throw new Error('GATT tidak tersedia')
    }

    // Remove previous disconnect listener if any
    if (this.device && this.onDisconnected) {
      this.device.removeEventListener('gattserverdisconnected', this.onDisconnected)
    }

    this.device = device
    this.server = await device.gatt.connect()
    const service = await this.server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb')
    this.characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb')

    // Listen for unexpected disconnects and attempt to reconnect
    this.onDisconnected = () => {
      this.server = null
      this.characteristic = null
      if (device.gatt) {
        device.gatt.connect()
          .then((server) => {
            this.server = server
            return server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb')
          })
          .then((service) => service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb'))
          .then((char) => { this.characteristic = char })
          .catch(() => { /* reconnect failed silently */ })
      }
    }
    device.addEventListener('gattserverdisconnected', this.onDisconnected)

    return true
  }

  // Step 1+2: First-time pairing — shows device picker (requires user gesture)
  // Saves device.id in caller (checkout page) for future reconnects
  async connect(preferredDeviceId?: string): Promise<boolean> {
    this._wasCancelled = false
    try {
      if (!navigator.bluetooth) {
        throw new Error('Bluetooth tidak didukung di browser ini')
      }

      // Try Step 3 first: reconnect via previously granted permission (no picker)
      if (preferredDeviceId) {
        const reconnected = await this.reconnect(preferredDeviceId)
        if (reconnected) {
          return true
        }
      }

      // Fall back to Step 1: show device picker (requires user gesture click)
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
      })

      return await this.connectToDevice(device)
    } catch (error) {
      // User dismissed the Bluetooth picker — not a real error, ignore silently
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        this._wasCancelled = true
        return false
      }
      console.error('Bluetooth connection error:', error)
      return false
    }
  }

  // Step 3 of recommended Web Bluetooth workaround:
  // Reconnect using previously granted permission — no picker shown.
  // Works only after user already granted permission via requestDevice.
  async reconnect(deviceId?: string, deviceName?: string): Promise<boolean> {
    try {
      console.debug('Attempting Bluetooth reconnect...', { deviceId, deviceName }, navigator.bluetooth) // Debug log to verify Bluetooth API availability and parameters
      if (!navigator.bluetooth) {
        return false
      }

      // Some browsers expose requestDevice but not getDevices.
      // In that case we can only reuse the in-memory device reference for this tab session.
      if (typeof navigator.bluetooth.getDevices !== 'function') {
        if (this.device) {
          const idMatches = !deviceId || this.device.id === deviceId
          const nameMatches = !deviceName || this.device.name === deviceName
          if (idMatches || nameMatches) {
            return await this.connectToDevice(this.device)
          }
        }
        return false
      }

      // getDevices() returns only devices the user has already granted permission for
      const devices = await navigator.bluetooth.getDevices()
      if (!devices.length) return false

      let targetDevice: BluetoothDevice | undefined
      // Step 3a: find by exact saved device ID (most reliable)
      if (deviceId) {
        targetDevice = devices.find((device) => device.id === deviceId)
      }

      // Step 3b: fall back to name match if ID not found
      if (!targetDevice && deviceName) {
        targetDevice = devices.find((device) => device.name === deviceName)
      }

      // Do NOT fall back to devices[0] — that could connect to the wrong printer
      if (!targetDevice) return false

      return await this.connectToDevice(targetDevice)
    } catch (error) {
      console.error('Bluetooth reconnect error:', error)
      return false
    }
  }

  disconnect(): void {
    if (this.device && this.onDisconnected) {
      this.device.removeEventListener('gattserverdisconnected', this.onDisconnected)
      this.onDisconnected = null
    }
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

  getDeviceId(): string | null {
    return this.device?.id ?? null
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
    await this.write(COMMANDS.NORMAL_SIZE)
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
    if (order.customerPhone) {
      await this.write(this.textToBytes(`No. HP: ${order.customerPhone}`))
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
  receipt += 'Komik & Merchandise Sant & santa\n'
  receipt += '================================\n'
  receipt += `No: ${order.id.toUpperCase()}\n`
  receipt += `Tanggal: ${dateStr} ${timeStr}\n`
  if (order.customerName) {
    receipt += `Pelanggan: ${order.customerName}\n`
  }
  if (order.customerPhone) {
    receipt += `No. HP: ${order.customerPhone}\n`
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
  receipt += '      Tuhan memberkati\n'
  receipt += '================================\n'

  return receipt
}
