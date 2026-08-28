import { removePlanEntry } from '@/server/plan-store'
import { type IdContext, refuse } from '@/server/read-body'

/** The store reads the filesystem, so this route is never prerendered. */
export const dynamic = 'force-dynamic'

/** Takes one meal off the plan. */
export async function DELETE(_request: Request, { params }: IdContext) {
	const { id } = await params

	const removed = await removePlanEntry(id)

	if (!removed) return refuse(['No planned meal with that id.'], 404)

	return new Response(null, { status: 204 })
}
