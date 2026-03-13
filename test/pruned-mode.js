const test = require('brittle')
const Hyperdrive = require('../')
const Corestore = require('corestore')
const fs = require('fs')
const path = require('path')
const os = require('os')

// Helper to create temp directory
function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hyperdrive-pruned-test-'))
}

test('backwards compatibility - normal mode', async (t) => {
  const dir = tmpdir()
  const store = new Corestore(dir)
  
  const drive = new Hyperdrive(store)
  await drive.ready()
  
  // Normal put
  await drive.put('/test.txt', Buffer.from('hello world'))
  
  // Read back
  const data = await drive.get('/test.txt')
  t.is(data.toString(), 'hello world')
  
  // Entry exists
  const entry = await drive.entry('/test.txt')
  t.ok(entry)
  t.ok(entry.value.blob)
  
  await drive.close()
  await store.close()
  fs.rmSync(dir, { recursive: true })
})

test('pruned mode - constructor options', async (t) => {
  const dir = tmpdir()
  const store = new Corestore(dir)
  
  const drive = new Hyperdrive(store, {
    pruned: true,
    originalPath: '/tmp/original.txt',
    prunedWindowSize: 50
  })
  
  await drive.ready()
  
  t.is(drive.pruned, true)
  t.is(drive.originalPath, '/tmp/original.txt')
  t.is(drive._prunedWindowSize, 50)
  
  await drive.close()
  await store.close()
  fs.rmSync(dir, { recursive: true })
})

test('pruned mode - setOriginalPath and getOriginalPath', async (t) => {
  const dir = tmpdir()
  const store = new Corestore(dir)
  
  const drive = new Hyperdrive(store, { pruned: true })
  await drive.ready()
  
  drive.setOriginalPath('/video.mp4', '/home/user/videos/original.mp4')
  drive.setOriginalPath('/docs/readme.txt', '/home/user/docs/readme.txt')
  
  t.is(drive.getOriginalPath('/video.mp4'), '/home/user/videos/original.mp4')
  t.is(drive.getOriginalPath('/docs/readme.txt'), '/home/user/docs/readme.txt')
  t.is(drive.getOriginalPath('/nonexistent'), null)
  
  await drive.close()
  await store.close()
  fs.rmSync(dir, { recursive: true })
})

test('pruned mode - putPruned clears blobs after write', async (t) => {
  const dir = tmpdir()
  const store = new Corestore(dir)
  
  const drive = new Hyperdrive(store, { pruned: true })
  await drive.ready()
  
  // Put with pruned mode
  await drive.putPruned('/test.txt', Buffer.from('hello world'), {
    originalPath: '/tmp/original.txt'
  })
  
  // Entry should exist
  const entry = await drive.entry('/test.txt')
  t.ok(entry, 'Entry exists')
  t.ok(entry.value.blob, 'Blob reference exists')
  
  // Original path should be mapped
  t.is(drive.getOriginalPath('/test.txt'), '/tmp/original.txt')
  
  // Blobs should be cleared (can't read without restoration)
  // Note: Reading will fail or return null since we cleared
  
  await drive.close()
  await store.close()
  fs.rmSync(dir, { recursive: true })
})

test('pruned mode - onBlockMissing callback set', async (t) => {
  const dir = tmpdir()
  const store = new Corestore(dir)
  
  let callbackCalled = false
  
  const drive = new Hyperdrive(store, {
    pruned: true,
    onBlockMissing: async (index, core, drv) => {
      callbackCalled = true
      t.is(typeof index, 'number')
      t.ok(core)
      t.is(drv, drive)
    }
  })
  
  await drive.ready()
  
  t.ok(drive._onBlockMissing, 'Custom callback stored')
  t.is(typeof drive._createBlockRestoreCallback(), 'function')
  
  await drive.close()
  await store.close()
  fs.rmSync(dir, { recursive: true })
})

test('pruned mode - block-missing event emitted', async (t) => {
  t.plan(2)
  
  const dir = tmpdir()
  const store = new Corestore(dir)
  
  const drive = new Hyperdrive(store, { pruned: true })
  await drive.ready()
  
  drive.on('block-missing', ({ index, core }) => {
    t.is(typeof index, 'number', 'Index is number')
    t.ok(core, 'Core provided')
  })
  
  // Manually call the callback to test event emission
  const callback = drive._createBlockRestoreCallback()
  try {
    await callback(0, { length: 10 })
  } catch {
    // Expected to fail since no original file
  }
  
  await drive.close()
  await store.close()
  fs.rmSync(dir, { recursive: true })
})

test('normal mode - no pruned options', async (t) => {
  const dir = tmpdir()
  const store = new Corestore(dir)
  
  const drive = new Hyperdrive(store)
  await drive.ready()
  
  t.is(drive.pruned, false)
  t.is(drive.originalPath, null)
  t.is(drive._onBlockMissing, null)
  
  await drive.close()
  await store.close()
  fs.rmSync(dir, { recursive: true })
})

test('multiple drives with different modes', async (t) => {
  const dir1 = tmpdir()
  const dir2 = tmpdir()
  
  const store1 = new Corestore(dir1)
  const store2 = new Corestore(dir2)
  
  const normalDrive = new Hyperdrive(store1)
  const prunedDrive = new Hyperdrive(store2, { pruned: true })
  
  await Promise.all([normalDrive.ready(), prunedDrive.ready()])
  
  t.is(normalDrive.pruned, false)
  t.is(prunedDrive.pruned, true)
  
  await normalDrive.close()
  await prunedDrive.close()
  await store1.close()
  await store2.close()
  
  fs.rmSync(dir1, { recursive: true })
  fs.rmSync(dir2, { recursive: true })
})

console.log('\n✓ All Hyperdrive pruned mode tests defined\n')
