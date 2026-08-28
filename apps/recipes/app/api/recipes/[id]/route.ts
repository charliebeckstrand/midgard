import { parseRecipeDraft } from '@/schemas/recipe'
import { removeCooksForRecipe } from '@/server/cooks-store'
import { removePlanForRecipe } from '@/server/plan-store'
import { type IdContext, readAs, refuse } from '@/server/read-body'
import { removeRecipe, updateRecipe } from '@/server/recipes-store'

/** The store reads the filesystem, so this route is never prerendered. */
export const dynamic = 'force-dynamic'

/**
 * Replaces one recipe.
 *
 * `PUT` rather than `PATCH` because the form submits every field it owns, so a
 * save is a whole record and never a subset — and the body is read by the same
 * validator a create uses, so an edit cannot write a shape a create would have
 * refused.
 */
export async function PUT(request: Request, { params }: IdContext) {
	const draft = await readAs(request, parseRecipeDraft)

	if (!draft.ok) return refuse(draft.issues)

	const { id } = await params

	const updated = await updateRecipe(id, draft.value)

	if (updated === null) return refuse(['No recipe with that id.'], 404)

	return Response.json(updated)
}

/**
 * Removes one recipe, and with it every cook and every planned meal that named
 * it.
 *
 * The three stores are cleared from here rather than from each other. A store
 * owns one file, and one reaching across to another is how a delete ends up
 * half-done in the store that happened to be called second. The route is the
 * edge that owns the request, so it is the edge that owns what the request
 * means.
 *
 * The recipe goes last. If a later step fails, what is left is a recipe with
 * nothing pointing at it — which is a recipe. The other order leaves cooks and
 * plans pointing at nothing, which is rows neither surface can draw.
 */
export async function DELETE(_request: Request, { params }: IdContext) {
	const { id } = await params

	// Together, because they are two files on two queues with nothing to say to
	// each other. Only the recipe has to wait for both.
	await Promise.all([removePlanForRecipe(id), removeCooksForRecipe(id)])

	const removed = await removeRecipe(id)

	if (!removed) return refuse(['No recipe with that id.'], 404)

	return new Response(null, { status: 204 })
}
