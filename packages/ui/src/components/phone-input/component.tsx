'use client'

import { Phone } from 'lucide-react'
import { forwardRef } from 'react'
import { useControllable } from '../../hooks'
import { Icon } from '../icon'
import { Input, type InputProps } from '../input'

export type PhoneInputCountry = 'US' | 'CA' | 'international'

export type PhoneInputProps = Omit<
	InputProps,
	'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange' | 'prefix'
> & {
	value?: string
	defaultValue?: string
	onChange?: (value: string) => void
	country?: PhoneInputCountry
	prefix?: React.ReactNode
}

function formatNANP(raw: string) {
	const d = raw.replace(/\D/g, '').slice(0, 10)

	if (d.length === 0) return ''
	if (d.length <= 3) return `(${d}`
	if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`

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

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
	{ country = 'US', value, defaultValue, onChange, prefix, ...props },
	ref,
) {
	const format = formatters[country]

	const [current, setCurrent] = useControllable<string>({
		value,
		defaultValue: defaultValue !== undefined ? format(defaultValue) : '',
		onChange: onChange ? (v) => onChange(v ?? '') : undefined,
	})

	return (
		<Input
			ref={ref}
			type="tel"
			inputMode="tel"
			autoComplete="tel"
			prefix={prefix ?? <Icon icon={<Phone />} />}
			value={current ?? ''}
			onChange={(e) => setCurrent(format(e.target.value))}
			{...props}
		/>
	)
})
