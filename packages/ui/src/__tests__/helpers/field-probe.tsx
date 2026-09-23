import { useFormField } from '../../components/form'
import { present } from './present'

/**
 * Renders the form state of one field, so that a case can read the store
 * through the DOM. Put it inside the `Form`, beside the control under test.
 *
 * The text is the value through `String`, so an unset value reads
 * `"undefined"`. `data-touched` and `data-dirty` hold the two flags, and
 * `data-error` holds the first error while there is one. Outside a `Form` there
 * is no field, so the probe omits all three. A check on a flag then fails,
 * whatever it expects. A check that `data-error` is absent still passes, so
 * pair it with a read that proves the field is there.
 *
 * The file stays off the `helpers` barrel for the reason that
 * `form-wrapper.tsx` does. It imports the form module, and only the
 * form-bound suites need that.
 */
export function FieldProbe({ name }: { name: string }) {
	const field = useFormField(name)

	return (
		<output
			data-slot="field-probe"
			data-field={name}
			data-touched={field?.touched}
			data-dirty={field?.dirty}
			data-error={field?.errors?.[0]}
		>
			{String(field?.value)}
		</output>
	)
}

/**
 * Finds the {@link FieldProbe} of one field in the document, and throws when
 * it is absent.
 *
 * @param name - The field that the probe reads.
 * @returns The probe.
 * @throws If no probe reads `name`.
 */
export function getFieldProbe(name: string): HTMLOutputElement {
	return present<HTMLOutputElement>(
		document.querySelector(`[data-slot="field-probe"][data-field="${name}"]`),
		`the probe of the "${name}" field`,
	)
}
