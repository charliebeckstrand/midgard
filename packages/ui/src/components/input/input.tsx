'use client'

import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react'
import { cn, invalidAttrs } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { AffixProvider, affixStepDown } from '../../primitives/affix'
import { ControlFrame } from '../../primitives/control'
import { DensityScope, densityPresets, useDensity } from '../../primitives/density'
import { useSkeleton } from '../../providers/skeleton'
import type { Step } from '../../recipes'
import { type InputVariants, k } from '../../recipes/kata/input'
import { useControl } from '../control/context'
import { ControlSkeleton } from '../control/control-skeleton'
import { useControlProps } from '../control/use-control-props'
import { useGlass } from '../glass/context'
import { useHeadless } from '../headless/context'
import { Spinner } from '../spinner'
import { useInputValue } from './use-input-value'

export type InputProps = Omit<InputVariants, 'size'> & {
	size?: Step
	loading?: boolean
	prefix?: ReactNode
	suffix?: ReactNode
	/** Forces the invalid state. When omitted, inherits from Control / Form context. */
	invalid?: boolean
	ref?: Ref<HTMLInputElement>
	className?: string
	'data-group'?: string
	'data-group-orientation'?: string
} & Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'size' | 'prefix'>

export function Input(props: InputProps) {
	const hasValueProp = 'value' in props

	const {
		className,
		type,
		variant,
		size,
		loading,
		prefix,
		suffix,
		id,
		disabled,
		required,
		readOnly,
		autoComplete,
		invalid,
		name,
		value,
		onChange,
		onBlur,
		ref,
		'data-group': dataGroup,
		'data-group-orientation': dataGroupOrientation,
		...rest
	} = props

	const control = useControl()
	const glass = useGlass()
	const headless = useHeadless()
	const skeleton = useSkeleton()
	const inherited = useDensity()

	const token = size ? densityPresets[size] : inherited

	const resolvedSize = token.size

	const valueState = useInputValue({ hasValueProp, name, value, onChange, onBlur })

	const sharedAttrs = useControlProps({
		id,
		autoComplete,
		disabled,
		required,
		readOnly,
		binding: valueState.binding,
	})

	const scope = useIdScope({ id: sharedAttrs.id })

	const resolvedInvalid = invalid ?? sharedAttrs.invalid

	const resolvedVariant = variant ?? control?.variant ?? (glass ? 'glass' : undefined)

	if (headless) {
		return (
			<input
				ref={ref}
				data-slot="input"
				type={type}
				id={scope.id}
				name={name}
				autoComplete={sharedAttrs.autoComplete}
				disabled={sharedAttrs.disabled}
				required={sharedAttrs.required}
				readOnly={sharedAttrs.readOnly}
				value={valueState.value}
				onChange={valueState.onChange}
				onBlur={valueState.onBlur}
				className={className}
				{...invalidAttrs(resolvedInvalid)}
				{...rest}
			/>
		)
	}

	const resolvedPrefix = prefix
	const resolvedSuffix = loading ? <Spinner /> : suffix

	const hasAffix = resolvedPrefix !== undefined || resolvedSuffix !== undefined

	if (skeleton) {
		return <ControlSkeleton size={size} className={className} />
	}

	const affixStep = affixStepDown(resolvedSize)

	return (
		<DensityScope scale={size}>
			<AffixProvider value={affixStep}>
				<ControlFrame
					data-group={dataGroup}
					data-group-orientation={dataGroupOrientation}
					className={cn(
						k.inputControl({ variant: resolvedVariant }),
						hasAffix && 'group/control flex flex-wrap items-center',
					)}
				>
					{resolvedPrefix && (
						<span className={cn('peer/prefix', k.affix, k.prefix[token.density])}>
							{resolvedPrefix}
						</span>
					)}

					<input
						ref={ref}
						data-slot="input"
						type={type}
						id={scope.id}
						name={name}
						autoComplete={sharedAttrs.autoComplete}
						disabled={sharedAttrs.disabled}
						required={sharedAttrs.required}
						readOnly={sharedAttrs.readOnly}
						value={valueState.value}
						onChange={valueState.onChange}
						onBlur={valueState.onBlur}
						className={cn(
							k({
								variant: resolvedVariant,
								density: token.density,
								size: token.size,
							}),
							className,
						)}
						{...invalidAttrs(resolvedInvalid)}
						{...rest}
					/>

					{resolvedSuffix && (
						<span data-slot="suffix" className={cn(k.affix, k.suffix[token.density])}>
							{resolvedSuffix}
						</span>
					)}
				</ControlFrame>
			</AffixProvider>
		</DensityScope>
	)
}
