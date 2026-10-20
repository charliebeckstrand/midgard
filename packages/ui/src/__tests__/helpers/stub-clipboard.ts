/**
 * Sets `navigator.clipboard` for the current case. `undefined` removes the
 * Clipboard API, as an insecure origin does.
 *
 * @remarks
 * jsdom has no Clipboard API, so no accessor exists for `vi.spyOn`. The
 * setups delete the property after each case, also after a case that times
 * out, so a case does not restore it.
 *
 * @param clipboard - The clipboard that the case reads.
 */
export function stubClipboard(clipboard: Pick<Clipboard, 'writeText'> | undefined): void {
	Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard })
}
