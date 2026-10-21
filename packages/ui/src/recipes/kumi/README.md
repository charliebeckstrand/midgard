# Kumi 組: Groups

> **Scope:** the shared structure of a family of units. A group holds slots, axes, and defaults in the shape of a unit. A kata unit extends its group, and adds its own slots and axes.

## 1. Contract

`kumi/` is internal. Only `kata/` reads it. A group reads the tokens of `kiso/` and the recipe engine (`defineGroup` from [`core/recipe`](../../core/recipe)). The `recipes/kumi/**` override in `biome.json` pins the direction.

A group is data, not a callable. `defineGroup({ slots, defaults }, extras)` holds the config, and a unit builds the recipe when it extends the group:

```ts
export const k = defineKata({
  extends: control,
  slots: { field: { base: 'block' } },
})
```

A group can extend a group. The merge is the same as the merge of a unit.

## 2. The merge

| Field | Rule |
|---|---|
| The classes of a slot, and of each value of an axis | The group first, then the unit. `tailwind-merge` lets the unit win a conflict. |
| A new slot, a new axis, or a new value | Added |
| Defaults | The unit wins for each prop |
| Compound rules | The group first, then the unit |
| Extras | Added; the unit wins for a name in both |
| Palette | A slot takes a palette from the group or from the unit. A palette in both throws. |

A unit cannot remove a class of its group, so the shared structure stays shared.

## 3. Groups

| Group | Slots | Units |
|---|---|---|
| `control` (`control/`) | `base` (the frame), `field`, `prefix`, `suffix`; the `variant` axis sets the surface of the frame | `input`, `textarea` |
| `trigger` (`control/`) | Extends `control`; each affix is a press target | `listbox`, `combobox`, `date-picker`, `color-picker` |

## 4. Rules

- **Two units or more.** A group exists only when two units or more extend it. The structure of one unit stays in its kata.
- **Japanese layer, English children.** The layer has a Japanese name, and each group and each key under it has an English name.
- **No component parts in kiso.** A fragment that builds a part of a component, such as a frame or an affix, lives in its group, not in kiso.

---

**See also:** [`../README.md`](../README.md) · [`../kiso/README.md`](../kiso/README.md) · [`../kata/README.md`](../kata/README.md)
