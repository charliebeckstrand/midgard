/**
 * Iro intent: the semantic intent-color bundle. Default text color
 * plus the named intents (`primary` / `success` / `warning` / `error` /
 * `muted`) that consumers reach by purpose rather than color axis.
 * Surfaced through the barrel as `iro.text`.
 *
 * Each intent reads the `onSurface` shade of its color in the ramp: the
 * foreground shade that clears AA on the page / card surface. `default` is
 * the max-emphasis neutral foreground.
 *
 * Layer: kiso · Concern: semantic text intent
 */

import { onSurface, strong } from './ramp'

export const intent = {
	default: strong,
	primary: onSurface.blue,
	success: onSurface.green,
	warning: onSurface.amber,
	error: onSurface.red,
	muted: onSurface.zinc,
} as const
