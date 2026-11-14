// @vitest-environment node
import clsx, { type ClassValue } from 'clsx'
import { describe, expect, it } from 'vitest'
import { k as checkbox } from '../../recipes/kata/checkbox'
import { k as colorPicker } from '../../recipes/kata/color-picker'
import { k as control } from '../../recipes/kata/control'
import { k as datePicker } from '../../recipes/kata/date-picker'
import { k as input } from '../../recipes/kata/input'

/** The corner classes of an element: a plain radius or a stepped radius, with no variant. */
const radius = (classes: ClassValue) =>
	clsx(classes)
		.split(' ')
		.filter((name) => /^(density-)?rounded-/.test(name))

/**
 * A skeleton form tracks the silhouette of its unit (`kiso/kokkaku`). The corner of a unit takes
 * the step of its density scope, so the corner of its form must take the same ramp. A fixed radius
 * matches the unit at one step only.
 */
describe('kokkaku radius', () => {
	it('gives a control skeleton the corner of a control frame', () => {
		expect(radius(control.skeleton.base)).toEqual(radius(input().base))
	})

	it('gives a picker skeleton the corner of its trigger', () => {
		expect(radius(datePicker.skeleton.base)).toEqual(radius(datePicker().base))

		expect(radius(colorPicker.skeleton.base)).toEqual(radius(colorPicker().base))
	})

	it('gives a checkbox skeleton the corner of a checkbox', () => {
		expect(radius(checkbox.skeleton.base)).toEqual(radius(checkbox().base))
	})
})
