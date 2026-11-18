'use client'

import { Link, type LinkProps } from 'ui/link'
import { useNewRunClick } from '../../hooks/use-new-run-click'

/**
 * The link of the Numbers crumb, which leads to the solo route. A plain click
 * starts the solo run of a new seed at once, as the Standard item of the menu
 * does (`useNewRunClick`).
 */
export function NumbersHeaderLink(props: LinkProps) {
	const startSolo = useNewRunClick(false)

	return <Link {...props} onClick={startSolo} />
}
