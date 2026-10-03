import type { ReactNode } from 'react'
import { prerender } from 'react-dom/static'
import type { EntryContext } from 'react-router'
import { ServerRouter } from 'react-router'
import type { Axis } from '../engine/axes'
import {
	type AxesPrerender,
	AxesPrerenderContext,
	readPrerenderedAxes,
} from '../engine/axes-prerender'

// The build renders each page once, to a static file. `prerender` waits for
// all content. React moves a large Suspense boundary out of place, to reveal
// it later with a script; an unlimited chunk size keeps all content in place.
// Then the first layout of the page in the browser is the whole page.
async function render(app: ReactNode): Promise<string> {
	const { prelude } = await prerender(app, { progressiveChunkSize: Number.POSITIVE_INFINITY })

	return new Response(prelude).text()
}

// A page with `Axes` renders two times. The first pass gives the DOM that the
// first read of each `Axes` takes, and the second pass starts from those
// reads (`AxesPrerender`).
export default async function handleRequest(
	request: Request,
	status: number,
	headers: Headers,
	context: EntryContext,
) {
	const path = new URL(request.url).pathname

	// The router reads the data stream of the page in each render, and a stream
	// can have one reader. Each pass gets its own branch.
	const [first, second] = context.serverHandoffStream?.tee() ?? []

	const page = (prerender: AxesPrerender, stream: ReadableStream<Uint8Array> | undefined) => (
		<AxesPrerenderContext value={prerender}>
			<ServerRouter context={{ ...context, serverHandoffStream: stream }} url={request.url} />
		</AxesPrerenderContext>
	)

	const collect = new Map<string, readonly Axis[]>()

	let html = await render(page({ path, collect }, first))

	if (collect.size > 0) {
		// Only the build loads jsdom, so the client bundle does not hold it.
		const { JSDOM } = await import('jsdom')

		const reads = readPrerenderedAxes(new JSDOM(html).window.document, collect)

		html = await render(page({ path, reads }, second))
	}

	headers.set('Content-Type', 'text/html')

	return new Response(html, { headers, status })
}
