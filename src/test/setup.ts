import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'

// React 19 needs this flag for act()-aware updates inside Testing Library.
globalThis.IS_REACT_ACT_ENVIRONMENT = true
