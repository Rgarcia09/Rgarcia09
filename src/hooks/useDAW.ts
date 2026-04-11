import { useCallback, useEffect, useRef, useState } from 'react'
import type { Channel, InstrumentType, Note, Step } from '../types/daw'
import { DRUM_INSTRUMENTS } from '../types/daw'
import { audioEngine } from '../audio/AudioEngine'

const NUM_STEPS = 16
const LOOKAHEAD = 0.12 // seconds to schedule ahead
const SCHEDULE_INTERVAL = 30 // ms

const CHANNEL_DEFAULTS: { name: string; instrument: InstrumentType; color: string }[] = [
  { name: 'Kick',       instrument: 'kick',         color: '#e05c5c' },
  { name: 'Snare',      instrument: 'snare',        color: '#e08c3c' },
  { name: 'Hi-Hat',     instrument: 'hihat_closed', color: '#d4c44a' },
  { name: 'Open HH',    instrument: 'hihat_open',   color: '#5cb85c' },
  { name: 'Clap',       instrument: 'clap',         color: '#5b9bd4' },
  { name: 'Bass',       instrument: 'bass',         color: '#8a5cd4' },
  { name: 'Lead',       instrument: 'lead',         color: '#d45ba3' },
  { name: 'Pad',        instrument: 'pad',          color: '#4abfbf' },
]

function makeSteps(n = NUM_STEPS): Step[] {
  return Array.from({ length: n }, () => ({ active: false, velocity: 100 }))
}

function makeChannel(id: string, def: typeof CHANNEL_DEFAULTS[0]): Channel {
  return {
    id,
    name: def.name,
    instrument: def.instrument,
    steps: makeSteps(),
    notes: [],
    volume: 0.8,
    pan: 0,
    muted: false,
    solo: false,
    color: def.color,
  }
}

const initialChannels: Channel[] = CHANNEL_DEFAULTS.map((d, i) => makeChannel(String(i + 1), d))

// Seed some default drum pattern
const seed = (channels: Channel[]) => {
  const ch = channels.map(c => ({ ...c, steps: c.steps.map(s => ({ ...s })) }))
  // Kick on 1, 5, 9, 13
  ;[0, 4, 8, 12].forEach(i => { ch[0].steps[i].active = true })
  // Snare on 5, 13
  ;[4, 12].forEach(i => { ch[1].steps[i].active = true })
  // Hi-hat every 2 steps
  ;[0, 2, 4, 6, 8, 10, 12, 14].forEach(i => { ch[2].steps[i].active = true })
  // Clap on 5, 13
  ;[4, 12].forEach(i => { ch[4].steps[i].active = true })
  // Bass notes
  const bassNotes: Note[] = [
    { id: 'b1', pitch: 36, startStep: 0, length: 2, velocity: 100 },
    { id: 'b2', pitch: 36, startStep: 4, length: 2, velocity: 90 },
    { id: 'b3', pitch: 38, startStep: 8, length: 2, velocity: 100 },
    { id: 'b4', pitch: 36, startStep: 12, length: 2, velocity: 95 },
  ]
  ch[5].notes = bassNotes
  // Lead notes
  const leadNotes: Note[] = [
    { id: 'l1', pitch: 60, startStep: 0, length: 1, velocity: 90 },
    { id: 'l2', pitch: 62, startStep: 2, length: 1, velocity: 85 },
    { id: 'l3', pitch: 64, startStep: 4, length: 2, velocity: 90 },
    { id: 'l4', pitch: 62, startStep: 8, length: 1, velocity: 85 },
    { id: 'l5', pitch: 60, startStep: 10, length: 1, velocity: 90 },
    { id: 'l6', pitch: 67, startStep: 12, length: 3, velocity: 95 },
  ]
  ch[6].notes = leadNotes
  return ch
}

export function useDAW() {
  const [channels, setChannels] = useState<Channel[]>(() => seed(initialChannels))
  const [bpm, setBpmState] = useState(128)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)
  const [masterVolume, setMasterVolumeState] = useState(0.85)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>('6')

  const bpmRef = useRef(bpm)
  const channelsRef = useRef(channels)
  const isPlayingRef = useRef(false)
  const currentStepRef = useRef(0)
  const nextStepTimeRef = useRef(0)
  const schedulerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const stepTimestamps = useRef<number[]>(Array(NUM_STEPS).fill(0))

  useEffect(() => { bpmRef.current = bpm }, [bpm])
  useEffect(() => { channelsRef.current = channels }, [channels])

  // Init audio engine once
  useEffect(() => {
    audioEngine.initialize()
    channelsRef.current.forEach(ch => {
      audioEngine.setupChannel(ch.id, ch.volume, ch.pan)
    })
  }, [])

  const _scheduleStep = useCallback((stepIndex: number, time: number) => {
    const chs = channelsRef.current
    const hasSolo = chs.some(c => c.solo)
    const spStep = (60 / bpmRef.current) / 4 // 16th note

    chs.forEach(ch => {
      if (ch.muted) return
      if (hasSolo && !ch.solo) return

      if (DRUM_INSTRUMENTS.includes(ch.instrument)) {
        const step = ch.steps[stepIndex]
        if (step.active) {
          audioEngine.triggerDrum(ch.id, ch.instrument, step.velocity, time)
        }
      } else {
        ch.notes.forEach(note => {
          if (note.startStep === stepIndex) {
            const dur = note.length * spStep
            audioEngine.triggerNote(ch.id, ch.instrument, note.pitch, note.velocity, dur, time)
          }
        })
      }
    })

    stepTimestamps.current[stepIndex] = time
  }, [])

  const _scheduler = useCallback(() => {
    if (!isPlayingRef.current) return
    const spStep = (60 / bpmRef.current) / 4
    while (audioEngine.currentTime + LOOKAHEAD > nextStepTimeRef.current) {
      _scheduleStep(currentStepRef.current, nextStepTimeRef.current)
      nextStepTimeRef.current += spStep
      currentStepRef.current = (currentStepRef.current + 1) % NUM_STEPS
    }
    schedulerRef.current = setTimeout(_scheduler, SCHEDULE_INTERVAL)
  }, [_scheduleStep])

  const _animLoop = useCallback(() => {
    if (!isPlayingRef.current) return
    const now = audioEngine.currentTime
    const spStep = (60 / bpmRef.current) / 4
    // Find which step we're currently playing visually
    let activeStep = -1
    for (let i = 0; i < NUM_STEPS; i++) {
      const t = stepTimestamps.current[i]
      if (t <= now && now < t + spStep) {
        activeStep = i
        break
      }
    }
    setCurrentStep(activeStep)
    animFrameRef.current = requestAnimationFrame(_animLoop)
  }, [])

  const play = useCallback(async () => {
    await audioEngine.resume()
    isPlayingRef.current = true
    currentStepRef.current = 0
    nextStepTimeRef.current = audioEngine.currentTime + 0.05
    stepTimestamps.current.fill(0)
    setIsPlaying(true)
    _scheduler()
    _animLoop()
  }, [_scheduler, _animLoop])

  const stop = useCallback(() => {
    isPlayingRef.current = false
    setIsPlaying(false)
    setCurrentStep(-1)
    if (schedulerRef.current) clearTimeout(schedulerRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
  }, [])

  const setBpm = useCallback((v: number) => {
    setBpmState(Math.max(60, Math.min(200, v)))
  }, [])

  const setMasterVolume = useCallback((v: number) => {
    setMasterVolumeState(v)
    audioEngine.setMasterVolume(v)
  }, [])

  const toggleStep = useCallback((channelId: string, stepIndex: number) => {
    setChannels(prev => prev.map(ch =>
      ch.id === channelId
        ? { ...ch, steps: ch.steps.map((s, i) => i === stepIndex ? { ...s, active: !s.active } : s) }
        : ch
    ))
  }, [])

  const setStepVelocity = useCallback((channelId: string, stepIndex: number, velocity: number) => {
    setChannels(prev => prev.map(ch =>
      ch.id === channelId
        ? { ...ch, steps: ch.steps.map((s, i) => i === stepIndex ? { ...s, velocity } : s) }
        : ch
    ))
  }, [])

  const setChannelVolume = useCallback((channelId: string, volume: number) => {
    audioEngine.updateVolume(channelId, volume)
    setChannels(prev => prev.map(ch => ch.id === channelId ? { ...ch, volume } : ch))
  }, [])

  const setChannelPan = useCallback((channelId: string, pan: number) => {
    audioEngine.updatePan(channelId, pan)
    setChannels(prev => prev.map(ch => ch.id === channelId ? { ...ch, pan } : ch))
  }, [])

  const toggleMute = useCallback((channelId: string) => {
    setChannels(prev => prev.map(ch => ch.id === channelId ? { ...ch, muted: !ch.muted } : ch))
  }, [])

  const toggleSolo = useCallback((channelId: string) => {
    setChannels(prev => prev.map(ch => ch.id === channelId ? { ...ch, solo: !ch.solo } : ch))
  }, [])

  const addNote = useCallback((channelId: string, note: Omit<Note, 'id'>) => {
    setChannels(prev => prev.map(ch =>
      ch.id === channelId
        ? { ...ch, notes: [...ch.notes, { ...note, id: `${Date.now()}-${Math.random()}` }] }
        : ch
    ))
  }, [])

  const removeNote = useCallback((channelId: string, noteId: string) => {
    setChannels(prev => prev.map(ch =>
      ch.id === channelId ? { ...ch, notes: ch.notes.filter(n => n.id !== noteId) } : ch
    ))
  }, [])

  const updateNote = useCallback((channelId: string, noteId: string, update: Partial<Note>) => {
    setChannels(prev => prev.map(ch =>
      ch.id === channelId
        ? { ...ch, notes: ch.notes.map(n => n.id === noteId ? { ...n, ...update } : n) }
        : ch
    ))
  }, [])

  const previewNote = useCallback((channelId: string, instrument: InstrumentType, pitch: number) => {
    audioEngine.resume()
    const ch = channelsRef.current.find(c => c.id === channelId)
    if (!ch) return
    audioEngine.triggerNote(channelId, instrument, pitch, 100, 0.5, audioEngine.currentTime)
  }, [])

  return {
    channels,
    bpm,
    isPlaying,
    currentStep,
    masterVolume,
    selectedChannelId,
    setSelectedChannelId,
    play,
    stop,
    setBpm,
    setMasterVolume,
    toggleStep,
    setStepVelocity,
    setChannelVolume,
    setChannelPan,
    toggleMute,
    toggleSolo,
    addNote,
    removeNote,
    updateNote,
    previewNote,
  }
}
