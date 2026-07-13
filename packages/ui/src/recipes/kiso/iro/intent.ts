/**
 * Iro intent: the semantic intent-colour bundle. Default text colour
 * plus the named intents (`primary` / `success` / `warning` / `error` /
 * `muted`) that consumers reach by purpose rather than colour axis.
 * Surfaced through the barrel as `iro.text`.
 *
 * Each intent projects the ramp's `onSurface` role for its palette role
 * (`error` reads `danger`, `muted` reads `neutral`): the foreground shade
 * that clears AA on the page / card surface. `default` is the max-emphasis
 * neutral foreground.
 *
 * Layer: kiso · Concern: semantic text intent
 */

import { onSurface, strong } from './ramp'

export const intent = {
	default: strong,
	primary: onSurface.primary,
	success: onSurface.success,
	warning: onSurface.warning,
	error: onSurface.danger,
	muted: onSurface.neutral,
}
