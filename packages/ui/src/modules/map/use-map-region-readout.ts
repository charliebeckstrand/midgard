'use client'

import { useMemo } from 'react'
import {
	type MapCategoryMeta,
	regionCategoryIndexes,
	resolveCategories,
} from './engine/map-region/category'
import type { MapRegionData } from './engine/map-region/data'
import { defaultRegionLabel } from './engine/map-region/identity'
import {
	type RegionValueJoin,
	regionValueJoin,
	resolveValueBins,
	resolveValueFormat,
} from './engine/map-region/value'
import type { MapFeature } from './engine/types'

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

/**
 * Resolves the categories or choropleth bins and matches each region to its bin.
 *
 * @remarks Takes the region data whole, because the union's branches are
 * exclusive only while the object holds together — `MapPlat` hands it its own
 * props, whose identity React mints fresh on every render. So the fields come
 * apart in the signature and the memo below depends on each one; never depend on
 * the object itself, which would re-join every region on every render.
 * @internal
 */
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

		// Every region on the neutral fill: what a data-less map reads, and what
		// data carrying neither a value nor a category key falls through to.
		const neutral = {
			categoryMetas: [],
			regionCategory: noValues,
			regionValues: noValues,
			regionNumbers: noValues,
			domain: null,
		}

		if (data === undefined || regionKey === undefined) return neutral

		if (valueKey !== undefined && colorRange !== undefined) {
			const format = resolveValueFormat(valueFormat)

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

		return neutral
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
