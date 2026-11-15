'use client'

import { Field, Label } from 'ui/fieldset'
import { Switch } from 'ui/switch'
import { useAutoDraw } from '../../hooks/use-auto-draw'

/**
 * The Auto-draw field of the settings: a Label above a Switch, in the form
 * of the appearance fields above it. While it is on, the game draws each
 * number itself (see `useGame`).
 */
export function AutoDrawField() {
	const [autoDraw, setAutoDraw] = useAutoDraw()

	return (
		<Field>
			<Label>Auto-draw</Label>
			<Switch checked={autoDraw} onChange={(event) => setAutoDraw(event.target.checked)} />
		</Field>
	)
}
