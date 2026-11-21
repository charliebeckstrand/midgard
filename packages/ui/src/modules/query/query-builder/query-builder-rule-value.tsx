'use client'

import { parseDate } from '@internationalized/date'
import { fromCalendarDate, toCalendarDate } from '../../../components/calendar/calendar-utilities'
import { useControlLock } from '../../../components/control/context'
import { DatePicker } from '../../../components/date-picker'
import { Input } from '../../../components/input'
import type { JsonValue } from '../../../components/json-tree/types'
import { ListboxOption } from '../../../components/listbox'
import { NumberInput } from '../../../components/number-input'
import { Select } from '../../../components/select'
import { TagInput } from '../../../components/tag-input'
import { cn } from '../../../core/cn'
import { useIntl } from '../../../primitives/intl/use-intl'
import { Flex } from '../../../structure/flex'
import { finiteOrUndefined, parseNumeric } from '../../../utilities/parse-numeric'
import type { QueryField, QueryOperator } from '../engine/types'
import { useQueryValueEditor } from './context'
import { queryBuilderMessages } from './query-builder-messages'

/** Props for {@link QueryBuilderRuleValue}: the rule's `field`, its operator, and its current value plus a change callback. @internal */
export type QueryBuilderRuleValueProps = {
	/** The field of the rule. Its custom editor, else its type, selects the value input. */
	field: QueryField
	/**
	 * The operator of the rule. A `range` operator edits a two-bound
	 * `[min, max]` tuple, and a `set` operator edits a list of values. With no
	 * operator, the input edits a single value.
	 */
	operator?: QueryOperator
	/** The current value of the rule. */
	value: JsonValue | undefined
	/** Receives the next value of the rule. */
	onValueChange: (value: JsonValue) => void
	/** Disables each input of the value. @defaultValue false */
	disabled?: boolean
	className?: string
}

/** A range value as a `[min, max]` pair of numeric-or-blank bounds; non-tuples read as both-blank. @internal */
function toTuple(value: unknown): [number | '', number | ''] {
	const [lo, hi] = Array.isArray(value) ? value : []

	return [lo ?? '', hi ?? '']
}

/** A set value as a list of strings; a value that is not a list reads as an empty set. @internal */
function toMembers(value: unknown): string[] {
	return Array.isArray(value) ? value.map((member) => String(member ?? '')) : []
}

/**
 * Whether a tag can be a member of the set of `field`. A member of a `number`
 * field must read as a number ({@link parseNumeric}), and each other member can
 * be any text.
 *
 * @internal
 */
function isMember(field: QueryField, tag: string): boolean {
	return field.type !== 'number' || parseNumeric(tag) !== null
}

/**
 * The tags of a set input as the members of the set. A member of a `number`
 * field is a number, as the `NumberInput` of a single value writes it. So the
 * set compares each cell as a number, and `1234.50` holds the cell `$1,234.50`.
 *
 * @internal
 */
function toSet(field: QueryField, tags: string[]): JsonValue {
	return field.type === 'number' ? tags.map((tag) => parseNumeric(tag) ?? tag) : tags
}

/** A bound as a number, or `undefined` for a blank bound or one that is not a number. @internal */
function toBound(value: number | ''): number | undefined {
	if (value === '') return undefined

	return finiteOrUndefined(Number(value))
}

/**
 * The limits of each bound of a range. Each bound clamps to the field's `span`,
 * and each bound also clamps to the other, so the pair cannot invert. A bound
 * outside the span keeps each input's `min` at or below its `max`.
 *
 * @internal
 */
function rangeLimits(
	span: QueryField['span'],
	lo: number | undefined,
	hi: number | undefined,
): { lo: { min?: number; max?: number }; hi: { min?: number; max?: number } } {
	const [floor, ceiling] = span ?? []

	const loMax = hi === undefined ? ceiling : floor === undefined ? hi : Math.max(hi, floor)

	const hiMin = lo === undefined ? floor : ceiling === undefined ? lo : Math.min(lo, ceiling)

	return { lo: { min: floor, max: loMax }, hi: { min: hiMin, max: ceiling } }
}

// Serializes/parses the date by its local wall-clock components, through the
// calendar's timezone-free `CalendarDate`. Round-tripping through
// `toISOString().slice(0, 10)` / `new Date('YYYY-MM-DD')` would read the value
// as UTC midnight and drift the day by ±1 in non-UTC timezones.
function toIsoDate(date: Date): string {
	return toCalendarDate(date).toString()
}

/** The local-midnight `Date` for a `YYYY-MM-DD` string, or `undefined` where it does not parse. */
function fromIsoDate(value: string): Date | undefined {
	try {
		return fromCalendarDate(parseDate(value))
	} catch {
		return undefined
	}
}

/**
 * The `[min, max]` pair of number inputs for a range rule. Each bound clamps
 * to the field's `span` and to the other bound. With a span, each placeholder
 * is its end of the span alone (`18`), in the number form of the reader,
 * because each input's steppers leave room for a few characters only. With no span, the placeholders are `Min` and
 * `Max`.
 *
 * @internal
 */
function RangeValue({
	field,
	value,
	onValueChange,
	disabled,
	className,
}: Omit<QueryBuilderRuleValueProps, 'range'>) {
	const [lo, hi] = toTuple(value)

	const limits = rangeLimits(field.span, toBound(lo), toBound(hi))

	const [floor, ceiling] = field.span ?? []

	const intl = useIntl()

	return (
		<Flex gap="sm" className={cn('w-full', className)}>
			<NumberInput
				value={lo === '' ? null : lo}
				placeholder={
					floor === undefined
						? intl.formatMessage(queryBuilderMessages.min)
						: intl.formatNumber(floor)
				}
				aria-label={intl.formatMessage(queryBuilderMessages.fieldMin, { field: field.label })}
				min={limits.lo.min}
				max={limits.lo.max}
				disabled={disabled}
				className="w-full"
				onValueChange={(next) => onValueChange([next ?? '', hi])}
			/>

			<NumberInput
				value={hi === '' ? null : hi}
				placeholder={
					ceiling === undefined
						? intl.formatMessage(queryBuilderMessages.max)
						: intl.formatNumber(ceiling)
				}
				aria-label={intl.formatMessage(queryBuilderMessages.fieldMax, { field: field.label })}
				min={limits.hi.min}
				max={limits.hi.max}
				disabled={disabled}
				className="w-full"
				onValueChange={(next) => onValueChange([lo, next ?? ''])}
			/>
		</Flex>
	)
}

/**
 * Value input for a query rule. The custom editor of the field comes first,
 * when a `QueryValueEditorProvider` holds its `editor` key. The editor gets the
 * lock of the nearest lock scope as `readOnly`. Then the operator and the type
 * of the field choose:
 *
 * - a `set` operator: a {@link TagInput} that writes a list of strings, or of
 *   numbers for a `number` field
 * - a `range` operator: a `[min, max]` pair of {@link NumberInput}s. The pair
 *   clamps to the field's `span` and to each other
 * - `select`: a {@link Select}
 * - `number`: a {@link NumberInput}
 * - `date`: a {@link DatePicker}, round-tripped as a local-wall-clock ISO date
 * - anything else: a text {@link Input}
 *
 * @internal
 */
export function QueryBuilderRuleValue({
	field,
	operator,
	value,
	onValueChange,
	disabled = false,
	className,
}: QueryBuilderRuleValueProps) {
	const intl = useIntl()

	const Editor = useQueryValueEditor(field)

	const readOnly = useControlLock()

	const label = intl.formatMessage(queryBuilderMessages.fieldValue, { field: field.label })

	const placeholder = intl.formatMessage(queryBuilderMessages.value)

	if (Editor && operator) {
		return (
			<Editor
				field={field}
				operator={operator}
				value={value}
				onValueChange={onValueChange}
				aria-label={label}
				disabled={disabled}
				readOnly={readOnly}
				className={className}
			/>
		)
	}

	if (operator?.set) {
		return (
			<TagInput
				value={toMembers(value)}
				placeholder={placeholder}
				aria-label={label}
				disabled={disabled}
				className={className}
				validate={(tag) => isMember(field, tag)}
				onValueChange={(tags) => onValueChange(toSet(field, tags))}
			/>
		)
	}

	if (operator?.range) {
		return (
			<RangeValue
				field={field}
				value={value}
				onValueChange={onValueChange}
				disabled={disabled}
				className={className}
			/>
		)
	}

	if (field.type === 'select') {
		return (
			<Select
				value={(value as string | undefined) ?? ''}
				displayValue={(selected: string) =>
					field.options?.find((option) => option.value === selected)?.label ?? ''
				}
				onValueChange={(next: string | null) => onValueChange(next ?? '')}
				placeholder={placeholder}
				aria-label={label}
				disabled={disabled}
				className={className}
			>
				{field.options?.map((option) => (
					<ListboxOption key={option.value} value={option.value}>
						{option.label}
					</ListboxOption>
				))}
			</Select>
		)
	}

	if (field.type === 'number') {
		return (
			<NumberInput
				value={value === '' || value == null ? null : Number(value)}
				placeholder={placeholder}
				aria-label={label}
				disabled={disabled}
				className={className}
				onValueChange={(next) => onValueChange(next ?? '')}
			/>
		)
	}

	if (field.type === 'date') {
		const date = value ? fromIsoDate(value as string) : undefined

		return (
			<DatePicker
				value={date}
				placeholder={placeholder}
				aria-label={label}
				disabled={disabled}
				className={className}
				onValueChange={(next) => onValueChange(next ? toIsoDate(next) : '')}
			/>
		)
	}

	return (
		<Input
			type="text"
			value={(value as string | undefined) ?? ''}
			placeholder={placeholder}
			aria-label={label}
			disabled={disabled}
			className={className}
			onChange={(event) => onValueChange(event.target.value)}
		/>
	)
}
