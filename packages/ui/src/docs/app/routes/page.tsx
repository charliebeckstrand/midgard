import { lazy, Suspense } from 'react'
import {
	type LoaderFunctionArgs,
	Outlet,
	type ShouldRevalidateFunctionArgs,
	useLoaderData,
} from 'react-router'
import { Button } from '../../../components/button'
import { Heading } from '../../../components/heading'
import { Text } from '../../../components/text'
import { Stack } from '../../../structure/stack'
import { DemoApiContext } from '../../engine/components/axes'
import { pageAt } from '../../engine/pages'
import { apiOf, pages } from '../../engine/pages.server'

// The view of the API reference renders TSDoc as Markdown, so it carries
// `marked`. It is a chunk of its own, so the scripts of the page do not carry
// it. The reference is the last section of the page, so it moves no content
// when it paints.
const ApiReference = lazy(() =>
	import('../../engine/components/api-reference').then(({ ApiReference }) => ({
		default: ApiReference,
	})),
)

/**
 * The API data of the page. The build runs it for each page and puts the data
 * in the HTML, so the page hydrates with it. A navigation fetches it from the
 * `.data` file of the next page, and the root path from `/_root.data`.
 */
export async function loader({ request }: LoaderFunctionArgs) {
	const pathname = new URL(request.url).pathname.replace(/\.data$/, '').replace(/^\/_root$/, '/')

	return { api: await apiOf(pageAt(pages, pathname)) }
}

// The layout has no params, so by default the router keeps its data when only
// the page changes.
export function shouldRevalidate({
	currentUrl,
	nextUrl,
	defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
	return defaultShouldRevalidate || currentUrl.pathname !== nextUrl.pathname
}

/** The body of each page: the demo, and the API reference of its barrel. */
export default function PageLayout() {
	const { api } = useLoaderData<typeof loader>()

	return (
		<Stack gap="xl">
			{/* `Axes` in the demo reads the API data of the barrel from here. */}
			<DemoApiContext value={api}>
				<Outlet />
			</DemoApiContext>
			{api && api.length > 0 && (
				<Stack gap="sm">
					<Heading level={2}>API reference</Heading>
					<Suspense fallback={null}>
						<ApiReference api={api} />
					</Suspense>
				</Stack>
			)}
		</Stack>
	)
}

/**
 * Shows in place of a page that fails to render, so that one demo does not take
 * down the site. A failed chunk after a deploy comes back with a reload.
 */
export function ErrorBoundary() {
	return (
		<Stack gap="md" className="p-6">
			<Heading>Couldn't load this demo</Heading>
			<Text tone="muted">Try again or reload the page.</Text>
			<div>
				<Button variant="outline" onClick={() => window.location.reload()}>
					Try again
				</Button>
			</div>
		</Stack>
	)
}
