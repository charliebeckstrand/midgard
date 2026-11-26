import { useSyncExternalStore } from 'react'
import { isApplePlatform } from '../../utilities/apple-platform.ts'
import { noopSubscribe } from '../../utilities/noop.ts'

// The build cannot know the platform of the reader, so each page renders as on Apple.
const serverIsApple = () => true

/**
 * Whether the reader is on an Apple platform, where `$mod` is ⌘ (Meta) and not
 * Control. The server render and the hydration give `true`, and the client
 * then gives the real platform.
 */
export function useShortcutPlatform(): boolean {
	return useSyncExternalStore(noopSubscribe, isApplePlatform, serverIsApple)
}

/**
 * The `aria-keyshortcuts` value of a `$mod` shortcut: `Meta+K` on Apple
 * platforms and `Control+K` elsewhere, for the same platform rule as
 * `ShortcutHint`. Give it to the control that the shortcut operates, and hide
 * the `Kbd` of the hint from the accessibility tree, so the glyph is not part
 * of the name of the control.
 */
export function useShortcutPlatformKeys(keyName: string): string {
	return `${useShortcutPlatform() ? 'Meta' : 'Control'}+${keyName}`
}
