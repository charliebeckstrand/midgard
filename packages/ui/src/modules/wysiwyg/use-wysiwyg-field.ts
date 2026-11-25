'use client'

import { useControl } from '../../components/control/context'
import { useControlProps } from '../../components/control/use-control-props'
import { useControlScope } from '../../components/control/use-control-scope'
import { useControlVariant } from '../../components/control/use-control-variant'
import { cn } from '../../core/cn'
import { invalidAttrs } from '../../core/invalid-attrs'
import type { VariantProps } from '../../core/recipe/engine/types'
import { useFormValue } from '../../primitives/form/use-form-value'
import { useHeadlessSlots } from '../../primitives/headless/use-headless-slots'
import { k } from '../../recipes/kata/wysiwyg'
import type { WysiwygProps } from './wysiwyg'

/** The props of a Wysiwyg that {@link useWysiwygField} resolves. @internal */
type WysiwygFieldOptions = Pick<
	WysiwygProps,
	| 'value'
	| 'name'
	| 'id'
	| 'disabled'
	| 'readOnly'
	| 'required'
	| 'invalid'
	| 'variant'
	| 'placeholder'
	| 'enterKeyHint'
	| 'className'
	| 'aria-label'
	| 'aria-labelledby'
	| 'aria-describedby'
	| 'aria-autocomplete'
	| 'aria-haspopup'
	| 'aria-controls'
> & {
	defaultValue: string
	onValueChange?: (value: string) => void
	/** The layout axes of the kata: where the toolbar and the actions row are. */
	layout: Pick<VariantProps<typeof k>, 'actions' | 'toolbar' | 'separated' | 'top'>
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

	const variant = useControlVariant(options.variant)

	const slots = useHeadlessSlots(k, { variant, ...options.layout })

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
