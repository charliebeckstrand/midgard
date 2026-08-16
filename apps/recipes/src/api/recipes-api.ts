import type { CookDraft, CookEvent, PlanEntry, Recipe, RecipeDraft } from '../types'

/**
 * The client's whole reach: same-origin `/api/*` paths, per CONVENTIONS §6.3.
 * Nothing else in the app fetches, so replacing the stores behind these routes
 * replaces the app's data source.
 */

/** What a route answers with when it rejects a body. */
type IssuesResponse = { issues?: unknown }

/** Reads the reasons a request failed, for a message the reader can act on. */
async function failureText(response: Response): Promise<string> {
	try {
		const body = (await response.json()) as IssuesResponse

		if (Array.isArray(body.issues)) return body.issues.map(String).join(' ')
	} catch {
		// A non-JSON error body says nothing useful; the status does.
	}

	return `Request failed: ${response.status}`
}

/**
 * One same-origin request, checked and parsed.
 *
 * Every call below goes through it, so the ok-check happens once rather than
 * ten times — an unchecked response is the failure that shows up as a parse
 * error three layers away, and the tenth copy is the one that forgets.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(path, init)

	if (!response.ok) throw new Error(await failureText(response))

	return (await response.json()) as T
}

/** The same, for a request that writes JSON and reads the stored record back. */
function send<T>(path: string, method: string, body: unknown): Promise<T> {
	return request<T>(path, {
		method,
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	})
}

/** The same, for a route that answers 204 and so carries no body to parse. */
async function drop(path: string): Promise<void> {
	const response = await fetch(path, { method: 'DELETE' })

	if (!response.ok) throw new Error(await failureText(response))
}

/** One id, safe in a path. */
function at(id: string): string {
	return encodeURIComponent(id)
}

/** Every stored recipe, in the reader's own order. */
export function fetchRecipes(signal?: AbortSignal): Promise<Recipe[]> {
	return request<Recipe[]>('/api/recipes', { signal })
}

/** Adds one recipe and hands back the stored record, identity and all. */
export function createRecipe(draft: RecipeDraft): Promise<Recipe> {
	return send<Recipe>('/api/recipes', 'POST', draft)
}

/** Replaces one recipe and hands back the stored record. */
export function saveRecipe(id: string, draft: RecipeDraft): Promise<Recipe> {
	return send<Recipe>(`/api/recipes/${at(id)}`, 'PUT', draft)
}

/** Marks one recipe a favourite, or takes the mark off. */
export function setRecipeFavorite(id: string, favorite: boolean): Promise<Recipe> {
	return send<Recipe>(`/api/recipes/${at(id)}/favorite`, 'PUT', { favorite })
}

/**
 * Writes the reader's order.
 *
 * Ids rather than records: a whole record sent back from the browser would let a
 * stale card overwrite an edit that landed between the read and the drop.
 */
export function reorderRecipes(ids: readonly string[]): Promise<Recipe[]> {
	return send<Recipe[]>('/api/recipes', 'PUT', { ids })
}

/** Removes one recipe, and with it every cook and every planned meal that named it. */
export function deleteRecipe(id: string): Promise<void> {
	return drop(`/api/recipes/${at(id)}`)
}

/** The whole cook log. */
export function fetchCooks(signal?: AbortSignal): Promise<CookEvent[]> {
	return request<CookEvent[]>('/api/cooks', { signal })
}

/** Records one cook. */
export function createCook(draft: CookDraft): Promise<CookEvent> {
	return send<CookEvent>('/api/cooks', 'POST', draft)
}

/** Takes one cook back off the log. */
export function deleteCook(id: string): Promise<void> {
	return drop(`/api/cooks/${at(id)}`)
}

/** Every planned meal. */
export function fetchPlan(signal?: AbortSignal): Promise<PlanEntry[]> {
	return request<PlanEntry[]>('/api/plan', { signal })
}

/** Plans one meal, at the end of its day. */
export function createPlanEntry(draft: { day: string; recipeId: string }): Promise<PlanEntry> {
	return send<PlanEntry>('/api/plan', 'POST', draft)
}

/**
 * Restates whole days at once, which is how every board move lands.
 *
 * Every affected day in one call, because a swap that wrote one day and then the
 * other would leave a moment where the same meal sat in both.
 */
export function replacePlanDays(
	days: readonly { day: string; entries: readonly { id?: string; recipeId: string }[] }[],
): Promise<PlanEntry[]> {
	return send<PlanEntry[]>('/api/plan', 'PUT', { days })
}

/** Takes one meal off the plan. */
export function deletePlanEntry(id: string): Promise<void> {
	return drop(`/api/plan/${at(id)}`)
}
