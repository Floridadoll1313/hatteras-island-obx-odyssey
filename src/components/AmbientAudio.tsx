import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, Waves, Wind, Bird, Settings, X, Music } from 'lucide-react';

interface AudioNodes {
  hum: { osc: OscillatorNode; gain: GainNode } | null;
  waves: { noise: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode } | null;
  seagulls: { gain: GainNode } | null;
  music: { gain: GainNode; oscillators: OscillatorNode[] } | null;
}

const AmbientAudio = ({ isMemorialOpen = false }: { isMemorialOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [volumes, setVolumes] = useState({
    hum: 0.05,
    waves: 0.1,
    seagulls: 0.05,
    music: 0.08,
  });

  const audioCtx = useRef<AudioContext | null>(null);
  const nodes = useRef<AudioNodes>({ hum: null, waves: null, seagulls: null, music: null });
  const seagullInterval = useRef<NodeJS.Timeout | null>(null);
  const musicInterval = useRef<NodeJS.Timeout | null>(null);

  // Automatically adjust music volume when memorial is open
  useEffect(() => {
    if (isActive && audioCtx.current) {
      const targetVolume = isMemorialOpen ? 0.15 : 0.05;
      updateVolume('music', targetVolume);
    }
  }, [isMemorialOpen, isActive]);

  const createWhiteNoise = (ctx: AudioContext) => {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  };

  const startAudio = () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (audioCtx.current.state === 'suspended') {
      audioCtx.current.resume();
    }

    const ctx = audioCtx.current;

    // 1. Ocean Hum (Low frequency sine)
    const humOsc = ctx.createOscillator();
    const humGain = ctx.createGain();
    humOsc.type = 'sine';
    humOsc.frequency.setValueAtTime(40, ctx.currentTime);
    humGain.gain.setValueAtTime(volumes.hum, ctx.currentTime);
    humOsc.connect(humGain);
    humGain.connect(ctx.destination);
    humOsc.start();
    nodes.current.hum = { osc: humOsc, gain: humGain };

    // 2. Waves (White Noise + Lowpass Filter + Gain Modulation)
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = createWhiteNoise(ctx);
    noiseSource.loop = true;

    const waveFilter = ctx.createBiquadFilter();
    waveFilter.type = 'lowpass';
    waveFilter.frequency.setValueAtTime(1000, ctx.currentTime);

    const waveGain = ctx.createGain();
    waveGain.gain.setValueAtTime(0, ctx.currentTime);

    noiseSource.connect(waveFilter);
    waveFilter.connect(waveGain);
    waveGain.connect(ctx.destination);
    noiseSource.start();

    // Wave modulation (gain and filter frequency)
    const modulateWaves = () => {
      if (!isActive && !audioCtx.current) return;
      const now = ctx.currentTime;
      const period = 8 + Math.random() * 4; // 8-12 seconds per wave
      
      // Gain envelope
      waveGain.gain.cancelScheduledValues(now);
      waveGain.gain.linearRampToValueAtTime(volumes.waves, now + period * 0.4);
      waveGain.gain.linearRampToValueAtTime(0.02, now + period);

      // Filter envelope
      waveFilter.frequency.cancelScheduledValues(now);
      waveFilter.frequency.exponentialRampToValueAtTime(1500, now + period * 0.4);
      waveFilter.frequency.exponentialRampToValueAtTime(400, now + period);

      setTimeout(modulateWaves, period * 1000);
    };
    modulateWaves();
    nodes.current.waves = { noise: noiseSource, gain: waveGain, filter: waveFilter };

    // 3. Seagulls (Random chirps)
    const seagullGain = ctx.createGain();
    seagullGain.gain.setValueAtTime(volumes.seagulls, ctx.currentTime);
    seagullGain.connect(ctx.destination);
    nodes.current.seagulls = { gain: seagullGain };

    const playChirp = () => {
      if (!isActive && !audioCtx.current) return;
      const chirpOsc = ctx.createOscillator();
      const chirpEnv = ctx.createGain();
      
      chirpOsc.type = 'sine';
      const startFreq = 800 + Math.random() * 400;
      chirpOsc.frequency.setValueAtTime(startFreq, ctx.currentTime);
      chirpOsc.frequency.exponentialRampToValueAtTime(startFreq + 200, ctx.currentTime + 0.1);
      chirpOsc.frequency.exponentialRampToValueAtTime(startFreq - 100, ctx.currentTime + 0.3);

      chirpEnv.gain.setValueAtTime(0, ctx.currentTime);
      chirpEnv.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
      chirpEnv.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      chirpOsc.connect(chirpEnv);
      chirpEnv.connect(seagullGain);
      chirpOsc.start();
      chirpOsc.stop(ctx.currentTime + 0.3);

      // Schedule next chirp
      const delay = 5000 + Math.random() * 15000;
      seagullInterval.current = setTimeout(playChirp, delay);
    };
    playChirp();

    // 4. Thematic Music (Soft ambient pad)
    const musicGain = ctx.createGain();
    musicGain.gain.setValueAtTime(volumes.music, ctx.currentTime);
    musicGain.connect(ctx.destination);
    nodes.current.music = { gain: musicGain, oscillators: [] };

    const playNote = () => {
      if (!isActive && !audioCtx.current) return;
      const frequencies = [196.00, 220.00, 261.63, 293.66, 329.63, 392.00]; // G3, A3, C4, D4, E4, G4 (Pentatonic)
      const freq = frequencies[Math.floor(Math.random() * frequencies.length)];
      
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      env.gain.setValueAtTime(0, ctx.currentTime);
      env.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 2);
      env.gain.linearRampToValueAtTime(0, ctx.currentTime + 6);
      
      osc.connect(env);
      env.connect(musicGain);
      
      osc.start();
      osc.stop(ctx.currentTime + 6);
      
      const delay = 3000 + Math.random() * 4000;
      musicInterval.current = setTimeout(playNote, delay);
    };
    playNote();

    setIsActive(true);
  };

  const stopAudio = () => {
    if (nodes.current.hum) {
      nodes.current.hum.osc.stop();
      nodes.current.hum.osc.disconnect();
    }
    if (nodes.current.waves) {
      nodes.current.waves.noise.stop();
      nodes.current.waves.noise.disconnect();
    }
    if (seagullInterval.current) {
      clearTimeout(seagullInterval.current);
    }
    if (musicInterval.current) {
      clearTimeout(musicInterval.current);
    }
    setIsActive(false);
  };

  const updateVolume = (type: keyof typeof volumes, value: number) => {
    setVolumes(prev => ({ ...prev, [type]: value }));
    const ctx = audioCtx.current;
    if (!ctx) return;

    if (type === 'hum' && nodes.current.hum) {
      nodes.current.hum.gain.gain.setTargetAtTime(value, ctx.currentTime, 0.1);
    } else if (type === 'waves' && nodes.current.waves) {
      // Wave gain is modulated, so we just set the target for the modulation base
      // But for simplicity, we'll just let the next modulation cycle pick it up
    } else if (type === 'seagulls' && nodes.current.seagulls) {
      nodes.current.seagulls.gain.gain.setTargetAtTime(value, ctx.currentTime, 0.1);
    } else if (type === 'music' && nodes.current.music) {
      nodes.current.music.gain.gain.setTargetAtTime(value, ctx.currentTime, 0.1);
    }
  };

  return (
    <div className="fixed bottom-24 right-8 z-50 flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-black/80 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl w-64 space-y-6"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-mono uppercase tracking-widest text-white/60">Ambient Audio</h3>
              <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Ocean Hum */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-tighter">
                  <div className="flex items-center gap-2 text-white/60">
                    <Wind size={12} />
                    <span>Ocean Hum</span>
                  </div>
                  <span className="text-[#00E0FF]">{Math.round(volumes.hum * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.2"
                  step="0.01"
                  value={volumes.hum}
                  onChange={(e) => updateVolume('hum', parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#00E0FF]"
                />
              </div>

              {/* Waves */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-tighter">
                  <div className="flex items-center gap-2 text-white/60">
                    <Waves size={12} />
                    <span>Atlantic Waves</span>
                  </div>
                  <span className="text-[#00E0FF]">{Math.round(volumes.waves * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.3"
                  step="0.01"
                  value={volumes.waves}
                  onChange={(e) => updateVolume('waves', parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#00E0FF]"
                />
              </div>

              {/* Seagulls */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-tighter">
                  <div className="flex items-center gap-2 text-white/60">
                    <Bird size={12} />
                    <span>Seagulls</span>
                  </div>
                  <span className="text-[#00E0FF]">{Math.round(volumes.seagulls * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.2"
                  step="0.01"
                  value={volumes.seagulls}
                  onChange={(e) => updateVolume('seagulls', parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#00E0FF]"
                />
              </div>

              {/* Thematic Music */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-tighter">
                  <div className="flex items-center gap-2 text-white/60">
                    <Music size={12} />
                    <span>Thematic Music</span>
                  </div>
                  <span className="text-[#00E0FF]">{Math.round(volumes.music * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.3"
                  step="0.01"
                  value={volumes.music}
                  onChange={(e) => updateVolume('music', parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#00E0FF]"
                />
              </div>
            </div>

            <button
              onClick={isActive ? stopAudio : startAudio}
              className={`w-full py-3 rounded-xl border font-mono text-[10px] uppercase tracking-widest transition-all ${
                isActive 
                  ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20' 
                  : 'bg-[#00E0FF]/10 border-[#00E0FF]/30 text-[#00E0FF] hover:bg-[#00E0FF]/20'
              }`}
            >
              {isActive ? 'Deactivate Audio' : 'Initialize Audio'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-full border shadow-lg transition-all ${
          isActive 
            ? 'bg-[#00E0FF]/10 border-[#00E0FF]/30 text-[#00E0FF]' 
            : 'bg-black/40 border-white/10 text-white/40'
        }`}
      >
        {isActive ? <Volume2 size={24} /> : <VolumeX size={24} />}
      </motion.button>
    </div>
  );
};

export default AmbientAudio;
