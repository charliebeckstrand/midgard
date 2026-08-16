import { isDay, parsePlanDraft } from '@/schemas/recipe'
import { addPlanEntry, type DayEntries, listPlan, replaceDays } from '@/server/plan-store'
import { readAs, readJson, refuse } from '@/server/read-body'

/** The store reads the filesystem, so this route is never prerendered. */
export const dynamic = 'force-dynamic'

/** Every planned meal, by day and then by position. */
export async function GET() {
	return Response.json(await listPlan())
}

/** Plans one meal, at the end of its day. */
export async function POST(request: Request) {
	const draft = await readAs(request, parsePlanDraft)

	if (!draft.ok) return refuse(draft.issues)

	return Response.json(await addPlanEntry(draft.value), { status: 201 })
}

/** Reads the restated days out of a body, or says what is wrong with them. */
function readDays(value: unknown): DayEntries[] | null {
	const days = (value as { days?: unknown }).days

	if (!Array.isArray(days)) return null

	const read: DayEntries[] = []

	for (const day of days) {
		if (typeof day !== 'object' || day === null) return null

		const { day: on, entries } = day as { day?: unknown; entries?: unknown }

		if (!isDay(on) || !Array.isArray(entries)) return null

		const lines: { id?: string; recipeId: string }[] = []

		for (const entry of entries) {
			if (typeof entry !== 'object' || entry === null) return null

			const { id, recipeId } = entry as { id?: unknown; recipeId?: unknown }

			if (typeof recipeId !== 'string' || recipeId === '') return null

			lines.push(typeof id === 'string' && id !== '' ? { id, recipeId } : { recipeId })
		}

		read.push({ day: on, entries: lines })
	}

	return read
}

/**
 * Restates whole days at once, which is how every board move lands.
 *
 * Days rather than entries, and every affected day in one call, because a card
 * dragged onto an occupied slot swaps the two — and a swap that wrote one day
 * and then the other would leave a moment where the same meal sat in both.
 */
export async function PUT(request: Request) {
	const body = await readJson(request)

	if (!body.ok) return refuse(body.issues)

	const days = readDays(body.value)

	if (days === null) {
		return refuse(['`days` must be a list of `{ day, entries: [{ id?, recipeId }] }`.'])
	}

	return Response.json(await replaceDays(days))
}
