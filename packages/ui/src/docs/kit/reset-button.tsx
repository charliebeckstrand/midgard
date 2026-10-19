import { Button, type ButtonProps } from 'ui/button'
import { defineMessage, IntlMessage } from 'ui/primitives/intl'

const resetMessage = defineMessage({
	id: 'docs.example.reset',
	defaultMessage: 'Reset',
	description:
		'The label of the button that puts an example back in its first state, such as after a close or a delete.',
})

/**
 * The look and the label of the button that resets an example: a soft red button with the
 * text "Reset", in the language of the reader. This record is the one source of these
 * values. A button that changes to a reset button, such as the "Simulate load" button of a
 * skeleton example, spreads it when it resets, so that the button stays one element and
 * keeps the focus.
 */
export const resetButtonProps = {
	variant: 'soft',
	color: 'red',
	children: <IntlMessage message={resetMessage} />,
} as const satisfies ButtonProps

/** Props for {@link ResetButton}: the props of a `Button` that is not a link, with no look. */
export type ResetButtonProps = Omit<Extract<ButtonProps, { href?: never }>, 'variant' | 'color'>

/**
 * The button that puts an example back in its first state, such as after a close, a
 * delete, or a load. It takes the props of a `Button`, but the look comes from
 * {@link resetButtonProps}. Use it for each reset button in an example, so that all reset
 * buttons look the same. `demo-reset-boundary.test.ts` finds a reset button that does not.
 */
export function ResetButton(props: ResetButtonProps) {
	return <Button {...resetButtonProps} {...props} />
}
