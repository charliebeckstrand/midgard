import { useSyncExternalStore } from 'react'
import { cn } from '../../core/cn.ts'
import { noopSubscribe } from '../../utilities/noop.ts'

/** Props for {@link ShortcutHint}. */
export type ShortcutHintProps = {
	/** The key after the modifier, such as "J" for a `$mod+KeyJ` binding. */
	keyName: string
}

const isApple = () => /Mac|iPod|iPhone|iPad/.test(navigator.platform)

// The build cannot know the platform of the reader, so each page shows ⌘.
const serverIsApple = () => true

/**
 * The key of a `$mod` shortcut: ⌘ and the key on Apple platforms, ⌃ (Control)
 * and the key elsewhere. It follows the `$mod` rule of tinykeys, which binds the
 * key. Each modifier is one glyph, so the key is about as wide as its text on
 * each platform. The build writes the two texts in one grid cell and shows ⌘.
 * After the hydration, the client shows ⌃ on other platforms. The cell has the
 * width of the wider text on each platform, so the key keeps its size
 * (CONVENTIONS §3.13). Put it in a `Kbd`.
 */
export function ShortcutHint({ keyName }: ShortcutHintProps) {
	const apple = useSyncExternalStore(noopSubscribe, isApple, serverIsApple)

	return (
		<span className="inline-grid justify-items-center">
			<span className={cn('col-start-1 row-start-1', !apple && 'invisible')}>⌘{keyName}</span>
			<span className={cn('col-start-1 row-start-1', apple && 'invisible')}>⌃{keyName}</span>
		</span>
	)
}
