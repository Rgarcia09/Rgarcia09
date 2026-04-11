import { useState } from 'react'
import { useDAW } from '../hooks/useDAW'
import TransportBar from '../components/daw/TransportBar'
import ChannelRack from '../components/daw/ChannelRack'
import PianoRoll from '../components/daw/PianoRoll'
import Mixer from '../components/daw/Mixer'
import { DRUM_INSTRUMENTS } from '../types/daw'
import styles from './DAW.module.css'

type View = 'channel-rack' | 'piano-roll' | 'mixer'

export default function DAW() {
  const daw = useDAW()
  const [activeView, setActiveView] = useState<View>('channel-rack')

  const selectedChannel = daw.channels.find(c => c.id === daw.selectedChannelId) ?? null
  const isDrumChannel = selectedChannel ? DRUM_INSTRUMENTS.includes(selectedChannel.instrument) : true

  const handleSelectChannel = (id: string) => {
    daw.setSelectedChannelId(id)
    const ch = daw.channels.find(c => c.id === id)
    if (ch && !DRUM_INSTRUMENTS.includes(ch.instrument)) {
      setActiveView('piano-roll')
    }
  }

  return (
    <div className={styles.daw}>
      {/* Transport bar */}
      <TransportBar
        bpm={daw.bpm}
        isPlaying={daw.isPlaying}
        masterVolume={daw.masterVolume}
        onPlay={daw.play}
        onStop={daw.stop}
        onBpmChange={daw.setBpm}
        onMasterVolumeChange={daw.setMasterVolume}
      />

      {/* Tab bar */}
      <div className={styles.tabBar}>
        <div className={styles.tabs}>
          {(['channel-rack', 'piano-roll', 'mixer'] as View[]).map(v => (
            <button
              key={v}
              className={[styles.tab, activeView === v ? styles.tabActive : ''].filter(Boolean).join(' ')}
              onClick={() => setActiveView(v)}
            >
              {v === 'channel-rack' && '🎛️ Channel Rack'}
              {v === 'piano-roll' && (
                <>
                  🎹 Piano Roll
                  {selectedChannel && !isDrumChannel && (
                    <span className={styles.tabBadge} style={{ background: selectedChannel.color }}>
                      {selectedChannel.name}
                    </span>
                  )}
                </>
              )}
              {v === 'mixer' && '🎚️ Mixer'}
            </button>
          ))}
        </div>
        <div className={styles.tabInfo}>
          {activeView === 'channel-rack' && (
            <span className={styles.tabHint}>Click steps to toggle · Select synth channels to open Piano Roll</span>
          )}
          {activeView === 'piano-roll' && !selectedChannel && (
            <span className={styles.tabHintWarn}>Select a synth channel (Bass, Lead, Pad) in Channel Rack first</span>
          )}
          {activeView === 'piano-roll' && selectedChannel && isDrumChannel && (
            <span className={styles.tabHintWarn}>"{selectedChannel.name}" is a drum channel — select Bass, Lead, or Pad</span>
          )}
        </div>
      </div>

      {/* Main panel */}
      <div className={styles.main}>
        {activeView === 'channel-rack' && (
          <ChannelRack
            channels={daw.channels}
            currentStep={daw.currentStep}
            selectedChannelId={daw.selectedChannelId}
            onToggleStep={daw.toggleStep}
            onToggleMute={daw.toggleMute}
            onToggleSolo={daw.toggleSolo}
            onSelectChannel={handleSelectChannel}
            onVolumeChange={daw.setChannelVolume}
          />
        )}

        {activeView === 'piano-roll' && (
          <>
            {selectedChannel && !isDrumChannel ? (
              <PianoRoll
                channel={selectedChannel}
                currentStep={daw.currentStep}
                onAddNote={daw.addNote}
                onRemoveNote={daw.removeNote}
                onUpdateNote={daw.updateNote}
                onPreviewNote={daw.previewNote}
              />
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🎹</span>
                <p className={styles.emptyTitle}>No synth channel selected</p>
                <p className={styles.emptyDesc}>
                  Go to Channel Rack and click on <strong>Bass</strong>, <strong>Lead</strong>, or <strong>Pad</strong> to edit notes in the Piano Roll.
                </p>
                <button className={styles.emptyBtn} onClick={() => setActiveView('channel-rack')}>
                  Open Channel Rack
                </button>
              </div>
            )}
          </>
        )}

        {activeView === 'mixer' && (
          <Mixer
            channels={daw.channels}
            masterVolume={daw.masterVolume}
            isPlaying={daw.isPlaying}
            onChannelVolumeChange={daw.setChannelVolume}
            onChannelPanChange={daw.setChannelPan}
            onToggleMute={daw.toggleMute}
            onToggleSolo={daw.toggleSolo}
            onMasterVolumeChange={daw.setMasterVolume}
          />
        )}
      </div>

      {/* Bottom status bar */}
      <div className={styles.statusBar}>
        <span className={styles.statusItem}>
          <span className={styles.statusKey}>BPM</span> {daw.bpm}
        </span>
        <span className={styles.statusItem}>
          <span className={styles.statusKey}>Steps</span> 16
        </span>
        <span className={styles.statusItem}>
          <span className={styles.statusKey}>Channels</span> {daw.channels.length}
        </span>
        {daw.isPlaying && (
          <span className={styles.statusItem}>
            <span className={styles.statusKey}>Step</span>
            {daw.currentStep >= 0 ? daw.currentStep + 1 : '—'}
          </span>
        )}
        <span className={styles.statusRight}>BeatStudio — Web DAW · Web Audio API</span>
      </div>
    </div>
  )
}
