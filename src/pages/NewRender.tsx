import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload, ChevronRight, ChevronLeft, Sparkles, Shield,
  Layers, Presentation, Maximize2, SlidersHorizontal, X, Image
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import Button from '../components/Button'
import styles from './NewRender.module.css'

const MODES = [
  {
    id: 'enhancer',
    name: 'Enhancer Mode',
    desc: 'Mejora un render existente',
    icon: Sparkles,
    credit: 1,
  },
  {
    id: 'realism',
    name: 'Realism Mode',
    desc: 'Convierte conceptos en visualizaciones realistas',
    icon: Image,
    credit: 2,
  },
  {
    id: 'style',
    name: 'Style Mode',
    desc: 'Aplica atmósferas y lenguajes visuales',
    icon: Layers,
    credit: 1,
  },
  {
    id: 'geometry',
    name: 'Geometry Lock',
    desc: 'Preserva composición y geometría',
    icon: Shield,
    credit: 2,
  },
  {
    id: 'presentation',
    name: 'Presentation Mode',
    desc: 'Optimiza para láminas y presentaciones',
    icon: Presentation,
    credit: 1,
  },
]

interface Config {
  realism: number
  intensity: number
  preserveGeometry: 'low' | 'medium' | 'high'
  lighting: 'natural' | 'cinematic' | 'soft' | 'neutral'
  materiality: 'concrete' | 'warm' | 'luxury' | 'tropical' | 'contemporary'
  aspectRatio: '16:9' | '4:3' | '1:1' | '3:2'
  resolution: 'standard' | 'high' | 'ultra'
  detail: number
  people: boolean
  vegetation: boolean
  sky: 'auto' | 'clean' | 'dramatic'
}

const defaultConfig: Config = {
  realism: 7,
  intensity: 6,
  preserveGeometry: 'medium',
  lighting: 'natural',
  materiality: 'contemporary',
  aspectRatio: '16:9',
  resolution: 'high',
  detail: 7,
  people: false,
  vegetation: true,
  sky: 'auto',
}

const STEPS = ['Imagen', 'Modo', 'Prompt', 'Configuración']

export default function NewRender() {
  const { addRender } = useApp()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedMode, setSelectedMode] = useState('')
  const [prompt, setPrompt] = useState('')
  const [config, setConfig] = useState<Config>(defaultConfig)
  const [generating, setGenerating] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    setImage(file)
    const reader = new FileReader()
    reader.onload = e => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const canNext = () => {
    if (step === 0) return !!image
    if (step === 1) return !!selectedMode
    return true
  }

  const handleGenerate = async () => {
    setGenerating(true)
    await new Promise(r => setTimeout(r, 2200))
    const modeObj = MODES.find(m => m.id === selectedMode)
    const id = addRender({
      title: image?.name?.replace(/\.[^.]+$/, '') || 'Render sin título',
      mode: modeObj?.name || '',
      prompt,
      status: 'done',
      thumbnail: imagePreview || undefined,
      isFavorite: false,
      parameters: config as unknown as Record<string, unknown>,
    })
    navigate(`/result/${id}`)
  }

  const setConf = <K extends keyof Config>(key: K, val: Config[K]) =>
    setConfig(prev => ({ ...prev, [key]: val }))

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Nuevo render</h1>
        <div className={styles.steps}>
          {STEPS.map((s, i) => (
            <div key={s} className={styles.stepItem}>
              <div className={[
                styles.stepNum,
                i === step ? styles.stepActive : '',
                i < step ? styles.stepDone : '',
              ].filter(Boolean).join(' ')}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={[
                styles.stepLabel,
                i === step ? styles.stepLabelActive : '',
              ].filter(Boolean).join(' ')}>{s}</span>
              {i < STEPS.length - 1 && <div className={styles.stepConnector} />}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>

        {/* Step 0: Upload */}
        {step === 0 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Sube tu imagen</h2>
            <p className={styles.stepSub}>JPG, PNG o WEBP. Máximo 20 MB.</p>

            {!image ? (
              <div
                className={[styles.dropzone, isDragging ? styles.dropzoneDragging : ''].filter(Boolean).join(' ')}
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <div className={styles.dropzoneIcon}>
                  <Upload size={22} strokeWidth={1.5} />
                </div>
                <div className={styles.dropzoneTitle}>Arrastra la imagen aquí</div>
                <div className={styles.dropzoneSub}>o haz clic para seleccionar</div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className={styles.fileInput}
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div className={styles.imagePreview}>
                <img src={imagePreview!} alt="Preview" className={styles.previewImg} />
                <button
                  className={styles.removeImg}
                  onClick={() => { setImage(null); setImagePreview(null) }}
                >
                  <X size={14} />
                </button>
                <div className={styles.previewMeta}>
                  <span>{image.name}</span>
                  <span>{(image.size / 1024 / 1024).toFixed(1)} MB</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Mode */}
        {step === 1 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Selecciona el modo</h2>
            <p className={styles.stepSub}>Elige cómo quieres transformar tu imagen.</p>
            <div className={styles.modesGrid}>
              {MODES.map(mode => {
                const Icon = mode.icon
                return (
                  <button
                    key={mode.id}
                    className={[styles.modeCard, selectedMode === mode.id ? styles.modeSelected : ''].filter(Boolean).join(' ')}
                    onClick={() => setSelectedMode(mode.id)}
                  >
                    <div className={styles.modeCardIcon}>
                      <Icon size={18} strokeWidth={1.5} />
                    </div>
                    <div className={styles.modeCardName}>{mode.name}</div>
                    <div className={styles.modeCardDesc}>{mode.desc}</div>
                    <div className={styles.modeCardCredit}>{mode.credit} crédito{mode.credit > 1 ? 's' : ''}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 2: Prompt */}
        {step === 2 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Describe el resultado</h2>
            <p className={styles.stepSub}>Escribe qué quieres obtener. Opcional pero recomendado.</p>
            <textarea
              className={styles.promptArea}
              placeholder="Ej: Luz de tarde cálida, jardín mediterráneo, materiales de piedra natural, cielo despejado sin nubes..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={5}
            />
            <div className={styles.promptSuggestions}>
              <div className={styles.promptSuggestLabel}>Sugerencias rápidas:</div>
              <div className={styles.promptTags}>
                {['Luz cálida de tarde', 'Cielo dramático', 'Vegetación exuberante', 'Materiales de lujo', 'Luz nórdica difusa', 'Atmósfera minimalista'].map(tag => (
                  <button
                    key={tag}
                    className={styles.promptTag}
                    onClick={() => setPrompt(p => p ? `${p}, ${tag.toLowerCase()}` : tag.toLowerCase())}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Config */}
        {step === 3 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Configuración</h2>
            <p className={styles.stepSub}>Ajusta los parámetros de generación según tu necesidad.</p>

            <div className={styles.configGrid}>
              {/* Realism */}
              <div className={styles.configSection}>
                <div className={styles.configSectionTitle}>
                  <SlidersHorizontal size={13} strokeWidth={1.8} />
                  Calidad e intensidad
                </div>
                <div className={styles.configRow}>
                  <SliderField
                    label="Nivel de realismo"
                    value={config.realism}
                    onChange={v => setConf('realism', v)}
                    min={1} max={10}
                  />
                  <SliderField
                    label="Intensidad del cambio"
                    value={config.intensity}
                    onChange={v => setConf('intensity', v)}
                    min={1} max={10}
                  />
                  <SliderField
                    label="Detalle"
                    value={config.detail}
                    onChange={v => setConf('detail', v)}
                    min={1} max={10}
                  />
                </div>
              </div>

              {/* Geometry */}
              <div className={styles.configSection}>
                <div className={styles.configSectionTitle}>
                  <Shield size={13} strokeWidth={1.8} />
                  Geometría y composición
                </div>
                <SelectField
                  label="Preservar geometría"
                  value={config.preserveGeometry}
                  options={[
                    { value: 'low', label: 'Baja — Más libertad creativa' },
                    { value: 'medium', label: 'Media — Balance' },
                    { value: 'high', label: 'Alta — Fiel a la estructura' },
                  ]}
                  onChange={v => setConf('preserveGeometry', v as Config['preserveGeometry'])}
                />
              </div>

              {/* Lighting */}
              <div className={styles.configSection}>
                <div className={styles.configSectionTitle}>
                  <Sparkles size={13} strokeWidth={1.8} />
                  Iluminación y materialidad
                </div>
                <div className={styles.configRow}>
                  <SelectField
                    label="Tipo de iluminación"
                    value={config.lighting}
                    options={[
                      { value: 'natural', label: 'Natural' },
                      { value: 'cinematic', label: 'Cinematográfica' },
                      { value: 'soft', label: 'Suave' },
                      { value: 'neutral', label: 'Neutra' },
                    ]}
                    onChange={v => setConf('lighting', v as Config['lighting'])}
                  />
                  <SelectField
                    label="Materialidad"
                    value={config.materiality}
                    options={[
                      { value: 'concrete', label: 'Concreta / Industrial' },
                      { value: 'warm', label: 'Cálida / Natural' },
                      { value: 'luxury', label: 'Lujo / Premium' },
                      { value: 'tropical', label: 'Tropical / Orgánica' },
                      { value: 'contemporary', label: 'Contemporánea' },
                    ]}
                    onChange={v => setConf('materiality', v as Config['materiality'])}
                  />
                </div>
              </div>

              {/* Output */}
              <div className={styles.configSection}>
                <div className={styles.configSectionTitle}>
                  <Maximize2 size={13} strokeWidth={1.8} />
                  Formato de salida
                </div>
                <div className={styles.configRow}>
                  <SelectField
                    label="Aspect ratio"
                    value={config.aspectRatio}
                    options={[
                      { value: '16:9', label: '16:9 — Panorámica' },
                      { value: '4:3', label: '4:3 — Estándar' },
                      { value: '1:1', label: '1:1 — Cuadrado' },
                      { value: '3:2', label: '3:2 — Fotografía' },
                    ]}
                    onChange={v => setConf('aspectRatio', v as Config['aspectRatio'])}
                  />
                  <SelectField
                    label="Resolución"
                    value={config.resolution}
                    options={[
                      { value: 'standard', label: 'Estándar — 1024px' },
                      { value: 'high', label: 'Alta — 2048px' },
                      { value: 'ultra', label: 'Ultra — 4096px' },
                    ]}
                    onChange={v => setConf('resolution', v as Config['resolution'])}
                  />
                </div>
              </div>

              {/* Extras */}
              <div className={styles.configSection}>
                <div className={styles.configSectionTitle}>
                  <Layers size={13} strokeWidth={1.8} />
                  Elementos adicionales
                </div>
                <div className={styles.togglesRow}>
                  <ToggleField
                    label="Personas"
                    value={config.people}
                    onChange={v => setConf('people', v)}
                  />
                  <ToggleField
                    label="Vegetación"
                    value={config.vegetation}
                    onChange={v => setConf('vegetation', v)}
                  />
                </div>
                <SelectField
                  label="Cielo y contexto"
                  value={config.sky}
                  options={[
                    { value: 'auto', label: 'Automático' },
                    { value: 'clean', label: 'Limpio / Despejado' },
                    { value: 'dramatic', label: 'Dramático' },
                  ]}
                  onChange={v => setConf('sky', v as Config['sky'])}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className={styles.footer}>
        {step > 0 ? (
          <Button variant="secondary" onClick={() => setStep(s => s - 1)}>
            <ChevronLeft size={14} /> Atrás
          </Button>
        ) : <div />}

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
            Siguiente <ChevronRight size={14} />
          </Button>
        ) : (
          <Button onClick={handleGenerate} loading={generating} disabled={generating}>
            {generating ? 'Procesando imagen...' : 'Generar imagen'}
            {!generating && <Sparkles size={13} />}
          </Button>
        )}
      </div>

      {/* Generating overlay */}
      {generating && (
        <div className={styles.generatingOverlay}>
          <div className={styles.generatingCard}>
            <div className={styles.generatingSpinner} />
            <div className={styles.generatingTitle}>Procesando imagen...</div>
            <div className={styles.generatingBar}>
              <div className={styles.generatingProgress} />
            </div>
            <div className={styles.generatingSub}>Esto puede tardar unos segundos</div>
          </div>
        </div>
      )}
    </div>
  )
}

/* Sub-components */
function SliderField({ label, value, onChange, min, max }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number;
}) {
  return (
    <div className={styles.fieldWrap}>
      <div className={styles.fieldLabel}>
        {label}
        <span className={styles.fieldValue}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={styles.slider}
      />
    </div>
  )
}

function SelectField({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className={styles.fieldWrap}>
      <label className={styles.fieldLabel}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={styles.select}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function ToggleField({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      className={[styles.toggle, value ? styles.toggleOn : ''].filter(Boolean).join(' ')}
      onClick={() => onChange(!value)}
      type="button"
    >
      <div className={styles.toggleTrack}>
        <div className={styles.toggleThumb} />
      </div>
      <span className={styles.toggleLabel}>{label}</span>
    </button>
  )
}
