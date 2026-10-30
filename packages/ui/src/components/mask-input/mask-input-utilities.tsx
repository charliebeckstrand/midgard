import { MapPinned, Phone } from 'lucide-react'
import type { ReactNode } from 'react'
import type { FormattedInputOptions } from '../../hooks/use-formatted-input'
import { digitsOnly } from '../../utilities'
import { Icon } from '../icon'
import type { InputProps } from '../input'

/** Maps a raw input string to its masked display form. */
export type MaskInputFormat = (raw: string) => string

/**
 * A named mask for {@link MaskInput}: the `format` and the field defaults that
 * go with it. An explicit prop on the field overrides each default.
 */
export type MaskInputPreset = {
	format: MaskInputFormat
	/** Predicate for the characters that the caret counts. See {@link FormattedInputOptions}. */
	meaningful?: FormattedInputOptions['meaningful']
	type?: InputProps['type']
	inputMode?: InputProps['inputMode']
	autoComplete?: InputProps['autoComplete']
	placeholder?: string
	prefix?: ReactNode
}

/** Dialing locale for {@link phoneMask}: NANP for `'US'`, loose digit-and-`+` for `'international'`. */
export type PhoneMaskCountry = 'US' | 'international'

/** Postal-code locale for {@link zipcodeMask}. */
export type ZipcodeMaskCountry = 'US' | 'CA' | 'GB' | 'international'

/**
 * @internal North American Numbering Plan mask: strips a leading country `1`
 * when there are more than 10 digits, caps at 10 digits, and formats as
 * `(NXX) NXX-XXXX` as they arrive.
 */
function formatNANP(raw: string) {
	const digits = digitsOnly(raw)

	const withoutCountry = digits.length > 10 && digits.startsWith('1') ? digits.slice(1) : digits

	const national = withoutCountry.slice(0, 10)

	if (national.length === 0) return ''

	if (national.length <= 3) return national

	if (national.length <= 7) return `${national.slice(0, 3)}-${national.slice(3)}`

	return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`
}

function formatInternationalPhone(raw: string) {
	const trimmed = raw.replace(/[^\d+]/g, '')

	const hasPlus = trimmed.startsWith('+')

	const digits = digitsOnly(trimmed).slice(0, 15)

	if (!digits) return hasPlus ? '+' : ''

	return hasPlus ? `+${digits}` : digits
}

/** @internal Counts an ASCII digit, the only digit that `digitsOnly` keeps. */
function isAsciiDigit(char: string) {
	return char >= '0' && char <= '9'
}

/**
 * @internal Counts the characters that {@link formatInternationalPhone} keeps:
 * an ASCII digit, and a `+` only when no digit or `+` comes before it.
 */
function isInternationalPhoneChar(char: string, index: number, text: string) {
	if (char === '+') return text.search(/[\d+]/) === index

	return isAsciiDigit(char)
}

const phoneFormats = {
	US: formatNANP,
	international: formatInternationalPhone,
} satisfies Record<PhoneMaskCountry, MaskInputFormat>

const phoneMeaningful = {
	US: isAsciiDigit,
	international: isInternationalPhoneChar,
} satisfies Record<PhoneMaskCountry, MaskInputPreset['meaningful']>

function formatZipUS(raw: string) {
	const digits = digitsOnly(raw).slice(0, 9)

	if (digits.length <= 5) return digits

	return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

function formatZipCA(raw: string) {
	const clean = raw
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, '')
		.slice(0, 6)

	if (clean.length <= 3) return clean

	return `${clean.slice(0, 3)} ${clean.slice(3)}`
}

// A GB postcode ends in its inward code: a digit and two letters. The format
// places the space before that code, as the CA format places its own, so a
// space that the user types does not count.
function formatZipGB(raw: string) {
	const clean = raw
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, '')
		.slice(0, 7)

	return /^[A-Z0-9]{2,4}\d[A-Z]{2}$/.test(clean)
		? `${clean.slice(0, -3)} ${clean.slice(-3)}`
		: clean
}

function formatZipInternational(raw: string) {
	return raw.slice(0, 12)
}

/**
 * @internal Counts the characters that the CA and GB formats keep: an ASCII
 * letter of either case, because the format uppercases it, and an ASCII digit.
 */
function isAsciiAlphanumeric(char: string) {
	return /^[A-Za-z0-9]$/.test(char)
}

// The international format keeps every character, so every character counts.
const keepsAll = () => true

const zipcodeFormats = {
	US: formatZipUS,
	CA: formatZipCA,
	GB: formatZipGB,
	international: formatZipInternational,
} satisfies Record<ZipcodeMaskCountry, MaskInputFormat>

const zipcodeMeaningful = {
	US: isAsciiDigit,
	CA: isAsciiAlphanumeric,
	GB: isAsciiAlphanumeric,
	international: keepsAll,
} satisfies Record<ZipcodeMaskCountry, MaskInputPreset['meaningful']>

const zipcodeInputModes = {
	US: 'numeric',
	CA: 'text',
	GB: 'text',
	international: 'text',
} satisfies Record<ZipcodeMaskCountry, InputProps['inputMode']>

const zipcodePlaceholders = {
	US: '12345',
	CA: 'A1A 1A1',
	GB: 'SW1A 1AA',
	international: '',
} satisfies Record<ZipcodeMaskCountry, string>

/**
 * Phone-number mask for {@link MaskInput}. It formats per `country`, sets
 * `type="tel"`, `inputMode="tel"`, and `autoComplete="tel"`, and adds a
 * leading phone icon. The caret counts only the characters that the format
 * keeps, so a character that the format removes does not move the caret.
 *
 * @param country - The dialing locale. The default is `'US'`.
 */
export function phoneMask(country: PhoneMaskCountry = 'US'): MaskInputPreset {
	return {
		format: phoneFormats[country],
		meaningful: phoneMeaningful[country],
		type: 'tel',
		inputMode: 'tel',
		autoComplete: 'tel',
		prefix: <Icon icon={<Phone />} />,
	}
}

/**
 * Postal-code mask for {@link MaskInput}. The masks cover US ZIP and ZIP+4,
 * Canadian FSA and LDU, UK outward and inward, and a loose international
 * fallback. It matches the keyboard (`inputMode`) and the placeholder to
 * `country`, sets `autoComplete="postal-code"`, and adds a leading map-pin
 * icon. The US, CA, and GB masks place their own separator. The caret counts
 * only the characters that the format keeps, so a character that the format
 * removes does not move the caret. The international mask keeps the text as
 * typed, and its caret counts every character.
 *
 * @param country - The postal-code locale. The default is `'US'`.
 */
export function zipcodeMask(country: ZipcodeMaskCountry = 'US'): MaskInputPreset {
	return {
		format: zipcodeFormats[country],
		meaningful: zipcodeMeaningful[country],
		type: 'text',
		inputMode: zipcodeInputModes[country],
		autoComplete: 'postal-code',
		placeholder: zipcodePlaceholders[country],
		prefix: <Icon icon={<MapPinned />} />,
	}
}
