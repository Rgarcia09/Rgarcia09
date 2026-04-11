import type { Channel } from '../../types/daw'
import { DRUM_INSTRUMENTS } from '../../types/daw'
import { VolumeX, Volume2, Star } from 'lucide-react'
import styles from './ChannelRack.module.css'

interface Props {
  channels: Channel[]
  currentStep: number
  selectedChannelId: string | null
  onToggleStep: (channelId: string, stepIndex: number) => void
  onToggleMute: (channelId: string) => void
  onToggleSolo: (channelId: string) => void
  onSelectChannel: (channelId: string) => void
  onVolumeChange: (channelId: string, v: number) => void
}

const BEAT_GROUPS = [0, 4, 8, 12] // downbeats

export default function ChannelRack({
  channels, currentStep, selectedChannelId,
  onToggleStep, onToggleMute, onToggleSolo,
  onSelectChannel, onVolumeChange,
}: Props) {
  return (
    <div className={styles.rack}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Channel Rack</span>
        <div className={styles.stepNumbers}>
          {Array.from({ length: 16 }, (_, i) => (
            <div
              key={i}
              className={[
                styles.stepNum,
                BEAT_GROUPS.includes(i) ? styles.stepNumBeat : '',
                currentStep === i ? styles.stepNumActive : '',
              ].filter(Boolean).join(' ')}
            >
              {BEAT_GROUPS.includes(i) ? i / 4 + 1 : '·'}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.channels}>
        {channels.map(ch => {
          const isDrum = DRUM_INSTRUMENTS.includes(ch.instrument)
          const isSelected = ch.id === selectedChannelId
          return (
            <div
              key={ch.id}
              className={[styles.channel, isSelected ? styles.channelSelected : ''].filter(Boolean).join(' ')}
              onClick={() => onSelectChannel(ch.id)}
            >
              {/* Channel info strip */}
              <div className={styles.channelInfo} style={{ borderLeftColor: ch.color }}>
                <div className={styles.channelName} style={{ color: ch.color }}>
                  {ch.name}
                </div>
                <div className={styles.channelControls}>
                  <button
                    className={[styles.muteBtn, ch.muted ? styles.muteBtnActive : ''].filter(Boolean).join(' ')}
                    onClick={e => { e.stopPropagation(); onToggleMute(ch.id) }}
                    title="Mute"
                  >
                    {ch.muted ? <VolumeX size={10} /> : <Volume2 size={10} />}
                  </button>
                  <button
                    className={[styles.soloBtn, ch.solo ? styles.soloBtnActive : ''].filter(Boolean).join(' ')}
                    onClick={e => { e.stopPropagation(); onToggleSolo(ch.id) }}
                    title="Solo"
                  >
                    <Star size={9} />
                  </button>
                </div>
                <input
                  type="range"
                  className={styles.channelVol}
                  value={ch.volume}
                  min={0} max={1} step={0.01}
                  onClick={e => e.stopPropagation()}
                  onChange={e => onVolumeChange(ch.id, parseFloat(e.target.value))}
                  title={`Volume: ${Math.round(ch.volume * 100)}%`}
                />
              </div>

              {/* Steps grid */}
              <div className={styles.steps}>
                {ch.steps.map((step, idx) => {
                  const isCurrentStep = currentStep === idx
                  const isBeat = BEAT_GROUPS.includes(idx)
                  const hasPianoRoll = !isDrum && ch.notes.some(n => n.startStep === idx)
                  return (
                    <button
                      key={idx}
                      className={[
                        styles.step,
                        step.active ? styles.stepActive : '',
                        isCurrentStep ? styles.stepCurrent : '',
                        isBeat ? styles.stepBeat : '',
                        hasPianoRoll ? styles.stepHasPR : '',
                      ].filter(Boolean).join(' ')}
                      style={step.active ? { '--ch-color': ch.color } as React.CSSProperties : undefined}
                      onClick={e => {
                        e.stopPropagation()
                        if (isDrum) onToggleStep(ch.id, idx)
                      }}
                      title={isDrum ? `Step ${idx + 1}` : 'Edit in Piano Roll'}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
