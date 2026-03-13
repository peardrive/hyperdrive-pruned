# @peardrive/hyperdrive — Project Manifest

## Overview
Fork of [holepunchto/hyperdrive](https://github.com/holepunchto/hyperdrive) with pruned storage mode.

## Status
- **npm:** `@peardrive/hyperdrive@pruned`
- **Version:** 11.15.3-pruned.1
- **Upstream:** 13.3.0 (functionally equivalent, version number behind)
- **Note:** Has all critical features (clear, clearAll, dedup)

## Key Changes from Upstream
1. Added `pruned` option to constructor
2. Added `putPruned()` method — writes then auto-clears
3. Added `setOriginalPath()` / `getOriginalPath()` for file mapping
4. Added `onBlockMissing` integration with blobs core
5. Added `block-missing` and `restore-error` events
6. Added `_createBlockRestoreCallback()` helper

## Files Modified
- `index.js` — All pruned mode additions
- `package.json` — Renamed to `@peardrive/hyperdrive`
- `README.md` — Added pruned mode documentation

## Usage
```javascript
const Hyperdrive = require('@peardrive/hyperdrive')
const Corestore = require('corestore')

const store = new Corestore('./storage')
const drive = new Hyperdrive(store, {
  pruned: true,
  onBlockMissing: async (index, core, drive) => {
    // Restore block from original file
  }
})

// Write + auto-clear
await drive.putPruned('/video.mp4', buffer, {
  originalPath: '/path/to/original.mp4'
})

// Metadata persists, blobs cleared
const entry = await drive.entry('/video.mp4')  // ✓ Works
```

## Constructor Options (New)
```javascript
{
  pruned: true,                    // Enable pruned mode
  originalPath: '/base/path',      // Base path for originals
  onBlockMissing: async (i, c, d) => {},  // Custom restore
  prunedWindowSize: 100            // Blocks to restore at once
}
```

## Methods (New)
- `drive.putPruned(name, buffer, opts)` — Put + auto-clear
- `drive.setOriginalPath(drivePath, filePath)` — Map paths
- `drive.getOriginalPath(drivePath)` — Get original path

## Events (New)
- `block-missing` — `{ index, core }`
- `restore-error` — `{ index, error }`

## Testing
```bash
cd ~/Apps/hyperdrive-pruned
npm test                    # Full test suite
npx brittle test/pruned-mode.js  # Pruned mode tests only
```

## Syncing with Upstream
```bash
git fetch upstream
git merge upstream/main
# Resolve conflicts in index.js
npm test
```

## Debugging: Revert to Standard Hyperdrive
```json
{
  "dependencies": {
    "hyperdrive": "^13.3.0"  // Standard, not @peardrive
  }
}
```

## TODO
- [ ] Sync to upstream v13.3.0
- [ ] Implement sliding window in `_restoreBlockFromOriginal`
- [ ] Add block-to-file mapping for multi-file drives

## Repository
- **GitHub:** https://github.com/peardrive/hyperdrive-pruned
- **npm:** https://www.npmjs.com/package/@peardrive/hyperdrive
- **Local:** `~/Apps/hyperdrive-pruned`
- **Upstream:** https://github.com/holepunchto/hyperdrive
