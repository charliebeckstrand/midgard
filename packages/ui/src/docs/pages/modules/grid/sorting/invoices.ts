import type { InvoiceStatus } from '../../../../data/commerce.ts'
import { names } from '../../../../kit/proper-names.ts'

export type Invoice = { id: number; ref: string; amount: string; status: InvoiceStatus }

/** The invoices of the smart sorting example. The amounts are text, as an export gives them. */
export const invoices: Invoice[] = [
	{ id: 1, ref: 'INV-2', amount: '$1,200.00', status: 'due' },
	{ id: 2, ref: 'INV-10', amount: '$90.50', status: 'paid' },
	{ id: 3, ref: 'INV-1', amount: '$340.00', status: 'due' },
]

// The reference of an invoice is a code, which is the same in each language.
names(invoices.map(({ ref }) => ref))
