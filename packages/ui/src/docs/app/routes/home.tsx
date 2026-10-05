import pages from 'virtual:docs/pages'
import { Link } from 'ui/link'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { sectionsOf } from '../sidebar.tsx'

/** The root path: each page of the docs, by section. */
export default function Home() {
	return (
		<Stack gap="lg">
			<Text tone="muted">
				The components and modules of ui, each with a playground, examples, and its API.
			</Text>
			{sectionsOf(pages).map(({ section, links }) => (
				<Stack key={section} gap="sm">
					<Text tone="muted" className="text-sm uppercase tracking-wide">
						{section}
					</Text>
					<ul className="flex flex-wrap gap-x-6 gap-y-2">
						{links.map((page) => (
							<li key={page.path}>
								<Link href={page.path}>{page.name}</Link>
							</li>
						))}
					</ul>
				</Stack>
			))}
		</Stack>
	)
}
