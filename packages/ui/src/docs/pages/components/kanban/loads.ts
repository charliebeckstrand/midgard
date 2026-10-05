export type Load = { id: string; code: string; customer: string; weight: string }

export type Column = { id: string; title: string; items: Load[] }

export const columns: Column[] = [
	{
		id: 'booked',
		title: 'Booked',
		items: [
			{ id: 'l-1001', code: 'LD-1001', customer: 'Acme Freight', weight: '28,400 lb' },
			{ id: 'l-1002', code: 'LD-1002', customer: 'Northwind', weight: '14,100 lb' },
		],
	},
	{
		id: 'assigned',
		title: 'Assigned',
		items: [{ id: 'l-1003', code: 'LD-1003', customer: 'Globex', weight: '32,000 lb' }],
	},
	{
		id: 'in-transit',
		title: 'In Transit',
		items: [
			{ id: 'l-1004', code: 'LD-1004', customer: 'Initech', weight: '19,750 lb' },
			{ id: 'l-1005', code: 'LD-1005', customer: 'Umbrella', weight: '41,200 lb' },
		],
	},
	{
		id: 'delivered',
		title: 'Delivered',
		items: [],
	},
]
