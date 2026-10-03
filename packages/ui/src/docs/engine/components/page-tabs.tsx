import { useLocation, useNavigate } from 'react-router'
import { Tabs, type TabsProps } from '../../../components/tabs'
import { pageTabPath, parseDemoPath } from '../demo-id'
import { defaultDemo } from '../registry'

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
	// The root path shows the first demo.
	const { id, tab } = parseDemoPath(useLocation().pathname)

	const navigate = useNavigate()

	return (
		<Tabs
			{...props}
			value={tab ?? defaultValue}
			onValueChange={(next) => {
				if (next === null) return

				// The page keeps its scroll position when the tab changes.
				navigate(pageTabPath(id || defaultDemo, next, defaultValue), { preventScrollReset: true })
			}}
		/>
	)
}
