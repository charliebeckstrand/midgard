import { Search } from 'lucide-react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { IconButton } from 'ui/icon-button'
import { Kbd } from 'ui/kbd'
import { defineMessages, IntlMessage, useIntl } from 'ui/primitives/intl'
import { ShortcutHint } from '../../kit/shortcut-hint.tsx'
import { useShortcutPlatformKeys } from '../../kit/use-shortcut-platform.ts'
import { useSearch } from './context.ts'

const messages = defineMessages({
	button: {
		id: 'docs.search.button',
		defaultMessage: 'Search',
		description:
			'The label of each button that opens the search of the docs: the button at the top of the sidebar, and the icon button in the bar at the top of a narrow screen.',
	},
})

/**
 * The button that opens the search, with its key ({@link ShortcutHint}). A pick
 * goes to a new page, so it closes the mobile sidebar (`DocsSidebar`).
 */
export function SearchButton() {
	const { request, preload } = useSearch()

	const keys = useShortcutPlatformKeys('K')

	// The label is zinc-600, because zinc-500 is 4.4:1 on the gray of the sidebar,
	// under the 4.5:1 of small text. The key is in `aria-keyshortcuts`, so the
	// glyph of the hint is not part of the name.
	//
	// The hint shows only on a wide screen. The key sets its own display where
	// the browser trims text (`text-trim:inline-block` in the Kbd recipe), and
	// that variant comes after the responsive variants in the sheet, so each
	// display class here is important, and the wide screen gives the two
	// displays of the recipe again. A wrapper would hide the key with no
	// important class, but the key then is not a child of the button and loses
	// the padding that it has in a button.
	return (
		<Button
			variant="outline"
			className="w-full justify-start font-normal text-zinc-600 dark:text-zinc-400"
			aria-keyshortcuts={keys}
			onPointerEnter={preload}
			onFocus={preload}
			onClick={() => request()}
		>
			<Icon icon={<Search />} />
			<span className="flex-1 text-start">
				<IntlMessage message={messages.button} />
			</span>
			<Kbd aria-hidden className="hidden! lg:inline-flex! lg:text-trim:inline-block!">
				<ShortcutHint keyName="K" />
			</Kbd>
		</Button>
	)
}

/**
 * The button of the search in the bar at the top of a narrow screen, where the
 * sidebar is in a drawer. Without it, a search takes two presses, and the
 * palette opens over the drawer. On a wide screen the sidebar shows its own
 * button ({@link SearchButton}), so this button hides.
 */
export function SearchIconButton() {
	const { request, preload } = useSearch()

	const intl = useIntl()

	const keys = useShortcutPlatformKeys('K')

	return (
		<IconButton
			icon={Search}
			aria-label={intl.formatMessage(messages.button)}
			aria-keyshortcuts={keys}
			className="lg:hidden"
			onPointerEnter={preload}
			onFocus={preload}
			onClick={() => request()}
		/>
	)
}
