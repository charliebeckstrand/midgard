export type LoadRow = {
	lane: string
	carrier: string
	period: string
	loads: number
	cost: number
}

export const loads: LoadRow[] = [
	{ lane: 'LAX → DFW', carrier: 'Acme', period: 'Jan', loads: 12, cost: 28400 },
	{ lane: 'LAX → DFW', carrier: 'Acme', period: 'Feb', loads: 9, cost: 21700 },
	{ lane: 'LAX → DFW', carrier: 'Bolt', period: 'Jan', loads: 6, cost: 13200 },
	{ lane: 'LAX → DFW', carrier: 'Bolt', period: 'Feb', loads: 8, cost: 17600 },
	{ lane: 'ORD → ATL', carrier: 'Acme', period: 'Jan', loads: 4, cost: 9600 },
	{ lane: 'ORD → ATL', carrier: 'Bolt', period: 'Feb', loads: 11, cost: 26400 },
	{ lane: 'ORD → ATL', carrier: 'Crest', period: 'Jan', loads: 7, cost: 16100 },
	{ lane: 'SEA → JFK', carrier: 'Acme', period: 'Jan', loads: 5, cost: 14500 },
	{ lane: 'SEA → JFK', carrier: 'Bolt', period: 'Feb', loads: 3, cost: 8700 },
	{ lane: 'SEA → JFK', carrier: 'Crest', period: 'Feb', loads: 6, cost: 17400 },
]
