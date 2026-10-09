import pages from 'virtual:docs/pages'
import { Flex } from 'ui/flex'
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
					{/* The list is `contents`, so each link is an item of the row. */}
					<Flex gap="lg" wrap>
						<ul className="contents">
							{links.map((page) => (
								<li key={page.path}>
									<Link href={page.path}>{page.name}</Link>
								</li>
							))}
						</ul>
					</Flex>
				</Stack>
			))}
		</Stack>
	)
}
