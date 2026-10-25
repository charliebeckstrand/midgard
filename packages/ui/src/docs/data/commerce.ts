import { profiles } from './people.ts'
import { words } from './words.ts'

// The store of the demos (CONVENTIONS.md §13.8): its orders, invoices,
// regions, products, and the countries of its customers.

/** The status of an order. */
export const orderStatuses = words('order-status', {
	pending: 'Pending',
	processing: 'Processing',
	completed: 'Completed',
})

export type OrderStatus = keyof typeof orderStatuses

/** The status of an invoice. */
export const invoiceStatuses = words('invoice-status', { paid: 'Paid', due: 'Due' })

export type InvoiceStatus = keyof typeof invoiceStatuses

/** The sales regions of the store. A chart or a group reads the word, so the data holds it. */
export const regions = words('region', {
	north: 'North',
	south: 'South',
	east: 'East',
	west: 'West',
})

/** The products of the store, in palette order, so a filter never moves the color of a product. */
export const products = words('product', { tea: 'Tea', coffee: 'Coffee', cocoa: 'Cocoa' })

/** The countries of the customers of the store. */
export const countries = words('country', {
	norway: 'Norway',
	japan: 'Japan',
	brazil: 'Brazil',
	canada: 'Canada',
})

export type Order = {
	/** The reference of the order, such as `ORD-7291`. */
	id: string
	/** The name of the person who placed the order. */
	customer: string
	status: OrderStatus
	/** The amount in dollars. */
	amount: number
}

/** The statuses of the orders, in turn. */
const ORDER_STATUSES: readonly OrderStatus[] = [
	'completed',
	'processing',
	'completed',
	'pending',
	'completed',
	'processing',
]

/** The amounts of the orders, in turn. */
const ORDER_AMOUNTS = [1999, 39, 299, 99, 149, 59]

/** The recent orders of the store, one for each of the first six people. */
export const orders: readonly Order[] = profiles.slice(0, 6).map((person, index) => ({
	id: `ORD-${7291 + index}`,
	customer: person.name,
	status: ORDER_STATUSES[index] ?? 'pending',
	amount: ORDER_AMOUNTS[index] ?? 0,
}))
