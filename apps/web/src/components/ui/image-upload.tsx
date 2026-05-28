'use client'

import { useRef, useState } from 'react'
import { ImagePlus, X, Loader2 } from 'lucide-react'

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  folder?: string
  aspect?: 'square' | 'banner'
  label?: string
  hint?: string
}

export function ImageUpload({
  value,
  onChange,
  folder = 'uploads',
  aspect = 'square',
  label,
  hint,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem (JPEG, PNG, WebP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Imagem muito grande. Tamanho máximo: 5 MB')
      return
    }

    setError(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Erro no upload')

      onChange(json.data.url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar imagem')
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const previewClass =
    aspect === 'banner'
      ? 'w-full h-32 rounded-xl object-cover'
      : 'w-20 h-20 rounded-xl object-cover'

  const dropzoneClass =
    aspect === 'banner'
      ? 'w-full h-32'
      : 'w-20 h-20'

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-gray-700">{label}</span>}

      <div className="flex items-start gap-3">
        {/* Preview / Dropzone */}
        <div
          className={`${dropzoneClass} relative shrink-0`}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {value ? (
            <>
              <img src={value} alt="Preview" className={previewClass} />
              <button
                type="button"
                onClick={() => onChange('')}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <X size={11} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className={`${dropzoneClass} border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1.5 bg-gray-50 hover:bg-gray-100 hover:border-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {uploading
                ? <Loader2 size={20} className="text-primary-500 animate-spin" />
                : <ImagePlus size={20} className="text-gray-400" />
              }
              {aspect !== 'banner' && (
                <span className="text-[10px] text-gray-400 text-center leading-tight px-1">
                  {uploading ? 'Enviando...' : 'Clique ou arraste'}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Botão trocar + hint (quando já tem imagem) */}
        {value && (
          <div className="flex flex-col gap-2 justify-center">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 text-sm text-primary-600 font-medium hover:underline disabled:opacity-50"
            >
              {uploading
                ? <><Loader2 size={14} className="animate-spin" /> Enviando...</>
                : <><ImagePlus size={14} /> Trocar imagem</>
              }
            </button>
            {hint && <p className="text-xs text-gray-400">{hint}</p>}
          </div>
        )}

        {/* Hint quando não tem imagem e aspect=banner */}
        {!value && aspect === 'banner' && (
          <div className="flex-1 flex flex-col justify-center gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 text-sm text-primary-600 font-medium hover:underline disabled:opacity-50"
            >
              {uploading
                ? <><Loader2 size={14} className="animate-spin" /> Enviando...</>
                : <><ImagePlus size={14} /> Selecionar imagem</>
              }
            </button>
            {hint && <p className="text-xs text-gray-400">{hint}</p>}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
