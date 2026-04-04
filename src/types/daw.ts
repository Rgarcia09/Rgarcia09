export type InstrumentType =
  | 'kick'
  | 'snare'
  | 'hihat_closed'
  | 'hihat_open'
  | 'clap'
  | 'bass'
  | 'lead'
  | 'pad'

export const DRUM_INSTRUMENTS: InstrumentType[] = ['kick', 'snare', 'hihat_closed', 'hihat_open', 'clap']
export const SYNTH_INSTRUMENTS: InstrumentType[] = ['bass', 'lead', 'pad']

export interface Step {
  active: boolean
  velocity: number // 0-127
}

export interface Note {
  id: string
  pitch: number // MIDI note number (0-127)
  startStep: number // step index
  length: number // in steps
  velocity: number // 0-127
}

export interface Channel {
  id: string
  name: string
  instrument: InstrumentType
  steps: Step[]
  notes: Note[]
  volume: number // 0-1
  pan: number // -1 to 1
  muted: boolean
  solo: boolean
  color: string
}

export type ActiveView = 'channel-rack' | 'piano-roll' | 'mixer'
