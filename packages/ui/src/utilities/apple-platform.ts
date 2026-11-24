/**
 * Whether the reader is on an Apple platform, where the `$mod` key of a
 * shortcut is Command. Elsewhere it is Control. The test is the one of
 * tinykeys and ProseMirror, which bind the shortcuts.
 *
 * @internal
 */
export function isApplePlatform(): boolean {
	return /Mac|iPod|iPhone|iPad/.test(navigator.platform)
}
