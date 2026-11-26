import { Search } from 'lucide-react'
import { use } from 'react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Kbd } from 'ui/kbd'
import { defineMessages, IntlMessage } from 'ui/primitives/intl'
import { OffcanvasContext } from 'ui/primitives/offcanvas'
import { ShortcutHint } from '../../kit/shortcut-hint.tsx'
import { useShortcutPlatformKeys } from '../../kit/use-shortcut-platform.ts'
import { useSearch } from './context.ts'

const messages = defineMessages({
	button: {
		id: 'docs.search.button',
		defaultMessage: 'Search',
		description:
			'The label of the button at the top of the sidebar that opens the search of the docs.',
	},
})

/**
 * The button that opens the search, with its key ({@link ShortcutHint}). A pick
 * closes the mobile sidebar, as a pick of an item of the sidebar does.
 */
export function SearchButton() {
	const { request, preload } = useSearch()

	const offcanvas = use(OffcanvasContext)

	const keys = useShortcutPlatformKeys('K')

	// The label is zinc-600, because zinc-500 is 4.4:1 on the gray of the sidebar,
	// under the 4.5:1 of small text. The key is in `aria-keyshortcuts`, so the
	// glyph of the hint is not part of the name.
	return (
		<Button
			variant="outline"
			className="w-full justify-start font-normal text-zinc-600 dark:text-zinc-400"
			aria-keyshortcuts={keys}
			onPointerEnter={preload}
			onFocus={preload}
			onClick={() => request({ onPick: offcanvas?.close })}
		>
			<Icon icon={<Search />} />
			<span className="flex-1 text-start">
				<IntlMessage message={messages.button} />
			</span>
			<Kbd aria-hidden className="hidden lg:inline-flex">
				<ShortcutHint keyName="K" />
			</Kbd>
		</Button>
	)
}
