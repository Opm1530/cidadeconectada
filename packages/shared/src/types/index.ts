// ─────────────────────────────────────────────
// TIPOS COMPARTILHADOS - WEB + MOBILE
// ─────────────────────────────────────────────

export type Role = 'SUPER_ADMIN' | 'CITY_ADMIN' | 'COMPANY_OWNER' | 'CUSTOMER' | 'DELIVERY_DRIVER'
export type ProductType = 'PRODUCT' | 'SERVICE'
export type OptionType = 'SINGLE' | 'MULTIPLE'
export type OrderStatus =
  | 'CREATED'
  | 'WAITING_PAYMENT'
  | 'PAID'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
export type DeliveryType = 'PICKUP' | 'OWN_DELIVERY' | 'PLATFORM_DRIVER'
export type PaymentMethod = 'MERCADO_PAGO' | 'PIX' | 'CASH_ON_DELIVERY'
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED'
export type DriverStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'
export type DeliveryStatus = 'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED' | 'FAILED'

// ─── Auth ───

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
  cityId?: string | null
  avatarUrl?: string | null
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  phone?: string
  password: string
  cityId?: string
}

// ─── City ───

export interface City {
  id: string
  name: string
  state: string
  slug: string
  active: boolean
  freeCompanyRegistration: boolean
  maxDrivers?: number | null
  createdAt: string
}

// ─── Company ───

export interface Company {
  id: string
  name: string
  slug: string
  description?: string | null
  logoUrl?: string | null
  coverUrl?: string | null
  phone?: string | null
  whatsapp?: string | null
  address?: string | null
  category?: string | null
  active: boolean
  cityId: string
  // Pagamentos
  acceptsMercadoPago: boolean
  acceptsPix: boolean
  pixKey?: string | null
  acceptsCashOnDelivery: boolean
  // Entrega
  hasOwnDelivery: boolean
  ownDeliveryFee?: number | null
  acceptsPlatformDrivers: boolean
  createdAt: string
}

// ─── Product ───

export interface ProductOption {
  id: string
  name: string
  priceAdd: number
  active: boolean
  order: number
}

export interface ProductOptionGroup {
  id: string
  name: string
  type: OptionType
  required: boolean
  minSelect: number
  maxSelect: number
  order: number
  options: ProductOption[]
}

export interface Product {
  id: string
  name: string
  description?: string | null
  price: number
  imageUrl?: string | null
  category?: string | null
  type: ProductType
  active: boolean
  order: number
  companyId: string
  optionGroups: ProductOptionGroup[]
}

// ─── Cart (estado local — não persiste no banco) ───

export interface CartItemOption {
  groupId: string
  groupName: string
  optionId: string
  optionName: string
  priceAdd: number
}

export interface CartItem {
  product: Product
  quantity: number
  selectedOptions: CartItemOption[]
  notes?: string
  unitPrice: number   // preço base + adicionais
  totalPrice: number  // unitPrice * quantity
}

export interface Cart {
  companyId: string
  companyName: string
  cityId: string
  items: CartItem[]
  subtotal: number
}

// ─── Order ───

export interface OrderItemOptionSnapshot {
  id: string
  name: string
  priceAdd: number
}

export interface OrderItemSnapshot {
  id: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  notes?: string | null
  options: OrderItemOptionSnapshot[]
}

export interface Order {
  id: string
  number: number
  status: OrderStatus
  companyId: string
  company?: Pick<Company, 'id' | 'name' | 'logoUrl' | 'whatsapp'>
  customerId: string
  deliveryType: DeliveryType
  deliveryAddress?: string | null
  deliveryFee: number
  subtotal: number
  total: number
  notes?: string | null
  items: OrderItemSnapshot[]
  payment?: Payment | null
  delivery?: Delivery | null
  createdAt: string
  updatedAt: string
}

// ─── Payment ───

export interface Payment {
  id: string
  method: PaymentMethod
  status: PaymentStatus
  amount: number
  mercadoPagoCheckoutUrl?: string | null
  pixKey?: string | null
  confirmedAt?: string | null
}

// ─── Delivery Driver ───

export interface DeliveryDriver {
  id: string
  userId: string
  cityId: string
  status: DriverStatus
  deliveryFee: number
  vehicle?: string | null
  vehiclePlate?: string | null
  active: boolean
  user?: {
    name: string
    phone?: string | null
    avatarUrl?: string | null
  }
}

// ─── Delivery ───

export interface Delivery {
  id: string
  orderId: string
  driverId?: string | null
  driver?: Pick<DeliveryDriver, 'id' | 'deliveryFee' | 'vehicle'> & {
    user: { name: string; phone?: string | null }
  }
  status: DeliveryStatus
  confirmationCode: string
  acceptedAt?: string | null
  pickedUpAt?: string | null
  deliveredAt?: string | null
}

// ─── Pagination ───

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

// ─── API Response ───

export interface ApiResponse<T = void> {
  success: boolean
  data?: T
  message?: string
  error?: string
}
