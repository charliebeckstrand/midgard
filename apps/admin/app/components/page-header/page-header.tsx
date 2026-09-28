import type { ReactNode } from 'react'
import { Heading } from 'ui/heading'
import { Flex } from 'ui/structure/flex'
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
	/** The controls of the page. They show at the end of the title row. */
	actions?: ReactNode
}

/**
 * The top of each signed-in page: the title, and the trail, the description,
 * and the actions of the page.
 *
 * @remarks
 * Static: renders in React Server Components and in client pages.
 */
export function PageHeader({ title, breadcrumb, description, actions }: PageHeaderProps) {
	return (
		<Stack gap="xl" className="w-full">
			<Flex align="end" justify="between" gap="md" wrap>
				<Stack gap="xs" className="min-w-0">
					<Heading className="truncate">{title}</Heading>
					{description && (
						<Text as="div" tone="muted">
							{description}
						</Text>
					)}
				</Stack>
				{actions && <Flex gap="sm">{actions}</Flex>}
			</Flex>
			{breadcrumb}
		</Stack>
	)
}
