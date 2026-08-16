import { parseRecipeDraft } from '@/schemas/recipe'
import { readAs, readJson, refuse } from '@/server/read-body'
import { addRecipe, listRecipes, reorderRecipes } from '@/server/recipes-store'

/** The store reads the filesystem, so this route is never prerendered. */
export const dynamic = 'force-dynamic'

/** Every recipe, in the reader's own order. */
export async function GET() {
	return Response.json(await listRecipes())
}

/** Adds one recipe, after reading the body as a draft. */
export async function POST(request: Request) {
	const draft = await readAs(request, parseRecipeDraft)

	if (!draft.ok) return refuse(draft.issues)

	return Response.json(await addRecipe(draft.value), { status: 201 })
}

/**
 * Restates the reader's order.
 *
 * On the collection rather than a path of its own, because the order is a
 * property of the list and not of any recipe in it — and a `/recipes/order`
 * segment would sit beside `/recipes/[id]`, where a recipe whose id was `order`
 * could never be reached.
 *
 * Ids rather than records: a whole record sent back from the browser would let a
 * stale card overwrite an edit that landed between the read and the drop.
 */
export async function PUT(request: Request) {
	const body = await readJson(request)

	if (!body.ok) return refuse(body.issues)

	const ids = (body.value as { ids?: unknown }).ids

	if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
		return refuse(['`ids` must be a list of recipe ids.'])
	}

	return Response.json(await reorderRecipes(ids as string[]))
}
