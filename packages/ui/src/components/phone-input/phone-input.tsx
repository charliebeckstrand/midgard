'use client'

import { Phone } from 'lucide-react'
import type { ReactNode } from 'react'
import { digitsOnly } from '../../utilities'
import { Icon } from '../icon'
import { MaskInput, type MaskInputProps } from '../mask-input'

/** Dialing locale selecting the formatting mask: NANP for `'US'`/`'CA'`, loose digit-and-`+` for `'international'`. */
export type PhoneInputCountry = 'US' | 'CA' | 'international'

/**
 * Props for {@link PhoneInput}. Inherits `<MaskInput>` props except `format`,
 * `type`, `inputMode`, `autoComplete`, and `prefix`, which are derived from
 * `country` or defaulted here.
 */
export type PhoneInputProps = Omit<
	MaskInputProps,
	'format' | 'type' | 'inputMode' | 'autoComplete' | 'prefix'
> & {
	/**
	 * Dialing locale driving the mask.
	 * @defaultValue 'US'
	 */
	country?: PhoneInputCountry
	/** Overrides the leading phone-icon affix. */
	prefix?: ReactNode
}

/** @internal North American Numbering Plan mask: strips a leading country `1`, caps at 10 digits, and formats as `(NXX) NXX-XXXX` as they arrive. */
function formatNANP(raw: string) {
	const digits = digitsOnly(raw)

	const d = (digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits).slice(0, 10)

	if (d.length === 0) return ''

	if (d.length <= 3) return d

	if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`

	return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

function formatInternational(raw: string) {
	const trimmed = raw.replace(/[^\d+]/g, '')

	const hasPlus = trimmed.startsWith('+')

	const digits = digitsOnly(trimmed).slice(0, 15)

	if (!digits) return hasPlus ? '+' : ''

	return hasPlus ? `+${digits}` : digits
}

const formatters = {
	US: formatNANP,
	CA: formatNANP,
	international: formatInternational,
} satisfies Record<PhoneInputCountry, (raw: string) => string>

/** Phone-number MaskInput: formats per `country` (NANP for `'US'`/`'CA'`, digit-and-`+` for `'international'`) with a leading phone-icon `prefix`. */
export function PhoneInput({ country = 'US', prefix, ...props }: PhoneInputProps) {
	return (
		<MaskInput
			data-slot="phone-input"
			type="tel"
			inputMode="tel"
			autoComplete="tel"
			prefix={prefix ?? <Icon icon={<Phone />} />}
			format={formatters[country]}
			{...props}
		/>
	)
}
