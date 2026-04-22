/**
 * Deterministic fixture generators for benchmarks.
 *
 * Benchmarks need reproducible inputs so run-to-run variance reflects the
 * code under test — not the data. Each helper here is seeded with a simple
 * LCG so identical parameters always produce identical output.
 */

export function rng(seed = 1) {
	let state = seed >>> 0

	return () => {
		state = (state * 1664525 + 1013904223) >>> 0

		return state / 0x100000000
	}
}

export type Shipment = {
	id: string
	reference: string
	origin: string
	destination: string
	status: 'pending' | 'in_transit' | 'delivered' | 'exception'
	loads: number
	weight: number
	carrier: string
	lane: string
	period: string
	createdAt: string
}

const STATUSES: Shipment['status'][] = ['pending', 'in_transit', 'delivered', 'exception']
const CARRIERS = ['ACME', 'Globex', 'Initech', 'Umbrella', 'Soylent', 'Hooli', 'Pied Piper']
const CITIES = [
	'Seattle',
	'Chicago',
	'Atlanta',
	'Dallas',
	'Denver',
	'Phoenix',
	'Boston',
	'Miami',
	'Portland',
	'Austin',
]
const PERIODS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function makeShipments(count: number, seed = 1): Shipment[] {
	const rand = rng(seed)

	const out: Shipment[] = new Array(count)

	for (let i = 0; i < count; i++) {
		const origin = CITIES[Math.floor(rand() * CITIES.length)] as string
		const destination = CITIES[Math.floor(rand() * CITIES.length)] as string

		out[i] = {
			id: `S${i.toString().padStart(6, '0')}`,
			reference: `REF-${Math.floor(rand() * 1_000_000)}`,
			origin,
			destination,
			status: STATUSES[Math.floor(rand() * STATUSES.length)] as Shipment['status'],
			loads: Math.floor(rand() * 40) + 1,
			weight: Math.round(rand() * 40_000),
			carrier: CARRIERS[Math.floor(rand() * CARRIERS.length)] as string,
			lane: `${origin} → ${destination}`,
			period: PERIODS[Math.floor(rand() * PERIODS.length)] as string,
			createdAt: new Date(2024, 0, 1 + Math.floor(rand() * 365)).toISOString(),
		}
	}

	return out
}

// ── JSON tree fixtures ─────────────────────────────────

type Json = string | number | boolean | null | Json[] | { [k: string]: Json }

/**
 * Build a balanced JSON tree with `depth` levels and `branching` children
 * per branch node. Total branch nodes ≈ branching^depth.
 */
export function makeJsonTree(depth: number, branching: number, seed = 1): Json {
	const rand = rng(seed)

	function build(remaining: number, path: string): Json {
		if (remaining === 0) {
			const r = rand()

			if (r < 0.3) return Math.floor(r * 10_000)
			if (r < 0.6) return `value-${path}`
			if (r < 0.8) return r > 0.7
			return null
		}

		const obj: { [k: string]: Json } = {}

		for (let i = 0; i < branching; i++) {
			obj[`key_${i}`] = build(remaining - 1, `${path}.${i}`)
		}

		return obj
	}

	return build(depth, 'root')
}

// ── Query-builder fixtures ─────────────────────────────

import type { QueryField, QueryGroup, QueryNode } from '../components/query-builder/types'

export const QUERY_FIELDS: QueryField[] = [
	{ name: 'status', label: 'Status', type: 'text' },
	{ name: 'loads', label: 'Loads', type: 'number' },
	{ name: 'carrier', label: 'Carrier', type: 'text' },
	{ name: 'delivered', label: 'Delivered', type: 'boolean' },
	{ name: 'createdAt', label: 'Created', type: 'date' },
]

let queryIdCounter = 0

function qid(): string {
	queryIdCounter++

	return `q_${queryIdCounter}`
}

/**
 * Build a balanced query tree with `depth` group levels and `branching`
 * children per group. Leaves are rules.
 */
export function makeQueryTree(depth: number, branching: number): QueryGroup {
	queryIdCounter = 0

	function build(remaining: number): QueryGroup {
		const children: QueryNode[] = []

		for (let i = 0; i < branching; i++) {
			if (remaining === 0) {
				children.push({
					id: qid(),
					type: 'rule',
					combinator: 'and',
					field: 'status',
					operator: 'equals',
					value: `v${i}`,
				})
			} else {
				children.push(build(remaining - 1))
			}
		}

		return { id: qid(), type: 'group', combinator: 'and', children }
	}

	return build(depth)
}

// ── Kanban fixtures ────────────────────────────────────

export type KanbanItem = { id: string; title: string }

export function makeKanbanColumns(
	columnCount: number,
	itemsPerColumn: number,
): { id: string; items: KanbanItem[] }[] {
	const columns: { id: string; items: KanbanItem[] }[] = []

	for (let c = 0; c < columnCount; c++) {
		const items: KanbanItem[] = []

		for (let i = 0; i < itemsPerColumn; i++) {
			items.push({ id: `c${c}-i${i}`, title: `Item ${c}.${i}` })
		}

		columns.push({ id: `col-${c}`, items })
	}

	return columns
}

// ── List fixtures ──────────────────────────────────────

export function makeListItems(count: number): { id: string; title: string }[] {
	const items: { id: string; title: string }[] = new Array(count)

	for (let i = 0; i < count; i++) items[i] = { id: `l${i}`, title: `Item ${i}` }

	return items
}

// ── Combobox option fixtures ───────────────────────────

export function makeComboboxOptions(count: number): { value: string; label: string }[] {
	const options: { value: string; label: string }[] = new Array(count)

	for (let i = 0; i < count; i++) options[i] = { value: `opt-${i}`, label: `Option ${i}` }

	return options
}
