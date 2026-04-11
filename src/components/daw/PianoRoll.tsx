import { useRef, useState, useCallback, useEffect } from 'react'
import type { Channel, Note, InstrumentType } from '../../types/daw'
import { Trash2 } from 'lucide-react'
import styles from './PianoRoll.module.css'

interface Props {
  channel: Channel
  currentStep: number
  onAddNote: (channelId: string, note: Omit<Note, 'id'>) => void
  onRemoveNote: (channelId: string, noteId: string) => void
  onUpdateNote: (channelId: string, noteId: string, update: Partial<Note>) => void
  onPreviewNote: (channelId: string, instrument: InstrumentType, pitch: number) => void
}

const NUM_STEPS = 16
const NOTE_HEIGHT = 20
const STEP_WIDTH = 48
// Pitch range: MIDI 24 (C1) to MIDI 96 (C7)
const MIN_PITCH = 24
const MAX_PITCH = 96
const NUM_PITCHES = MAX_PITCH - MIN_PITCH + 1

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const BLACK_KEYS = new Set([1, 3, 6, 8, 10])

function pitchName(midi: number) {
  const name = NOTE_NAMES[midi % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${name}${octave}`
}

function isBlackKey(midi: number) {
  return BLACK_KEYS.has(midi % 12)
}

type Tool = 'pencil' | 'eraser'

export default function PianoRoll({
  channel, currentStep,
  onAddNote, onRemoveNote, onUpdateNote, onPreviewNote,
}: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [tool, setTool] = useState<Tool>('pencil')
  const [dragging, setDragging] = useState<{ noteId: string; startX: number; startStep: number; startPitch: number } | null>(null)
  const [resizing, setResizing] = useState<{ noteId: string; startX: number; startLen: number } | null>(null)

  const pitchAtY = useCallback((y: number) => {
    const row = Math.floor(y / NOTE_HEIGHT)
    return MAX_PITCH - row
  }, [])

  const stepAtX = useCallback((x: number) => {
    return Math.max(0, Math.min(NUM_STEPS - 1, Math.floor(x / STEP_WIDTH)))
  }, [])

  const handleGridMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const rect = gridRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left + gridRef.current!.scrollLeft
    const y = e.clientY - rect.top + gridRef.current!.scrollTop

    const pitch = pitchAtY(y)
    const step = stepAtX(x)

    if (tool === 'pencil') {
      // Check if clicking on an existing note
      const existing = channel.notes.find(n =>
        n.pitch === pitch &&
        step >= n.startStep &&
        step < n.startStep + n.length
      )
      if (existing) return // let note handle it

      onAddNote(channel.id, { pitch, startStep: step, length: 2, velocity: 100 })
      onPreviewNote(channel.id, channel.instrument, pitch)
    }
  }, [tool, channel, pitchAtY, stepAtX, onAddNote, onPreviewNote])

  const handleNoteMouseDown = useCallback((e: React.MouseEvent, note: Note, mode: 'move' | 'resize') => {
    e.stopPropagation()
    if (tool === 'eraser') {
      onRemoveNote(channel.id, note.id)
      return
    }
    if (mode === 'move') {
      setDragging({ noteId: note.id, startX: e.clientX, startStep: note.startStep, startPitch: note.pitch })
    } else {
      setResizing({ noteId: note.id, startX: e.clientX, startLen: note.length })
    }
    onPreviewNote(channel.id, channel.instrument, note.pitch)
  }, [tool, channel, onRemoveNote, onPreviewNote])

  useEffect(() => {
    if (!dragging && !resizing) return
    const onMove = (e: MouseEvent) => {
      if (dragging) {
        const dx = e.clientX - dragging.startX
        const stepDelta = Math.round(dx / STEP_WIDTH)
        const newStep = Math.max(0, Math.min(NUM_STEPS - 1, dragging.startStep + stepDelta))
        // For pitch, compute from mouse Y
        const rect = gridRef.current?.getBoundingClientRect()
        if (rect) {
          const y = e.clientY - rect.top + (gridRef.current?.scrollTop ?? 0)
          const newPitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitchAtY(y)))
          onUpdateNote(channel.id, dragging.noteId, { startStep: newStep, pitch: newPitch })
        }
      }
      if (resizing) {
        const dx = e.clientX - resizing.startX
        const lenDelta = Math.round(dx / STEP_WIDTH)
        const newLen = Math.max(1, Math.min(NUM_STEPS, resizing.startLen + lenDelta))
        onUpdateNote(channel.id, resizing.noteId, { length: newLen })
      }
    }
    const onUp = () => {
      setDragging(null)
      setResizing(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, resizing, channel.id, onUpdateNote, pitchAtY])

  return (
    <div className={styles.pianoRoll}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.toolbarTitle} style={{ color: channel.color }}>
          Piano Roll — {channel.name}
        </span>
        <div className={styles.tools}>
          <button
            className={[styles.toolBtn, tool === 'pencil' ? styles.toolBtnActive : ''].filter(Boolean).join(' ')}
            onClick={() => setTool('pencil')}
            title="Draw tool"
          >
            ✏️ Draw
          </button>
          <button
            className={[styles.toolBtn, tool === 'eraser' ? styles.toolBtnActive : ''].filter(Boolean).join(' ')}
            onClick={() => setTool('eraser')}
            title="Eraser tool"
          >
            <Trash2 size={12} /> Erase
          </button>
        </div>
        <span className={styles.toolbarHint}>Click to add notes · Drag handle to resize · Shift+click to delete</span>
      </div>

      <div className={styles.editor}>
        {/* Piano keyboard */}
        <div className={styles.keyboard}>
          {Array.from({ length: NUM_PITCHES }, (_, i) => {
            const pitch = MAX_PITCH - i
            const isC = pitch % 12 === 0
            const isBlack = isBlackKey(pitch)
            return (
              <div
                key={pitch}
                className={[styles.key, isBlack ? styles.keyBlack : styles.keyWhite, isC ? styles.keyC : ''].filter(Boolean).join(' ')}
                style={{ height: NOTE_HEIGHT }}
                onMouseDown={() => onPreviewNote(channel.id, channel.instrument, pitch)}
              >
                {isC && <span className={styles.keyLabel}>{pitchName(pitch)}</span>}
              </div>
            )
          })}
        </div>

        {/* Grid + notes */}
        <div className={styles.gridWrapper} ref={gridRef} onMouseDown={handleGridMouseDown}>
          <div
            className={styles.grid}
            style={{
              width: NUM_STEPS * STEP_WIDTH,
              height: NUM_PITCHES * NOTE_HEIGHT,
            }}
          >
            {/* Horizontal pitch lines */}
            {Array.from({ length: NUM_PITCHES }, (_, i) => {
              const pitch = MAX_PITCH - i
              const isBlack = isBlackKey(pitch)
              const isC = pitch % 12 === 0
              return (
                <div
                  key={pitch}
                  className={[
                    styles.rowLine,
                    isBlack ? styles.rowLineBlack : '',
                    isC ? styles.rowLineC : '',
                  ].filter(Boolean).join(' ')}
                  style={{ top: i * NOTE_HEIGHT, height: NOTE_HEIGHT }}
                />
              )
            })}

            {/* Vertical step lines */}
            {Array.from({ length: NUM_STEPS }, (_, i) => (
              <div
                key={i}
                className={[
                  styles.colLine,
                  i % 4 === 0 ? styles.colLineBeat : '',
                  currentStep === i ? styles.colLineCurrent : '',
                ].filter(Boolean).join(' ')}
                style={{ left: i * STEP_WIDTH }}
              />
            ))}

            {/* Notes */}
            {channel.notes.map(note => {
              const top = (MAX_PITCH - note.pitch) * NOTE_HEIGHT
              const left = note.startStep * STEP_WIDTH
              const width = note.length * STEP_WIDTH
              return (
                <div
                  key={note.id}
                  className={styles.note}
                  style={{
                    top,
                    left,
                    width: width - 2,
                    height: NOTE_HEIGHT - 2,
                    background: channel.color,
                    boxShadow: `0 0 8px ${channel.color}60`,
                  }}
                  onMouseDown={e => handleNoteMouseDown(e, note, 'move')}
                >
                  <span className={styles.noteLabel}>{pitchName(note.pitch)}</span>
                  <div
                    className={styles.noteResizeHandle}
                    onMouseDown={e => { e.stopPropagation(); handleNoteMouseDown(e, note, 'resize') }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
