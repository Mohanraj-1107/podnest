export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductRequest {
  name: string;
  description: string | null;
  price: number;
  stock: number;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerRequest {
  name: string;
  email: string;
  phone: string | null;
}

export type OrderStatus = 'CREATED' | 'PAID' | 'SHIPPED' | 'CANCELLED';

export interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrderRequest {
  customerId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Note {
  id: string;
  title: string;
  content: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteRequest {
  title: string;
  content: string | null;
}

export type NotificationLevel = 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';

export type NotificationType =
  | 'ORDER_CREATED'
  | 'ORDER_CANCELLED'
  | 'ORDER_COMPLETED'
  | 'ORDER_SHIPPED'
  | 'GENERAL';

export interface NotificationItem {
  notificationId: number;
  message: string;
  notificationLevel: NotificationLevel;
  notificationType: NotificationType;
  entityId: number;
  createdOn: string;
  modifiedOn: string | null;
}

export interface NotificationRequest {
  message: string;
  entityId?: number;
  notificationType?: NotificationType;
  notificationLevel?: NotificationLevel;
}

export interface RedisInfo {
  status: string;
  redisVersion: string;
  databaseSize: number;
  uptimeSeconds: number;
}

export interface Counter {
  name: string;
  value: number;
}
