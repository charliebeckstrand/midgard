// The `{@link}` grammar lives once in the docs engine so the extractor's
// serialize side and this parse side can never drift; the chrome re-exports it
// under the local path its sibling renderers already import.
export { LINK_RE, type LinkToken, parseLinkToken } from '../../engine'
