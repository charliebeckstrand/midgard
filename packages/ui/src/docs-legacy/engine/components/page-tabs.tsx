import { useLocation, useNavigate, useParams } from 'react-router'
import { Tabs, type TabsProps } from '../../../components/tabs'

/** Props for {@link PageTabs}: the props of `Tabs`, with the tab at the page's own path as `defaultValue`. */
export type PageTabsProps = Omit<TabsProps, 'value' | 'defaultValue' | 'onValueChange'> & {
	/** The tab at the page's own path (`/progress`). Each other tab has a path of its own (`/progress/gauge`). */
	defaultValue: string
}

/**
 * The tabs that divide a demo page. The selected tab is part of the path, so
 * a reload, a link, and the back button keep it, and the build renders each tab
 * to its own HTML file. The build reads the `value` of each `Tab` in the
 * element, so each value must be a string literal, or an item of a module
 * constant array of string literals.
 */
export function PageTabs({ defaultValue, ...props }: PageTabsProps) {
	const { tab } = useParams()

	const { pathname } = useLocation()

	const navigate = useNavigate()

	// The path of the page, without its tab.
	const page = tab
		? pathname.slice(0, pathname.lastIndexOf(`/${tab}`))
		: pathname.replace(/\/$/, '')

	return (
		<Tabs
			{...props}
			value={tab ?? defaultValue}
			onValueChange={(next) => {
				if (next === null) return

				// The page keeps its scroll position when the tab changes.
				navigate(next === defaultValue ? page || '/' : `${page}/${next}`, {
					preventScrollReset: true,
				})
			}}
		/>
	)
}
