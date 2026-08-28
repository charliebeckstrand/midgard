import { removeCook } from '@/server/cooks-store'
import { type IdContext, refuse } from '@/server/read-body'

/** The store reads the filesystem, so this route is never prerendered. */
export const dynamic = 'force-dynamic'

/** Takes one cook back off the log, for a tick the reader did not mean. */
export async function DELETE(_request: Request, { params }: IdContext) {
	const { id } = await params

	const removed = await removeCook(id)

	if (!removed) return refuse(['No cook with that id.'], 404)

	return new Response(null, { status: 204 })
}
