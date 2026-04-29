'use client'

import { Phone } from 'lucide-react'
import type { ReactNode } from 'react'
import { Icon } from '../icon'
import { MaskInput, type MaskInputProps } from '../mask-input'

export type PhoneInputCountry = 'US' | 'CA' | 'international'

export type PhoneInputProps = Omit<
	MaskInputProps,
	'format' | 'type' | 'inputMode' | 'autoComplete' | 'prefix'
> & {
	country?: PhoneInputCountry
	prefix?: ReactNode
}

function formatNANP(raw: string) {
	const digits = raw.replace(/\D/g, '')

	const d = (digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits).slice(0, 10)

	if (d.length === 0) return ''

	if (d.length <= 3) return d

	if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`

	return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

function formatInternational(raw: string) {
	const trimmed = raw.replace(/[^\d+]/g, '')

	const hasPlus = trimmed.startsWith('+')

	const digits = trimmed.replace(/\D/g, '').slice(0, 15)

	if (!digits) return hasPlus ? '+' : ''

	return hasPlus ? `+${digits}` : digits
}

const formatters: Record<PhoneInputCountry, (raw: string) => string> = {
	US: formatNANP,
	CA: formatNANP,
	international: formatInternational,
}

export function PhoneInput({ country = 'US', prefix, ...props }: PhoneInputProps) {
	return (
		<MaskInput
			type="tel"
			inputMode="tel"
			autoComplete="tel"
			prefix={prefix ?? <Icon icon={<Phone />} />}
			format={formatters[country]}
			{...props}
		/>
	)
}
