// Opt-in extraDefaults adapters. A consumer wires one into defineDocsConfig to
// feed the extractor prop defaults its conventions declare outside the function
// signature; the extractor core stays agnostic to any of it.

export { type DeclaredDefaultsOptions, declaredDefaults, kebabCase } from './declared-defaults'
