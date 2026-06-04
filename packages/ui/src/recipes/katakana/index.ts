/**
 * Katakana 片仮名 — the bridge layer.
 *
 * Each archetype is a pure bridge function. It receives a kiso token
 * bundle from the calling kata and wires it into the recipe surface the
 * kata exports, importing only the recipe engine (`core/recipe`). A bridge
 * never imports kiso values — token shapes flow in by type, the data by
 * argument. The "no kiso value import" contract is pinned by
 * `src/__tests__/recipes/boundary/katakana-purity-boundary.test.ts`.
 *
 * Five archetypes, six bridges: `control` and `check` (the Control family —
 * text-input and check-input branches), `popover` (floating overlay),
 * `segment` (segmented control shared by Segment and Tabs), and `panel`
 * (panel bundle shared by Dialog, Drawer, and Sheet). `slider` has no
 * bridge — it's a pure colour token bundle the slider kata read from kiso
 * directly.
 *
 * **The bridge is namespaced.** Bridges are reached through the `katakana`
 * object so a kata can import the token bundle under its bare archetype
 * name and the bridge as `katakana.<archetype>` without an alias:
 *
 *     import { control } from '../kiso/control'
 *     import { katakana } from '../katakana'
 *     export const k = katakana.control(control, { base: 'block', slots: { … } })
 *
 * **What the barrel surfaces.** The `katakana` bridge object, nothing more.
 * The bridges are generic over the token bundle they receive, so variant
 * types resolve from the concrete `k` at the kata (`VariantProps<typeof
 * k>`), not from the bridge. Engine primitives (`defineRecipe`,
 * `definePalette`, `VariantProps`, …) stay in `core/recipe`; kata import
 * them from there.
 */

import { check, control } from './control'
import { panel } from './panel'
import { popover } from './popover'
import { segment } from './segment'

export const katakana = { control, check, popover, segment, panel }
