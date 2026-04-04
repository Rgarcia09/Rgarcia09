import { useEffect, useRef, useState } from 'react'
import type { Channel } from '../../types/daw'
import { VolumeX, Volume2, Star } from 'lucide-react'
import styles from './Mixer.module.css'

interface Props {
  channels: Channel[]
  masterVolume: number
  isPlaying: boolean
  onChannelVolumeChange: (channelId: string, v: number) => void
  onChannelPanChange: (channelId: string, v: number) => void
  onToggleMute: (channelId: string) => void
  onToggleSolo: (channelId: string) => void
  onMasterVolumeChange: (v: number) => void
}

function VUMeter({ active, color }: { active: boolean; color: string }) {
  const [levels, setLevels] = useState([0, 0, 0, 0, 0, 0, 0, 0])
  const rafRef = useRef<number | null>(null)
  const timeRef = useRef(0)

  useEffect(() => {
    if (!active) {
      setLevels([0, 0, 0, 0, 0, 0, 0, 0])
      return
    }
    const animate = (ts: number) => {
      const elapsed = ts - timeRef.current
      if (elapsed > 80) {
        timeRef.current = ts
        setLevels(prev => prev.map(() => {
          const base = Math.random() * 0.6 + 0.2
          return base
        }))
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [active])

  return (
    <div className={styles.vu}>
      {levels.map((l, i) => (
        <div
          key={i}
          className={styles.vuBar}
          style={{
            height: `${l * 100}%`,
            background: l > 0.8 ? '#e05c5c' : l > 0.6 ? '#d4c44a' : color,
            opacity: active ? 1 : 0.15,
          }}
        />
      ))}
    </div>
  )
}

function PanKnob({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const startRef = useRef<{ y: number; val: number } | null>(null)

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    startRef.current = { y: e.clientY, val: value }
    const onMove = (ev: MouseEvent) => {
      if (!startRef.current) return
      const delta = (startRef.current.y - ev.clientY) / 80
      onChange(Math.max(-1, Math.min(1, startRef.current.val + delta)))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const angle = value * 135 // -135 to 135 deg
  return (
    <div
      className={styles.knob}
      onMouseDown={onMouseDown}
      onDoubleClick={() => onChange(0)}
      title={`Pan: ${value >= 0 ? 'R' : 'L'}${Math.abs(Math.round(value * 100))}`}
    >
      <div
        className={styles.knobInner}
        style={{ transform: `rotate(${angle}deg)` }}
      >
        <div className={styles.knobDot} />
      </div>
    </div>
  )
}

export default function Mixer({
  channels, masterVolume, isPlaying,
  onChannelVolumeChange, onChannelPanChange,
  onToggleMute, onToggleSolo, onMasterVolumeChange,
}: Props) {
  const hasSolo = channels.some(c => c.solo)

  return (
    <div className={styles.mixer}>
      <div className={styles.mixerHeader}>
        <span className={styles.mixerTitle}>Mixer</span>
        <span className={styles.mixerHint}>Drag pan knob · Double-click to reset</span>
      </div>

      <div className={styles.strips}>
        {channels.map(ch => {
          const isActive = isPlaying && !ch.muted && !(hasSolo && !ch.solo)
          return (
            <div key={ch.id} className={styles.strip}>
              {/* Channel name */}
              <div className={styles.stripName} style={{ color: ch.color }}>
                {ch.name}
              </div>

              {/* Pan knob */}
              <PanKnob
                value={ch.pan}
                onChange={v => onChannelPanChange(ch.id, v)}
              />
              <span className={styles.panLabel}>
                {ch.pan === 0 ? 'C' : ch.pan > 0 ? `R${Math.round(ch.pan * 100)}` : `L${Math.round(Math.abs(ch.pan) * 100)}`}
              </span>

              {/* VU meter */}
              <VUMeter active={isActive} color={ch.color} />

              {/* Volume fader */}
              <div className={styles.faderWrap}>
                <input
                  type="range"
                  className={styles.fader}
                  style={{ writingMode: 'vertical-lr', direction: 'rtl' } as React.CSSProperties}
                  value={ch.volume}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={e => onChannelVolumeChange(ch.id, parseFloat(e.target.value))}
                />
                <div
                  className={styles.faderTrack}
                  style={{ '--vol': ch.volume } as React.CSSProperties}
                />
              </div>

              {/* Volume % */}
              <span className={styles.volLabel}>{Math.round(ch.volume * 100)}</span>

              {/* Mute / Solo */}
              <div className={styles.stripButtons}>
                <button
                  className={[styles.stripBtn, ch.muted ? styles.stripBtnMute : ''].filter(Boolean).join(' ')}
                  onClick={() => onToggleMute(ch.id)}
                  title="Mute"
                >
                  {ch.muted ? <VolumeX size={10} /> : <Volume2 size={10} />}
                </button>
                <button
                  className={[styles.stripBtn, ch.solo ? styles.stripBtnSolo : ''].filter(Boolean).join(' ')}
                  onClick={() => onToggleSolo(ch.id)}
                  title="Solo"
                >
                  <Star size={9} />
                </button>
              </div>
            </div>
          )
        })}

        {/* Master channel */}
        <div className={[styles.strip, styles.masterStrip].filter(Boolean).join(' ')}>
          <div className={styles.stripName} style={{ color: '#c8c0ff' }}>Master</div>
          <div style={{ height: 28 }} />
          <span className={styles.panLabel}>—</span>
          <VUMeter active={isPlaying} color="#7c6af5" />
          <div className={styles.faderWrap}>
            <input
              type="range"
              className={styles.fader}
              style={{ writingMode: 'vertical-lr', direction: 'rtl' } as React.CSSProperties}
              value={masterVolume}
              min={0}
              max={1}
              step={0.01}
              onChange={e => onMasterVolumeChange(parseFloat(e.target.value))}
            />
          </div>
          <span className={styles.volLabel}>{Math.round(masterVolume * 100)}</span>
          <div className={styles.stripButtons} />
        </div>
      </div>
    </div>
  )
}
