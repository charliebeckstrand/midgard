'use client'

import type { ComponentProps } from 'react'
import { useIntl } from '../../primitives/intl/use-intl'
import { breadcrumbMessages } from './breadcrumb-messages'

/**
 * The `<nav>` of a breadcrumb that does not collapse, named "Breadcrumb" in
 * the language of the reader. It is the client part of the static
 * {@link Breadcrumb}, so the static leaf reads no context.
 *
 * @internal
 */
export function BreadcrumbNav(props: ComponentProps<'nav'>) {
	const intl = useIntl()

	return (
		<nav
			data-slot="breadcrumb"
			aria-label={intl.formatMessage(breadcrumbMessages.label)}
			{...props}
		/>
	)
}
