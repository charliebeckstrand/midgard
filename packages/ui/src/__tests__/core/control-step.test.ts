// @vitest-environment node
import type { ComponentProps } from 'react'
import { describe, expect, expectTypeOf, it } from 'vitest'
import type { Button, ButtonSkeleton } from '../../components/button'
import type { Checkbox, CheckboxSkeleton } from '../../components/checkbox'
import type { ColorPanel, ColorPicker } from '../../components/color'
import type { Combobox } from '../../components/combobox'
import type { Control, ControlSkeleton } from '../../components/control'
import type { CopyButton } from '../../components/copy-button'
import type { DatePicker } from '../../components/date-picker'
import type { FileUploadButton, FileUploadInput } from '../../components/file-upload'
import type { Group } from '../../components/group'
import type { Input } from '../../components/input'
import type { Listbox } from '../../components/listbox'
import type { NumberInput } from '../../components/number-input'
import type { PasswordInput } from '../../components/password-input'
import type { Radio, RadioSkeleton } from '../../components/radio'
import type { Rating } from '../../components/rating'
import type { Select } from '../../components/select'
import type { RangeSlider, Slider } from '../../components/slider'
import type { Switch, SwitchSkeleton } from '../../components/switch'
import type { TagInput } from '../../components/tag-input'
import type { Textarea, TextareaSkeleton } from '../../components/textarea'
import type { ToggleIconButton } from '../../components/toggle-icon-button'
import { type ControlStep, type DensityStep, densitySteps } from '../../core/density'
import type { ControlFrame } from '../../primitives/control'
import type { SelectTrigger } from '../../primitives/select-trigger'

// A control stops at `lg`, so its `size` has no `xl` (Q-B, 2026-10-02). The
// density engine keeps `xl` for a scope, and a control in that scope takes
// the `lg` value.

type Size = ControlStep | undefined

describe('ControlStep', () => {
	it('is each density step but xl', () => {
		expectTypeOf<ControlStep>().toEqualTypeOf<Exclude<DensityStep, 'xl'>>()

		expectTypeOf<'xl'>().not.toExtend<ControlStep>()
	})

	it('leaves xl in the density steps, for a scope', () => {
		expect(densitySteps).toContain('xl')
	})
})

describe('the size of a control', () => {
	it('has no xl step', () => {
		expectTypeOf<ComponentProps<typeof Button>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof ButtonSkeleton>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof CopyButton>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof ToggleIconButton>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof Checkbox>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof CheckboxSkeleton>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof Radio>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof RadioSkeleton>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof Switch>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof SwitchSkeleton>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof Control>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof ControlSkeleton>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof Input>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof NumberInput>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof PasswordInput>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof TagInput>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof Textarea>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof TextareaSkeleton>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof Listbox>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof Select>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof Combobox>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof DatePicker>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof ColorPicker>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof ColorPanel>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof FileUploadInput>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof FileUploadButton>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof Slider>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof RangeSlider>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof Rating>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof Group>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof SelectTrigger>['size']>().toEqualTypeOf<Size>()
		expectTypeOf<ComponentProps<typeof ControlFrame>['density']>().toEqualTypeOf<Size>()
	})
})
