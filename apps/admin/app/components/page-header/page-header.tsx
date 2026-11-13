import type { ReactNode } from 'react'
import { Heading } from 'ui/heading'
import { Stack } from 'ui/structure/stack'
import { Text } from 'ui/text'

/** Props for {@link PageHeader}. */
export type PageHeaderProps = {
	/** The title of the page. */
	title: ReactNode
	/**
	 * The trail to the page, such as a `Breadcrumb`. It shows under the title,
	 * with the same gap as the gap between the header and the page content.
	 */
	breadcrumb?: ReactNode
	/** One line about the page. A `TextSkeleton` can hold its place while it loads. */
	description?: ReactNode
}

/**
 * The top of each signed-in page: the title, the trail, and the description of
 * the page.
 *
 * @remarks
 * Static: renders in React Server Components and in client pages.
 */
export function PageHeader({ title, breadcrumb, description }: PageHeaderProps) {
	return (
		<Stack gap="xl" className="w-full">
			<Stack gap="xs" className="min-w-0">
				<Heading className="truncate">{title}</Heading>
				{description && (
					<Text as="div" tone="muted">
						{description}
					</Text>
				)}
			</Stack>
			{breadcrumb}
		</Stack>
	)
}
