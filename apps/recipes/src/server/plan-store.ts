import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { parsePlanEntry } from '../schemas/recipe'
import type { PlanDraft, PlanEntry } from '../types'
import { createQueue, readJsonFile, writeJsonFile } from './json-file'

/**
 * The plan: every meal the reader intends to cook, in one JSON file under the
 * app.
 *
 * Held apart from the cook log because the two say different things. A plan
 * entry is a decision that can be changed or dropped; a cook is something that
 * happened. Nothing here becomes a cook on its own — see `cooks-store.ts`.
 */

const FILE = join(process.cwd(), '.data', 'plan.json')

const serialize = createQueue()

/** What a caller states one day's meals as: the entries it already knows, in the order it wants them. */
export type DayEntries = {
	day: string
	/** One entry per meal. An entry with no `id` is new and gets one here. */
	entries: readonly { id?: string; recipeId: string }[]
}

/** Reads the file, or an empty plan where it does not exist yet. */
async function readAll(): Promise<unknown[]> {
	const parsed = await readJsonFile(FILE)

	return Array.isArray(parsed) ? parsed : []
}

/** Writes the whole plan, atomically. */
function writeAll(plan: PlanEntry[]): Promise<void> {
	return writeJsonFile(FILE, plan)
}

/**
 * Every planned meal, by day and then by position, dropping any record that no
 * longer reads as one.
 */
export async function listPlan(): Promise<PlanEntry[]> {
	const stored = await readAll()

	const plan: PlanEntry[] = []

	for (const record of stored) {
		const parsed = parsePlanEntry(record)

		if (parsed.ok) plan.push(parsed.value)
	}

	return plan.sort((a, b) => a.day.localeCompare(b.day) || a.position - b.position)
}

/** Appends one meal to the end of its day. */
export async function addPlanEntry(draft: PlanDraft): Promise<PlanEntry> {
	return serialize(async () => {
		const plan = await listPlan()

		const onDay = plan.filter((entry) => entry.day === draft.day)

		const last = onDay[onDay.length - 1]

		const entry: PlanEntry = {
			...draft,
			id: randomUUID(),
			position: last === undefined ? 0 : last.position + 1,
		}

		await writeAll([...plan, entry])

		return entry
	})
}

/**
 * Restates whole days at once, which is how every board move lands.
 *
 * Days rather than entries, and every affected day in one call, because a move
 * on the board is not always one day's business: a card dragged onto an occupied
 * slot swaps the two, and a swap that wrote one day and then the other would
 * leave a moment where the same meal sat in both — or, if the second write
 * failed, a plan that had gained a meal it never had.
 *
 * A caller passes back the ids it already holds, so an entry that only moved
 * keeps its identity — which is what stops a drag from looking like a delete and
 * an add to anything reading the plan.
 *
 * Days the caller does not name are untouched.
 */
export async function replaceDays(days: readonly DayEntries[]): Promise<PlanEntry[]> {
	return serialize(async () => {
		const plan = await listPlan()

		const restated = new Set(days.map((day) => day.day))

		const kept = plan.filter((entry) => !restated.has(entry.day))

		const written = days.flatMap(({ day, entries }) =>
			entries.map<PlanEntry>((entry, at) => ({
				id: entry.id ?? randomUUID(),
				day,
				recipeId: entry.recipeId,
				position: at,
			})),
		)

		const next = [...kept, ...written].sort(
			(a, b) => a.day.localeCompare(b.day) || a.position - b.position,
		)

		await writeAll(next)

		return next
	})
}

/** Takes one meal off the plan. `false` where none carried that id. */
export async function removePlanEntry(id: string): Promise<boolean> {
	return serialize(async () => {
		const plan = await listPlan()

		const kept = plan.filter((entry) => entry.id !== id)

		if (kept.length === plan.length) return false

		await writeAll(kept)

		return true
	})
}

/**
 * Drops every planned meal of one recipe, for when the recipe itself goes.
 *
 * A plan entry pointing at nothing is a card the board cannot draw. The route
 * that deletes a recipe calls this; the store does not reach across to another
 * file on its own.
 */
export async function removePlanForRecipe(recipeId: string): Promise<number> {
	return serialize(async () => {
		const plan = await listPlan()

		const kept = plan.filter((entry) => entry.recipeId !== recipeId)

		const dropped = plan.length - kept.length

		if (dropped > 0) await writeAll(kept)

		return dropped
	})
}
