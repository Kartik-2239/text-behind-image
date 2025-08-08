import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

import { removeBackground } from '@imgly/background-removal'

const DEFAULT_TEXT = [
  { id: crypto.randomUUID(), text: 'Your Headline', x: 80, y: 120, size: 64, weight: 700, family: 'Inter', color: '#ffffff', opacity: 1 },
  { id: crypto.randomUUID(), text: 'Subheading goes here', x: 80, y: 200, size: 28, weight: 400, family: 'Inter', color: '#cbd5e1', opacity: 1 },
]

// IMG.LY removeBackground downloads models on first use; no explicit setup needed

function App() {
  const [imageSrc, setImageSrc] = useState(null)
  const [cutoutSrc, setCutoutSrc] = useState(null)
  const [texts, setTexts] = useState(DEFAULT_TEXT)
  const [selectedTextId, setSelectedTextId] = useState(DEFAULT_TEXT[0].id)
  const [isProcessing, setIsProcessing] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef(null)
  const imageRef = useRef(null)
  const compositeCanvasRef = useRef(null)
  const maskCanvasRef = useRef(null)

  const selectedText = useMemo(() => texts.find(t => t.id === selectedTextId) ?? null, [texts, selectedTextId])

  // Effect A: generate cutout when image loads
  useEffect(() => {
    if (!imageSrc || !imageLoaded) return
    let cancelled = false
    const imageEl = imageRef.current
    const compositeCanvas = compositeCanvasRef.current
    const ctx = compositeCanvas.getContext('2d')
    

    const computeCutout = async () => {
      setIsProcessing(true)
      const { naturalWidth: w, naturalHeight: h } = imageEl
      if (!w || !h) { setIsProcessing(false); return }
      compositeCanvas.width = w
      compositeCanvas.height = h
      setCanvasSize({ width: w, height: h })
      try {
        const blob = await removeBackground(imageSrc, {
          model: 'medium',
          output: { format: 'image/png', type: 'foreground', quality: 0.95 },
        })
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        setCutoutSrc(prev => { if (prev) URL.revokeObjectURL(prev); return url })
      } catch (err) {
        console.error('IMG.LY background removal failed', err)
        // Draw fallback (original + text only)
        ctx.clearRect(0, 0, compositeCanvas.width, compositeCanvas.height)
        ctx.drawImage(imageEl, 0, 0, w, h)
        for (const t of texts) {
          ctx.save()
          ctx.font = `${t.weight} ${t.size}px ${t.family}, sans-serif`
          ctx.fillStyle = t.color
          ctx.textBaseline = 'top'
          ctx.globalAlpha = t.opacity ?? 1
          ctx.fillText(t.text, t.x, t.y)
          ctx.restore()
        }
        if (!cancelled) setIsProcessing(false)
      } finally {
        // isProcessing will be cleared on cutout draw (success) or in catch (failure)
      }
    }
    computeCutout()
    return () => { cancelled = true }
  }, [imageSrc, imageLoaded])

  // Effect B: render composite when text or cutout changes
  useEffect(() => {
    if (!imageSrc || !imageLoaded) return
    const imageEl = imageRef.current
    const compositeCanvas = compositeCanvasRef.current
    const ctx = compositeCanvas.getContext('2d')
    const { naturalWidth: w, naturalHeight: h } = imageEl
    if (!w || !h) return
    ctx.clearRect(0, 0, compositeCanvas.width, compositeCanvas.height)
    // original
    ctx.drawImage(imageEl, 0, 0, w, h)
    // texts
    for (const t of texts) {
      ctx.save()
      ctx.font = `${t.weight} ${t.size}px ${t.family}, sans-serif`
      ctx.fillStyle = t.color
      ctx.textBaseline = 'top'
      ctx.globalAlpha = t.opacity ?? 1
      ctx.fillText(t.text, t.x, t.y)
      ctx.restore()
    }
    // cutout on top
    if (cutoutSrc) {
      const cutoutImg = new Image()
      cutoutImg.onload = () => {
        ctx.drawImage(cutoutImg, 0, 0, w, h)
        // Hide loader once the cutout is painted
        setIsProcessing(false)
      }
      cutoutImg.src = cutoutSrc
    }
  }, [texts, cutoutSrc, imageSrc, imageLoaded])

  const handleFile = e => {
    const file = e.target.files?.[0]
    if (!file) return
    loadFile(file)
  }

  const loadFile = (file) => {
     if (!file || !file.type?.startsWith?.('image/')) return
     const url = URL.createObjectURL(file)
     setImageLoaded(false)
     setImageSrc(url)
  }

  const onDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragging(true)
  }

  const onDragEnter = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = (e) => {
    // Only hide when leaving the container
    if (e.currentTarget === e.target) setIsDragging(false)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer?.files
    if (files && files.length) {
      const firstImage = Array.from(files).find(f => f.type?.startsWith?.('image/'))
      if (firstImage) loadFile(firstImage)
    }
  }

  const addText = () => {
    const newText = { id: crypto.randomUUID(), text: 'New Text', x: 60, y: 60, size: 32, weight: 600, family: 'Inter', color: '#ffffff', opacity: 1 }
    setTexts(prev => [...prev, newText])
    setSelectedTextId(newText.id)
  }

  const removeSelected = () => {
    if (!selectedText) return
    setTexts(prev => prev.filter(t => t.id !== selectedText.id))
    if (texts.length > 1) {
      setSelectedTextId(texts.find(t => t.id !== selectedText.id)?.id ?? null)
    } else {
      setSelectedTextId(null)
    }
  }

  const updateSelected = updates => {
    if (!selectedText) return
    setTexts(prev => prev.map(t => (t.id === selectedText.id ? { ...t, ...updates } : t)))
  }

  const download = () => {
    const link = document.createElement('a')
    link.download = 'composition.png'
    link.href = compositeCanvasRef.current.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/50 sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-gradient-to-br from-brand-500 to-indigo-500" />
            <div className="font-semibold tracking-tight text-lg">Text Behind Image</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="px-3 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 transition">Upload Image</button>
            <button onClick={download} className="px-3 py-2 rounded-md bg-brand-500 hover:bg-brand-600 transition disabled:opacity-50" disabled={!imageSrc}>Export PNG</button>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFile} />
          </div>
      </div>
      </header>

      <main className="flex-1 mx-auto max-w-7xl w-full grid grid-cols-12 gap-6 px-4 py-6">
        <aside className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50">
            <div className="px-4 py-3 border-b border-neutral-800 font-medium">Text Layers</div>
            <div className="p-3 space-y-2 max-h-[40vh] overflow-auto">
              {texts.map(t => (
                <button key={t.id} onClick={() => setSelectedTextId(t.id)} className={`w-full text-left px-3 py-2 rounded-lg border transition ${selectedTextId === t.id ? 'border-brand-500/60 bg-brand-500/10' : 'border-neutral-800 hover:bg-neutral-800/50'}`}>
                  <div className="text-sm font-medium truncate" style={{ fontFamily: t.family }}>{t.text}</div>
                  <div className="text-xs text-neutral-400">{t.size}px · {t.weight}</div>
        </button>
              ))}
              <button onClick={addText} className="w-full px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition">+ Add text</button>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50">
            <div className="px-4 py-3 border-b border-neutral-800 font-medium">Selected Text</div>
            {!selectedText ? (
              <div className="p-4 text-neutral-400 text-sm">Select a text layer to edit</div>
            ) : (
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">Content</label>
                  <input value={selectedText.text} onChange={e => updateSelected({ text: e.target.value })} className="w-full px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 outline-none focus:ring-2 ring-brand-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">Font family</label>
                  <select value={selectedText.family} onChange={e => updateSelected({ family: e.target.value })} className="w-full px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700">
                    {['Inter','Merriweather','DM Serif Display','Georgia','Times New Roman','Arial','Helvetica'].map(f => (<option key={f} value={f}>{f}</option>))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm text-neutral-300">Size</label>
                    <input className="w-full" type="range" min="12" max="1000" value={selectedText.size} onChange={e => updateSelected({ size: Number(e.target.value) })} />
                    <div className="text-xs text-neutral-400">{selectedText.size}px</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-neutral-300">Weight</label>
                    <select value={selectedText.weight} onChange={e => updateSelected({ weight: Number(e.target.value) })} className="w-full px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700">
                      {[100,200,300,400,500,600,700,800,900,1000].map(w => (<option key={w} value={w}>{w}</option>))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-sm text-neutral-300">X</label>
                    <input className="w-full" type="range" min="0" max={Math.max(0, canvasSize.width - 1)} value={selectedText.x} onChange={e => updateSelected({ x: Number(e.target.value) })} />
                    <div className="text-xs text-neutral-400">{selectedText.x}px</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-neutral-300">Y</label>
                    <input className="w-full" type="range" min="0" max={Math.max(0, canvasSize.height - 1)} value={selectedText.y} onChange={e => updateSelected({ y: Number(e.target.value) })} />
                    <div className="text-xs text-neutral-400">{selectedText.y}px</div>
                  </div>
                </div>

        
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">Opacity</label>
                  <input className="w-full mt-1" type="range" min="0" max="1" step="0.01" value={selectedText.opacity ?? 1} onChange={e => updateSelected({ opacity: Number(e.target.value) })} />
                  <div className="text-xs text-neutral-400">{Math.round((selectedText.opacity ?? 1)*100)}%</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-neutral-300">Color</label>
                  <input type="color" value={selectedText.color} onChange={e => updateSelected({ color: e.target.value })} className="w-full h-10 rounded-md bg-neutral-800 border border-neutral-700 p-1" />
                </div>
                <div className="flex justify-between">
                  <button onClick={removeSelected} className="px-3 py-2 rounded-md bg-red-600/90 hover:bg-red-600">Remove</button>
                </div>
              </div>
            )}
          </div>
        </aside>

        <section className="col-span-12 lg:col-span-8 xl:col-span-9">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
              <div className="font-medium">Canvas</div>
              {isProcessing && <div className="text-xs text-neutral-400">Processing…</div>}
            </div>
            <div
              className="p-4 grid grid-cols-1 gap-4 place-items-center relative"
              onDragOver={onDragOver}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              {isDragging && (
                <div className="absolute inset-0 z-20 grid place-items-center bg-neutral-950/50 backdrop-blur-sm border-2 border-dashed border-neutral-600">
                  <div className="text-center">
                    <div className="text-sm text-neutral-200">Drop image to upload</div>
                    <div className="text-xs text-neutral-400">PNG, JPG, WebP</div>
                  </div>
                </div>
              )}
              {imageSrc && (!imageLoaded || isProcessing) && (
                <div className="absolute inset-0 z-10 grid place-items-center bg-neutral-950/40 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 rounded-full border-2 border-neutral-400 border-t-transparent animate-spin" />
                    <div className="text-xs text-neutral-300">
                      {!imageLoaded ? 'Loading image…' : 'Removing background…'}
                    </div>
                  </div>
                </div>
              )}
              {!imageSrc ? (
                <div className="h-[420px] w-full max-w-3xl grid place-items-center text-neutral-400">
                  <div className="text-center">
                    <div className="text-lg font-medium">No image loaded</div>
                    <div className="text-sm">Click Upload Image to begin</div>
                  </div>
                </div>
              ) : (
                <div className="w-full overflow-auto">
                  <img ref={imageRef} src={imageSrc} alt="uploaded" className="max-w-full h-auto hidden" onLoad={() => setImageLoaded(true)} />
                  <canvas ref={compositeCanvasRef} className="w-full h-auto" />
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      </div>
  )
}

export default App
