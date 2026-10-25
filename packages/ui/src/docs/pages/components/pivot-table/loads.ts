import { monthNames } from '../../../data/calendar.ts'
import { names } from '../../../kit/proper-names.ts'

/** The lanes, from airport code to airport code. */
const lanes = names({ laxDfw: 'LAX → DFW', ordAtl: 'ORD → ATL', seaJfk: 'SEA → JFK' })

/** The carriers. */
const carriers = names({ acme: 'Acme', bolt: 'Bolt', crest: 'Crest' })

export type LoadRow = {
	lane: string
	carrier: string
	period: string
	loads: number
	cost: number
}

export const loads: LoadRow[] = [
	{ lane: lanes.laxDfw, carrier: carriers.acme, period: monthNames.jan, loads: 12, cost: 28400 },
	{ lane: lanes.laxDfw, carrier: carriers.acme, period: monthNames.feb, loads: 9, cost: 21700 },
	{ lane: lanes.laxDfw, carrier: carriers.bolt, period: monthNames.jan, loads: 6, cost: 13200 },
	{ lane: lanes.laxDfw, carrier: carriers.bolt, period: monthNames.feb, loads: 8, cost: 17600 },
	{ lane: lanes.ordAtl, carrier: carriers.acme, period: monthNames.jan, loads: 4, cost: 9600 },
	{ lane: lanes.ordAtl, carrier: carriers.bolt, period: monthNames.feb, loads: 11, cost: 26400 },
	{ lane: lanes.ordAtl, carrier: carriers.crest, period: monthNames.jan, loads: 7, cost: 16100 },
	{ lane: lanes.seaJfk, carrier: carriers.acme, period: monthNames.jan, loads: 5, cost: 14500 },
	{ lane: lanes.seaJfk, carrier: carriers.bolt, period: monthNames.feb, loads: 3, cost: 8700 },
	{ lane: lanes.seaJfk, carrier: carriers.crest, period: monthNames.feb, loads: 6, cost: 17400 },
]
