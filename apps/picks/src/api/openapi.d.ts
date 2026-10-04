/**
 * The paths of Mimir that the app reads on the server. Written by hand from
 * the proposed predictions routes. When Mimir serves them, `pnpm openapi`
 * writes this file from the spec of Mimir, as in the places app.
 */
export interface paths {
	'/api/predictions/{season}': {
		get: {
			parameters: { path: { season: number } }
			responses: {
				200: {
					headers: Record<string, unknown>
					content: { 'application/json': Record<string, Record<string, string>> }
				}
			}
		}
	}
}
