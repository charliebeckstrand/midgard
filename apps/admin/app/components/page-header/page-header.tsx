import type { ReactNode } from 'react'
import { Heading } from 'ui/heading'
import { Stack } from 'ui/structure/stack'

/** Props for {@link PageHeader}. */
export type PageHeaderProps = {
	/** The title of the page. */
	title: ReactNode
	/**
	 * The trail to the page, such as a `Breadcrumb`. It shows under the title,
	 * with the same gap as the gap between the header and the page content.
	 */
	breadcrumb?: ReactNode
}

/**
 * The top of each signed-in page: the title and the trail of the page.
 *
 * @remarks
 * Static: renders in React Server Components and in client pages.
 */
export function PageHeader({ title, breadcrumb }: PageHeaderProps) {
	return (
		<Stack gap="xl" className="w-full">
			<Heading className="truncate">{title}</Heading>
			{breadcrumb}
		</Stack>
	)
}
