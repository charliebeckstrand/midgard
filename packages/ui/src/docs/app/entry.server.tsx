import { prerender } from 'react-dom/static'
import { type EntryContext, ServerRouter } from 'react-router'
import { DocumentLocale } from './context.ts'
import { requestLocale } from './language.ts'

// The build renders each page once, to a static file. `prerender` waits for
// all content. An unlimited chunk size keeps each Suspense boundary in place,
// so the first layout of the page in the browser is the whole page. The page
// renders in the locale of the request (`language.ts`). The build renders
// each page once for each locale.
export default async function handleRequest(
	request: Request,
	status: number,
	headers: Headers,
	context: EntryContext,
) {
	const locale = requestLocale({
		cookie: request.headers.get('cookie'),
		acceptLanguage: request.headers.get('accept-language'),
	})

	const { prelude } = await prerender(
		<DocumentLocale value={locale}>
			<ServerRouter context={context} url={request.url} />
		</DocumentLocale>,
		{ progressiveChunkSize: Number.POSITIVE_INFINITY },
	)

	headers.set('Content-Type', 'text/html')

	return new Response(prelude, { headers, status })
}
