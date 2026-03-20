import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Download, RefreshCw, Copy, Heart, ArrowLeft,
  ZoomIn, ZoomOut, Maximize2, ChevronLeft, ChevronRight,
  Info, Eye
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import Button from '../components/Button'
import styles from './Result.module.css'

export default function Result() {
  const { id } = useParams()
  const { renders, toggleFavorite } = useApp()
  const navigate = useNavigate()
  const render = renders.find(r => r.id === id)

  const [showBefore, setShowBefore] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [sliderPos, setSliderPos] = useState(50)
  const [isDraggingSlider, setIsDraggingSlider] = useState(false)

  if (!render) {
    return (
      <div className={styles.notFound}>
        <p>Render no encontrado.</p>
        <Link to="/dashboard">Volver al inicio</Link>
      </div>
    )
  }

  const params = render.parameters as Record<string, unknown>

  const handleSliderMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingSlider) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pos = ((e.clientX - rect.left) / rect.width) * 100
    setSliderPos(Math.min(Math.max(pos, 2), 98))
  }

  const handleDownload = () => {
    if (!render.thumbnail) return
    const a = document.createElement('a')
    a.href = render.thumbnail
    a.download = `archi-ai-${render.id}.jpg`
    a.click()
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={14} strokeWidth={1.8} />
          Volver
        </button>
        <div className={styles.headerCenter}>
          <h1 className={styles.title}>{render.title}</h1>
          <div className={styles.modeBadge}>{render.mode}</div>
        </div>
        <div className={styles.headerActions}>
          <button
            className={[styles.iconBtn, render.isFavorite ? styles.iconBtnActive : ''].filter(Boolean).join(' ')}
            onClick={() => toggleFavorite(render.id)}
            aria-label="Favorito"
          >
            <Heart size={15} strokeWidth={render.isFavorite ? 0 : 1.8} fill={render.isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button
            className={styles.iconBtn}
            onClick={() => setShowInfo(s => !s)}
            aria-label="Info"
          >
            <Info size={15} strokeWidth={1.8} />
          </button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/new')}>
            <Copy size={12} /> Duplicar config
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/new')}>
            <RefreshCw size={12} /> Regenerar
          </Button>
          <Button size="sm" onClick={handleDownload}>
            <Download size={12} /> Descargar
          </Button>
        </div>
      </div>

      <div className={styles.mainLayout}>
        {/* Image panel */}
        <div className={styles.imagePanel}>
          {/* View controls */}
          <div className={styles.viewControls}>
            <button
              className={[styles.viewBtn, !showBefore ? styles.viewBtnActive : ''].filter(Boolean).join(' ')}
              onClick={() => setShowBefore(false)}
            >
              <Eye size={12} /> Resultado
            </button>
            <button
              className={[styles.viewBtn, showBefore ? styles.viewBtnActive : ''].filter(Boolean).join(' ')}
              onClick={() => setShowBefore(true)}
            >
              Original
            </button>
            <div className={styles.viewDivider} />
            <button className={styles.zoomBtn} onClick={() => setZoom(z => Math.min(z + 0.25, 3))}>
              <ZoomIn size={13} strokeWidth={1.8} />
            </button>
            <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
            <button className={styles.zoomBtn} onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}>
              <ZoomOut size={13} strokeWidth={1.8} />
            </button>
            <button className={styles.zoomBtn} onClick={() => setFullscreen(true)}>
              <Maximize2 size={13} strokeWidth={1.8} />
            </button>
          </div>

          {/* Compare slider */}
          <div
            className={styles.compareContainer}
            onMouseMove={handleSliderMove}
            onMouseUp={() => setIsDraggingSlider(false)}
            onMouseLeave={() => setIsDraggingSlider(false)}
          >
            {/* After (result) */}
            <div className={styles.compareAfter} style={{ transform: `scale(${zoom})` }}>
              {render.thumbnail ? (
                <img src={render.thumbnail} alt="Resultado" className={styles.compareImg} />
              ) : (
                <div className={styles.comparePlaceholder}>
                  <div className={styles.comparePlaceholderGrad} />
                </div>
              )}
            </div>

            {/* Before overlay (clip) */}
            {!showBefore && (
              <div
                className={styles.compareBefore}
                style={{ width: `${sliderPos}%`, transform: `scale(${zoom})` }}
              >
                <div className={styles.compareBeforeInner}>
                  {render.thumbnail ? (
                    <img src={render.thumbnail} alt="Original" className={styles.compareImg} style={{ filter: 'grayscale(100%) brightness(0.85)' }} />
                  ) : (
                    <div className={styles.comparePlaceholder}>
                      <div className={styles.comparePlaceholderLines} />
                    </div>
                  )}
                </div>
                <div
                  className={styles.sliderHandle}
                  onMouseDown={() => setIsDraggingSlider(true)}
                >
                  <div className={styles.sliderHandleBar} />
                  <div className={styles.sliderHandleKnob}>
                    <ChevronLeft size={10} />
                    <ChevronRight size={10} />
                  </div>
                </div>
              </div>
            )}

            {/* Labels */}
            {!showBefore && (
              <>
                <div className={styles.compareLabel} style={{ left: 12 }}>Antes</div>
                <div className={styles.compareLabel} style={{ right: 12 }}>Después</div>
              </>
            )}

            {showBefore && (
              <div className={styles.singleLabel}>Vista original</div>
            )}
          </div>
        </div>

        {/* Info panel */}
        {showInfo && (
          <div className={styles.infoPanel}>
            <h3 className={styles.infoPanelTitle}>Parámetros</h3>

            {render.prompt && (
              <div className={styles.infoBlock}>
                <div className={styles.infoBlockTitle}>Prompt</div>
                <p className={styles.infoBlockText}>{render.prompt}</p>
              </div>
            )}

            <div className={styles.infoBlock}>
              <div className={styles.infoBlockTitle}>Modo</div>
              <p className={styles.infoBlockText}>{render.mode}</p>
            </div>

            <div className={styles.infoBlock}>
              <div className={styles.infoBlockTitle}>Configuración</div>
              <div className={styles.paramsList}>
                {Object.entries(params).map(([key, val]) => (
                  <div key={key} className={styles.paramItem}>
                    <span className={styles.paramKey}>{key}</span>
                    <span className={styles.paramVal}>{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.infoBlock}>
              <div className={styles.infoBlockTitle}>Fecha</div>
              <p className={styles.infoBlockText}>
                {render.createdAt.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen */}
      {fullscreen && (
        <div className={styles.fullscreenOverlay} onClick={() => setFullscreen(false)}>
          <button className={styles.fullscreenClose} onClick={() => setFullscreen(false)}>
            <Maximize2 size={16} />
          </button>
          {render.thumbnail && (
            <img src={render.thumbnail} alt="Resultado" className={styles.fullscreenImg} />
          )}
        </div>
      )}
    </div>
  )
}
