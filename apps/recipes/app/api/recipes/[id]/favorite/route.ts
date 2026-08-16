import { readJson, refuse } from '@/server/read-body'
import { setFavorite } from '@/server/recipes-store'

/** The store reads the filesystem, so this route is never prerendered. */
export const dynamic = 'force-dynamic'

/** The route's own parameters, which Next hands over as a promise. */
type Context = { params: Promise<{ id: string }> }

/**
 * Marks one recipe a favourite, or takes the mark off.
 *
 * Its own route rather than a field on the replace, because the two are
 * different writes. A replace carries the whole record, so a heart pressed on
 * the list would have to send the recipe back to say one thing about it — and
 * would overwrite an edit that landed in between.
 */
export async function PUT(request: Request, { params }: Context) {
	const body = await readJson(request)

	if (!body.ok) return refuse(body.issues)

	const favorite = (body.value as { favorite?: unknown }).favorite

	if (typeof favorite !== 'boolean') return refuse(['`favorite` must be true or false.'])

	const { id } = await params

	const updated = await setFavorite(id, favorite)

	if (updated === null) return refuse(['No recipe with that id.'], 404)

	return Response.json(updated)
}
