import { prerender } from 'react-dom/static'
import type { EntryContext } from 'react-router'
import { ServerRouter } from 'react-router'

// The build renders each page once, to a static file. `prerender` waits for
// all content. React moves a large Suspense boundary out of place, to reveal
// it later with a script; an unlimited chunk size keeps all content in place.
// Then the first layout of the page in the browser is the whole page.
export default async function handleRequest(
	request: Request,
	status: number,
	headers: Headers,
	context: EntryContext,
) {
	const { prelude } = await prerender(<ServerRouter context={context} url={request.url} />, {
		progressiveChunkSize: Number.POSITIVE_INFINITY,
	})

	headers.set('Content-Type', 'text/html')

	return new Response(prelude, { headers, status })
}
