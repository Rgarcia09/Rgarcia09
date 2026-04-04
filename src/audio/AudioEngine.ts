import type { InstrumentType } from '../types/daw'

export class AudioEngine {
  private context: AudioContext | null = null
  private masterGain: GainNode | null = null
  private channelGains = new Map<string, GainNode>()
  private channelPanners = new Map<string, StereoPannerNode>()
  private reverbNode: ConvolverNode | null = null

  initialize() {
    if (this.context) return
    this.context = new AudioContext()
    this.masterGain = this.context.createGain()
    this.masterGain.gain.value = 0.85
    this.masterGain.connect(this.context.destination)
    this._buildReverb()
  }

  resume() {
    return this.context?.resume()
  }

  get currentTime() {
    return this.context?.currentTime ?? 0
  }

  get sampleRate() {
    return this.context?.sampleRate ?? 44100
  }

  private _buildReverb() {
    if (!this.context) return
    const sr = this.context.sampleRate
    const len = sr * 1.5
    const buf = this.context.createBuffer(2, len, sr)
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c)
      for (let i = 0; i < len; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5)
    }
    this.reverbNode = this.context.createConvolver()
    this.reverbNode.buffer = buf
  }

  setupChannel(id: string, volume: number, pan: number) {
    if (!this.context || !this.masterGain) return
    if (this.channelGains.has(id)) return
    const gain = this.context.createGain()
    const panner = this.context.createStereoPanner()
    gain.gain.value = volume
    panner.pan.value = pan
    gain.connect(panner)
    panner.connect(this.masterGain)
    this.channelGains.set(id, gain)
    this.channelPanners.set(id, panner)
  }

  updateVolume(id: string, volume: number) {
    const g = this.channelGains.get(id)
    if (g) g.gain.value = volume
  }

  updatePan(id: string, pan: number) {
    const p = this.channelPanners.get(id)
    if (p) p.pan.value = pan
  }

  setMasterVolume(v: number) {
    if (this.masterGain) this.masterGain.gain.value = v
  }

  triggerDrum(channelId: string, instrument: InstrumentType, velocity: number, time: number) {
    const output = this.channelGains.get(channelId)
    if (!output || !this.context) return
    const v = velocity / 127
    switch (instrument) {
      case 'kick': this._kick(output, time, v); break
      case 'snare': this._snare(output, time, v); break
      case 'hihat_closed': this._hihat(output, time, v, false); break
      case 'hihat_open': this._hihat(output, time, v, true); break
      case 'clap': this._clap(output, time, v); break
    }
  }

  triggerNote(channelId: string, instrument: InstrumentType, pitch: number, velocity: number, duration: number, time: number) {
    const output = this.channelGains.get(channelId)
    if (!output || !this.context) return
    const v = velocity / 127
    switch (instrument) {
      case 'bass': this._bass(output, time, pitch, v, duration); break
      case 'lead': this._lead(output, time, pitch, v, duration); break
      case 'pad': this._pad(output, time, pitch, v, duration); break
    }
  }

  private _midi2freq(midi: number) {
    return 440 * Math.pow(2, (midi - 69) / 12)
  }

  private _kick(out: AudioNode, t: number, v: number) {
    const ctx = this.context!
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(160, t)
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.35)
    g.gain.setValueAtTime(v * 1.2, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
    osc.connect(g); g.connect(out)
    osc.start(t); osc.stop(t + 0.4)

    // click transient
    const click = ctx.createOscillator()
    const cg = ctx.createGain()
    click.type = 'square'
    click.frequency.value = 1000
    cg.gain.setValueAtTime(v * 0.4, t)
    cg.gain.exponentialRampToValueAtTime(0.001, t + 0.02)
    click.connect(cg); cg.connect(out)
    click.start(t); click.stop(t + 0.02)
  }

  private _snare(out: AudioNode, t: number, v: number) {
    const ctx = this.context!
    // noise body
    const bufSize = Math.floor(ctx.sampleRate * 0.25)
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = buf
    const filt = ctx.createBiquadFilter()
    filt.type = 'bandpass'
    filt.frequency.value = 2500
    filt.Q.value = 0.8
    const ng = ctx.createGain()
    ng.gain.setValueAtTime(v * 0.9, t)
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
    noise.connect(filt); filt.connect(ng); ng.connect(out)
    noise.start(t); noise.stop(t + 0.22)
    // tone
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = 185
    const og = ctx.createGain()
    og.gain.setValueAtTime(v * 0.35, t)
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
    osc.connect(og); og.connect(out)
    osc.start(t); osc.stop(t + 0.12)
  }

  private _hihat(out: AudioNode, t: number, v: number, open: boolean) {
    const ctx = this.context!
    const decay = open ? 0.38 : 0.055
    const bufSize = Math.floor(ctx.sampleRate * decay)
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = buf
    const filt = ctx.createBiquadFilter()
    filt.type = 'highpass'
    filt.frequency.value = 7000
    const g = ctx.createGain()
    g.gain.setValueAtTime(v * 0.55, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + decay)
    noise.connect(filt); filt.connect(g); g.connect(out)
    noise.start(t); noise.stop(t + decay)
  }

  private _clap(out: AudioNode, t: number, v: number) {
    const ctx = this.context!
    for (let i = 0; i < 3; i++) {
      const offset = i * 0.013
      const bufSize = Math.floor(ctx.sampleRate * 0.06)
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
      const d = buf.getChannelData(0)
      for (let j = 0; j < bufSize; j++) d[j] = Math.random() * 2 - 1
      const noise = ctx.createBufferSource()
      noise.buffer = buf
      const filt = ctx.createBiquadFilter()
      filt.type = 'bandpass'
      filt.frequency.value = 1200
      const g = ctx.createGain()
      g.gain.setValueAtTime(v * 0.65, t + offset)
      g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.06)
      noise.connect(filt); filt.connect(g); g.connect(out)
      noise.start(t + offset); noise.stop(t + offset + 0.06)
    }
  }

  private _bass(out: AudioNode, t: number, pitch: number, v: number, dur: number) {
    const ctx = this.context!
    const freq = this._midi2freq(pitch)
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = freq
    const filt = ctx.createBiquadFilter()
    filt.type = 'lowpass'
    filt.frequency.setValueAtTime(2400, t)
    filt.frequency.exponentialRampToValueAtTime(350, t + dur * 0.4)
    filt.Q.value = 3
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(v * 0.85, t + 0.015)
    g.gain.setValueAtTime(v * 0.85, t + dur - 0.06)
    g.gain.linearRampToValueAtTime(0, t + dur)
    osc.connect(filt); filt.connect(g); g.connect(out)
    osc.start(t); osc.stop(t + dur)
  }

  private _lead(out: AudioNode, t: number, pitch: number, v: number, dur: number) {
    const ctx = this.context!
    const freq = this._midi2freq(pitch)
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.value = freq * (i === 0 ? 1 : 1.006)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(v * 0.28, t + 0.02)
      g.gain.setValueAtTime(v * 0.28, t + dur - 0.04)
      g.gain.linearRampToValueAtTime(0, t + dur)
      osc.connect(g); g.connect(out)
      osc.start(t); osc.stop(t + dur)
    }
  }

  private _pad(out: AudioNode, t: number, pitch: number, v: number, dur: number) {
    const ctx = this.context!
    const freq = this._midi2freq(pitch)
    const harmonics = [1, 2, 3, 4]
    for (const h of harmonics) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq * h
      const hv = (v / h) * 0.28
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(hv, t + 0.35)
      g.gain.setValueAtTime(hv, Math.max(t + 0.35, t + dur - 0.35))
      g.gain.linearRampToValueAtTime(0, t + dur + 0.3)
      osc.connect(g); g.connect(out)
      osc.start(t); osc.stop(t + dur + 0.35)
    }
  }
}

export const audioEngine = new AudioEngine()
