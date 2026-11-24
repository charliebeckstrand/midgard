'use client'

import { type ControlVariant, useControl } from '../../components/control/context'
import { useControlProps } from '../../components/control/use-control-props'
import { useControlScope } from '../../components/control/use-control-scope'
import { cn } from '../../core/cn'
import { invalidAttrs } from '../../core/invalid-attrs'
import { useFormValue } from '../../primitives/form/use-form-value'
import { useGlass } from '../../primitives/glass/context'
import { useHeadlessSlots } from '../../primitives/headless/use-headless-slots'
import { k } from '../../recipes/kata/wysiwyg'

/** The props of a Wysiwyg that {@link useWysiwygField} resolves. @internal */
type WysiwygFieldOptions = {
	value?: string | null
	defaultValue: string
	onValueChange?: (value: string) => void
	name?: string
	id?: string
	disabled?: boolean
	readOnly?: boolean
	required?: boolean
	invalid?: boolean
	variant?: ControlVariant
	placeholder?: string
	enterKeyHint?: string
	className?: string
	'aria-label'?: string
	'aria-labelledby'?: string
	'aria-describedby'?: string
	'aria-autocomplete'?: string
	'aria-haspopup'?: string
	'aria-controls'?: string
	/** Whether the frame has a row above or below the field. */
	rows: boolean
	/** Whether a toolbar is above the field and no row of actions is below it. */
	toolbar: boolean
	/** Whether the toolbar is above the frame, apart from the field. */
	separated: boolean
}

/**
 * The attributes of an object that have a value, as strings: `true` becomes
 * `"true"`, and `undefined` and `false` drop out.
 *
 * @internal
 */
function stringAttributes(
	attributes: Record<string, string | boolean | undefined>,
): Record<string, string> {
	const out: Record<string, string> = {}

	for (const [key, value] of Object.entries(attributes)) {
		if (value === undefined || value === false) continue

		out[key] = value === true ? 'true' : value
	}

	return out
}

/**
 * The control setup of a Wysiwyg. It resolves the value against the Form, the
 * field state against the Control cascade, the scoped id, the surface variant,
 * and the slots. It gives the attributes of the editable element by their HTML
 * names, as the editor takes them.
 *
 * @remarks As on Input, an explicit `invalid` sets the validation state on or
 * off, and an explicit name wins over the Label of the Field.
 * @internal
 */
export function useWysiwygField(options: WysiwygFieldOptions) {
	const control = useControl()

	const glass = useGlass()

	const { onValueChange } = options

	const form = useFormValue<string>(options.name, {
		value: options.value,
		defaultValue: options.defaultValue,
		onValueChange: onValueChange && ((next) => onValueChange(next ?? '')),
	})

	const shared = useControlProps({
		id: options.id,
		disabled: options.disabled,
		readOnly: options.readOnly,
		required: options.required,
		invalid: form.invalid,
		'aria-describedby': options['aria-describedby'],
	})

	const scope = useControlScope(options.name, shared.id)

	const disabled = Boolean(shared.disabled)

	const readOnly = Boolean(shared.readOnly) && !disabled

	const variant = options.variant ?? control?.variant ?? (glass ? 'glass' : undefined)

	const slots = useHeadlessSlots(k, {
		variant,
		actions: options.rows,
		toolbar: options.toolbar,
		separated: options.separated,
	})

	const named = options['aria-labelledby'] !== undefined || options['aria-label'] !== undefined

	// The Label of the Field names the field only when no explicit name does.
	const labelId = named ? undefined : control?.labelledBy

	const attributes = stringAttributes({
		id: scope.id,
		role: 'textbox',
		'aria-multiline': true,
		'aria-label': options['aria-label'],
		'aria-labelledby': options['aria-labelledby'] ?? labelId,
		'aria-describedby': shared['aria-describedby'],
		'aria-autocomplete': options['aria-autocomplete'],
		'aria-haspopup': options['aria-haspopup'],
		'aria-controls': options['aria-controls'],
		'aria-placeholder': options.placeholder,
		'aria-required': shared.required,
		'aria-readonly': readOnly,
		'aria-disabled': disabled,
		...(options.invalid === undefined ? shared.validation : invalidAttrs(options.invalid)),
		'data-slot': 'wysiwyg-field',
		class: cn(slots.field, options.className),
		// A field that takes no edit is not `contenteditable`, so it needs a tab
		// stop of its own. A disabled field has none.
		tabindex: readOnly ? '0' : undefined,
		enterkeyhint: options.enterKeyHint,
	})

	return {
		...form,
		value: form.value ?? '',
		fieldId: scope.id,
		disabled,
		locked: disabled || readOnly,
		labelId,
		slots,
		attributes,
	}
}
