/**
 * Mount policy for a panel that spends part of its life inactive. Examples are
 * the view a cascade isn't showing, a disclosure's closed body, and a wizard
 * step off screen:
 *
 * - `always`: every panel is mounted up front and inactive ones are held
 *   (state preserved, effects paused).
 * - `lazy`: a panel is absent until it first becomes active, then held like
 *   `always`; defers the mount cost of never-visited panels.
 * - `active`: only the active panel is mounted; going inactive unmounts it and
 *   resets its state.
 */
export type Mount = 'always' | 'lazy' | 'active'

/**
 * Whether a policy guarantees every panel is in the DOM: the question a trigger
 * asks before pointing `aria-controls` at a panel it doesn't render. Only
 * `always` can answer yes: `lazy` mounts panels as they are visited, which no
 * sibling trigger can observe, and `active` keeps just the one.
 *
 * @remarks
 * The answer is correct for the client DOM only. The server renders nothing for
 * a hidden `<Activity>`, so a resting panel is not in the server markup. A
 * trigger that can render on the server asks {@link useMountsEveryPanel}
 * instead.
 */
export function mountsEveryPanel(mount: Mount): boolean {
	return mount === 'always'
}
