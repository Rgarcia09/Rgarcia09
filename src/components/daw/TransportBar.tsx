import { Play, Square, SkipBack, Volume2, Repeat } from 'lucide-react'
import styles from './TransportBar.module.css'

interface Props {
  bpm: number
  isPlaying: boolean
  masterVolume: number
  onPlay: () => void
  onStop: () => void
  onBpmChange: (v: number) => void
  onMasterVolumeChange: (v: number) => void
}

export default function TransportBar({
  bpm, isPlaying, masterVolume,
  onPlay, onStop, onBpmChange, onMasterVolumeChange,
}: Props) {
  const handleBpmInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10)
    if (!isNaN(v)) onBpmChange(v)
  }

  const handleBpmKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') onBpmChange(bpm + 1)
    if (e.key === 'ArrowDown') onBpmChange(bpm - 1)
  }

  return (
    <div className={styles.bar}>
      {/* Logo */}
      <div className={styles.logo}>
        <span className={styles.logoIcon}>♪</span>
        <span className={styles.logoText}>BeatStudio</span>
      </div>

      {/* Transport buttons */}
      <div className={styles.transport}>
        <button className={styles.btn} title="Rewind" onClick={onStop}>
          <SkipBack size={14} />
        </button>
        <button
          className={[styles.btn, styles.btnPlay, isPlaying ? styles.btnPlaying : ''].filter(Boolean).join(' ')}
          title={isPlaying ? 'Stop' : 'Play'}
          onClick={isPlaying ? onStop : onPlay}
        >
          {isPlaying ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>
        <div className={[styles.playIndicator, isPlaying ? styles.playIndicatorActive : ''].filter(Boolean).join(' ')} />
      </div>

      {/* BPM */}
      <div className={styles.bpmSection}>
        <span className={styles.bpmLabel}>BPM</span>
        <input
          type="number"
          className={styles.bpmInput}
          value={bpm}
          min={60}
          max={200}
          onChange={handleBpmInput}
          onKeyDown={handleBpmKey}
        />
        <input
          type="range"
          className={styles.bpmSlider}
          value={bpm}
          min={60}
          max={200}
          step={1}
          onChange={handleBpmInput}
        />
      </div>

      {/* Time signature & loop */}
      <div className={styles.timeSig}>
        <span className={styles.timeSigValue}>4 / 4</span>
        <button className={styles.loopBtn} title="Loop">
          <Repeat size={13} />
        </button>
      </div>

      {/* Master volume */}
      <div className={styles.volumeSection}>
        <Volume2 size={13} className={styles.volumeIcon} />
        <input
          type="range"
          className={styles.volumeSlider}
          value={masterVolume}
          min={0}
          max={1}
          step={0.01}
          onChange={e => onMasterVolumeChange(parseFloat(e.target.value))}
        />
        <span className={styles.volumeValue}>{Math.round(masterVolume * 100)}</span>
      </div>

      {/* Status indicator */}
      <div className={styles.status}>
        <div className={[styles.statusDot, isPlaying ? styles.statusDotPlaying : ''].filter(Boolean).join(' ')} />
        <span className={styles.statusText}>{isPlaying ? 'PLAYING' : 'STOPPED'}</span>
      </div>
    </div>
  )
}
