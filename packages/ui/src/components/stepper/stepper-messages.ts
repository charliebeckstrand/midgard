import { defineMessages } from '../../primitives/intl/intl-messages'

/**
 * The messages of a stepper: the name of the step row, and the state of a
 * step that a screen reader speaks after its title.
 *
 * @internal
 */
export const stepperMessages = defineMessages({
	label: {
		id: 'ui.stepper.label',
		defaultMessage: 'Steps',
		description: 'The name of the row of the steps of a stepper, when no label names it.',
	},
	completed: {
		id: 'ui.stepper.completed',
		defaultMessage: 'completed',
		description:
			'The state of a step that is done. A screen reader speaks it after the title of the step and a comma. Lowercase.',
	},
	notStarted: {
		id: 'ui.stepper.notStarted',
		defaultMessage: 'not started',
		description:
			'The state of a step after the current step. A screen reader speaks it after the title of the step and a comma. Lowercase.',
	},
})
