import { removeCook } from '@/server/cooks-store'
import { refuse } from '@/server/read-body'

/** The store reads the filesystem, so this route is never prerendered. */
export const dynamic = 'force-dynamic'

/** The route's own parameters, which Next hands over as a promise. */
type Context = { params: Promise<{ id: string }> }

/** Takes one cook back off the log, for a tick the reader did not mean. */
export async function DELETE(_request: Request, { params }: Context) {
	const { id } = await params

	const removed = await removeCook(id)

	if (!removed) return refuse(['No cook with that id.'], 404)

	return new Response(null, { status: 204 })
}
