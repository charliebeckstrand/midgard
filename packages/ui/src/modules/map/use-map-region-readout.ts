'use client'

import { useMemo } from 'react'
import {
	defaultRegionLabel,
	type MapCategoryMeta,
	regionCategoryIndexes,
	resolveCategories,
} from './map-categories'
import type { MapRegionData } from './map-region-data'
import { type RegionValueJoin, regionValueJoin, resolveValueBins } from './map-value-scale'
import type { MapFeature } from './types'

/** The resolved categorical or numeric readout behind the regions. @internal */
type MapRegionReadout = {
	categoryMetas: MapCategoryMeta[]
	regionNames: string[]
	/** Each region's category / bin index, `null` where no datum matches. */
	regionCategory: (number | null)[]
	/** Each region's own formatted value in the numeric (choropleth) mode — the
	 * tooltip and table readout, distinct from its bin's range label; `null` in
	 * categorical mode and wherever no datum matches. */
	regionValues: (string | null)[]
	/** Each region's raw number in the numeric (choropleth) mode — the range
	 * legend's arrow marks it on the continuous bar; `null` in categorical mode
	 * and wherever no datum matches. */
	regionNumbers: (number | null)[]
	/** The numeric value extent in the numeric (choropleth) mode; `null` otherwise. Feeds the range legend. */
	domain: [number, number] | null
}

/** Resolves the categories or choropleth bins and matches each region to its bin. @internal */
export function useMapRegionReadout<T>(
	features: MapFeature[],
	{
		data,
		regionKey,
		categoryKey,
		categories,
		valueKey,
		colorRange,
		bins,
		binning,
		domain,
		valueFormat,
	}: MapRegionData<T>,
	/** Region identities, resolved by the caller — the join key every branch below matches rows on. */
	regionIds: string[],
	regionLabel: ((feature: MapFeature) => string) | undefined,
): MapRegionReadout {
	const regionNames = useMemo(
		() => features.map(regionLabel ?? defaultRegionLabel),
		[features, regionLabel],
	)

	// One resolution: the numeric branch bins by value along a ramp, the
	// categorical branch resolves slot colours, and a data-less map leaves every
	// region on the neutral fill. Both branches emit the same meta + index shape,
	// so the regions, legend, tooltip, and table read either unchanged.
	const {
		categoryMetas,
		regionCategory,
		regionValues,
		regionNumbers,
		domain: extent,
	} = useMemo<
		RegionValueJoin & { categoryMetas: MapCategoryMeta[]; domain: [number, number] | null }
	>(() => {
		// The all-null column, shared by every field a branch leaves empty:
		// nothing downstream mutates the readout arrays, so one allocation
		// serves them all.
		const noValues = regionIds.map(() => null)

		if (data === undefined || regionKey === undefined) {
			return {
				categoryMetas: [],
				regionCategory: noValues,
				regionValues: noValues,
				regionNumbers: noValues,
				domain: null,
			}
		}

		if (valueKey !== undefined && colorRange !== undefined) {
			const format = valueFormat ?? ((value) => String(value))

			const {
				metas,
				domain: resolved,
				assign,
			} = resolveValueBins(data, valueKey, {
				colorRange,
				bins,
				binning,
				domain,
				format,
			})

			// One joined pass: each region's bin (its colour), its own formatted
			// readout (the tooltip and table show "2,088", not the bin's "1–135"),
			// and its raw number (the range legend's arrow).
			return {
				categoryMetas: metas,
				...regionValueJoin(regionIds, data, regionKey, valueKey, assign, format),
				domain: resolved,
			}
		}

		if (categoryKey !== undefined) {
			const metas = resolveCategories(data, categoryKey, categories)

			return {
				categoryMetas: metas,
				regionCategory: regionCategoryIndexes(regionIds, data, regionKey, categoryKey, metas),
				// Categorical mode reads the category label off the meta; no separate value.
				regionValues: noValues,
				regionNumbers: noValues,
				domain: null,
			}
		}

		return {
			categoryMetas: [],
			regionCategory: noValues,
			regionValues: noValues,
			regionNumbers: noValues,
			domain: null,
		}
	}, [
		data,
		regionKey,
		categoryKey,
		categories,
		valueKey,
		colorRange,
		bins,
		binning,
		domain,
		valueFormat,
		regionIds,
	])

	return { categoryMetas, regionNames, regionCategory, regionValues, regionNumbers, domain: extent }
}
