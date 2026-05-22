/**
 * Generic recipe applicator — the catch-all entry into katakana for kata
 * that don't belong to a named archetype (`button`, `badge`, `alert`,
 * `card`, `spinner`, …).
 *
 * For the mock this is a thin re-export of `defineRecipe`. The hypothesis
 * we're testing: once every kata routes through `recipe(...)`, duplication
 * across the long tail (`size: { sm: ji.sm, md: ji.md, lg: ji.lg }`,
 * `density: { … }`, palette boilerplate) will surface — and `recipe` can
 * grow translator behaviour to absorb it. Start thin; earn richness.
 */

export { defineRecipe as recipe } from '../../core/recipe'
