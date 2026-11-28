import { useApplePlatform } from '../../hooks/use-apple-platform.ts'

/**
 * The `aria-keyshortcuts` value of a `$mod` shortcut: `Meta+K` on Apple
 * platforms and `Control+K` elsewhere, for the same platform rule as
 * `ShortcutHint`. Give it to the control that the shortcut operates, and hide
 * the `Kbd` of the hint from the accessibility tree, so the glyph is not part
 * of the name of the control.
 */
export function useShortcutPlatformKeys(keyName: string): string {
	return `${useApplePlatform() ? 'Meta' : 'Control'}+${keyName}`
}
