import { useSyncExternalStore } from 'react'
import { noopSubscribe } from '../../utilities/noop.ts'

/** Props for {@link ShortcutHint}. */
export type ShortcutHintProps = {
	/** The key after the modifier, such as "J" for a `$mod+KeyJ` binding. */
	keyName: string
}

const isApple = () => /Mac|iPod|iPhone|iPad/.test(navigator.platform)

// The build cannot know the platform of the reader, so each page holds ⌘.
const serverIsApple = () => true

/**
 * The key of a `$mod` shortcut: ⌘ and the key on Apple platforms, Ctrl+ and
 * the key elsewhere. It follows the `$mod` rule of tinykeys, which binds the
 * key. The build writes ⌘, and the client changes it to Ctrl+ after the
 * hydration on other platforms. Put it in a `Kbd`.
 */
export function ShortcutHint({ keyName }: ShortcutHintProps) {
	const apple = useSyncExternalStore(noopSubscribe, isApple, serverIsApple)

	return apple ? `⌘${keyName}` : `Ctrl+${keyName}`
}
