import { cp, mkdir, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const srcDir = resolve(projectRoot, 'node_modules/@imgly/background-removal/dist')
const dstDir = resolve(projectRoot, 'public/imgly')

async function exists(p) {
  try { await stat(p); return true } catch { return false }
}

async function main() {
  const hasSrc = await exists(srcDir)
  if (!hasSrc) {
    console.log('[copy-imgly-assets] Source not found, did you install dependencies? Skipping.')
    return
  }
  await mkdir(dstDir, { recursive: true })
  await cp(srcDir, dstDir, { recursive: true })
  console.log('[copy-imgly-assets] Copied IMG.LY assets to', dstDir)
}

main().catch(err => {
  console.error('[copy-imgly-assets] Failed:', err)
  process.exit(1)
})


