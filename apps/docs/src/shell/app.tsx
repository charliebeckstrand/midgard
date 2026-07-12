import { Heading } from 'ui/heading'

/**
 * Site shell. A placeholder centerpiece for now; the sidebar chrome, hash
 * router, and routed doc pages land with the content pipeline.
 */
export function App() {
	return (
		<main className="grid h-full place-items-center">
			<Heading>ui docs</Heading>
		</main>
	)
}
