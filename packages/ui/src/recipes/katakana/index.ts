/**
 * Katakana 片仮名: the bridge layer.
 *
 * Each archetype is a pure bridge function. It receives a kiso token
 * bundle from the calling kata, and wires it into the recipe surface the
 * kata exports. It imports only the recipe engine (`core/recipe`). A bridge
 * imports nothing from kiso, neither values nor types. It declares the token
 * shape it needs as its own contract, and takes the data by argument. The
 * "no kiso import" contract is pinned by the `recipes/katakana/**` override in
 * `biome.json`.
 *
 * Five archetypes, six bridges:
 *
 * - `control` and `check`, the Control family: text-input and check-input
 *   branches;
 * - `popover`, a floating overlay;
 * - `segment`, the segmented control shared by Segment and Tabs;
 * - `panel`, the panel bundle shared by Dialog, Drawer, and Sheet.
 *
 * `slider` has no
 * bridge; it's a pure color token bundle the slider kata read from kiso
 * directly. Alongside the archetypes, `backdrop` is a small shared recipe
 * (not an archetype) for the drawer/sheet modal scrim.
 *
 * **The bridge is namespaced.** Bridges are reached through the `bridge`
 * object. A kata imports the token bundle under its bare archetype
 * name, and the bridge as `bridge.<archetype>` without an alias:
 *
 *     import { control } from '../kiso/control'
 *     import { bridge } from '../katakana'
 *     export const k = bridge.control(control, { base: 'block', slots: { … } })
 *
 * **What the barrel surfaces.** The `bridge` object of archetype wirings, plus
 * the `backdrop` shared recipe. It also surfaces `basePalette`, a shared palette
 * wiring rather than an archetype. That wiring bundles an injected
 * `iro.palette` into the solid / soft / outline matrix the chromatic surface
 * kata share. The bridges are generic over the token
 * bundle they receive; variant types resolve from the concrete `k` at the
 * kata (`VariantProps<typeof k>`), not from the bridge. Engine primitives
 * (`defineRecipe`, `definePalette`, `VariantProps`, …) stay in `core/recipe`;
 * kata import them from there.
 */

import { backdrop } from './backdrop'
import { check, control } from './control'
import { panel } from './panel'
import { popover } from './popover'
import { segment } from './segment'

export const bridge = { control, check, popover, segment, panel, backdrop }

export { basePalette } from './palette'
