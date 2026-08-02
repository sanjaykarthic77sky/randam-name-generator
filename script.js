/* ==========================================================================
   CINEMATIC RANDOM NAME PICKER - SCRIPT.JS
   Standalone pure JavaScript implementation with Web Audio API, Canvas FX,
   and 6-second suspense draw state machine.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ------------------------------------------------------------------------
     1. DEFAULT 70 CANDIDATE NAMES
     ------------------------------------------------------------------------ */
  const DEFAULT_NAMES = [
    "Alex Johnson", "Sarah Williams", "Michael Chen", "Emily Davis", "David Rodriguez",
    "Jessica Taylor", "James Wilson", "Amanda Martinez", "Robert Anderson", "Elizabeth Thomas",
    "William Jackson", "Ashley White", "Joseph Harris", "Megan Martin", "Charles Thompson",
    "Olivia Garcia", "Daniel Martinez", "Sophia Robinson", "Matthew Clark", "Isabella Rodriguez",
    "Anthony Lewis", "Ava Lee", "Mark Walker", "Mia Hall", "Donald Allen",
    "Abigail Young", "Steven Hernandez", "Emily King", "Paul Wright", "Charlotte Lopez",
    "Andrew Hill", "Harper Scott", "Joshua Green", "Evelyn Adams", "Kenneth Baker",
    "Ella Gonzalez", "Kevin Nelson", "Elizabeth Carter", "Brian Mitchell", "Camila Perez",
    "George Roberts", "Victoria Turner", "Timothy Phillips", "Penelope Torres", "Ronald Campbell",
    "Riley Parker", "Edward Parker", "Layla Evans", "Jason Edwards", "Zoey Collins",
    "Jeffrey Stewart", "Nora Sanchez", "Ryan Morris", "Lily Rogers", "Jacob Reed",
    "Eleanor Cook", "Gary Cook", "Hannah Morgan", "Nicholas Bell", "Lillian Murphy",
    "Eric Bailey", "Addison Rivera", "Stephen Cooper", "Grace Richardson", "Larry Cox",
    "Natalie Howard", "Justin Ward", "Zoe Torres", "Scott Peterson", "Stella Gray"
  ];

  /* ------------------------------------------------------------------------
     2. APPLICATION STATE & LOCALSTORAGE PERSISTENCE
     ------------------------------------------------------------------------ */
  const STORAGE_KEY_ALL = 'CINEMATIC_NAME_PICKER_ALL_NAMES';
  const STORAGE_KEY_REMAINING = 'CINEMATIC_NAME_PICKER_REMAINING';
  const STORAGE_KEY_WINNERS = 'CINEMATIC_NAME_PICKER_WINNERS';

  let allCandidateNames = loadStoredNames();
  let availableNames = loadStoredRemaining(allCandidateNames);
  let selectedWinners = loadStoredWinners();
  let isDrawing = false;
  let isMuted = false;

  function loadStoredNames() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ALL);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Could not read from localStorage:', e);
    }
    return [...DEFAULT_NAMES];
  }

  function loadStoredRemaining(defaultAll) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_REMAINING);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [...defaultAll];
  }

  function loadStoredWinners() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_WINNERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  }

  function saveStateToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_ALL, JSON.stringify(allCandidateNames));
      localStorage.setItem(STORAGE_KEY_REMAINING, JSON.stringify(availableNames));
      localStorage.setItem(STORAGE_KEY_WINNERS, JSON.stringify(selectedWinners));
    } catch (e) {
      console.warn('Could not write to localStorage:', e);
    }
  }

  /* ------------------------------------------------------------------------
     3. DOM ELEMENT REFERENCES
     ------------------------------------------------------------------------ */
  const bgCanvas = document.getElementById('bg-canvas');
  const fxCanvas = document.getElementById('fx-canvas');
  
  const nameStageBox = document.getElementById('name-stage-box');
  const nameText = document.getElementById('name-text');
  const winnerCongratsLabel = document.getElementById('winner-congrats-label');
  const winnerSubtitle = document.getElementById('winner-subtitle');
  const statusText = document.getElementById('status-text');
  const countdownOverlay = document.getElementById('countdown-overlay');
  const countdownText = document.getElementById('countdown-text');
  const shockwaveRing = document.getElementById('shockwave-ring');
  
  const stageCard = document.getElementById('stage-card');
  const stageStatusLabel = document.getElementById('stage-status-label');
  const spotlightOverlay = document.getElementById('spotlight-overlay');
  const goldenFlash = document.getElementById('golden-flash');
  
  const startBtn = document.getElementById('start-btn');
  const resetBtn = document.getElementById('reset-btn');
  const muteBtn = document.getElementById('mute-btn');
  const muteIcon = document.getElementById('mute-icon');
  const manageNamesBtn = document.getElementById('manage-names-btn');
  
  const statTotal = document.getElementById('stat-total');
  const statSelected = document.getElementById('stat-selected');
  const statRemaining = document.getElementById('stat-remaining');
  
  const winnersList = document.getElementById('winners-list');
  
  const completionModal = document.getElementById('completion-modal');
  const modalResetBtn = document.getElementById('modal-reset-btn');

  // Manage Names Modal Elements
  const namesModal = document.getElementById('names-modal');
  const closeNamesModalBtn = document.getElementById('close-names-modal-btn');
  const saveNamesModalBtn = document.getElementById('save-names-modal-btn');
  const singleNameInput = document.getElementById('single-name-input');
  const addSingleBtn = document.getElementById('add-single-btn');
  const bulkNamesInput = document.getElementById('bulk-names-input');
  const addBulkBtn = document.getElementById('add-bulk-btn');
  const loadDefaultsBtn = document.getElementById('load-defaults-btn');
  const clearAllNamesBtn = document.getElementById('clear-all-names-btn');
  const namesTagsContainer = document.getElementById('names-tags-container');
  const modalNamesCount = document.getElementById('modal-names-count');

  // Cyber Dancer Mascot Stage Elements
  const danceStageWrapper = document.getElementById('dance-stage-wrapper');
  const cyberDancerAvatar = document.getElementById('cyber-dancer-avatar');
  const dancerStatusText = document.getElementById('dancer-status-text');

  /* ------------------------------------------------------------------------
     4. WEB AUDIO SYNTHESIZER (No External Files Required)
     ------------------------------------------------------------------------ */
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.drumrollNode = null;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playClick() {
      if (isMuted) return;
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.05);
      
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    }

    playSpinTick(speedFactor = 1) {
      if (isMuted) return;
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      const baseFreq = 300 + (Math.random() * 200) + (speedFactor * 100);
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.04);
      
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    }

    playCountdownBeep(number) {
      if (isMuted) return;
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      const pitchMap = { 3: 523.25, 2: 659.25, 1: 783.99 }; // C5, E5, G5
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitchMap[number] || 600, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    }

    startDrumroll() {
      if (isMuted) return;
      this.init();
      this.stopDrumroll();

      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;
      whiteNoise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(300, this.ctx.currentTime);
      filter.Q.setValueAtTime(3, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25, this.ctx.currentTime + 1.5);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start();
      this.drumrollNode = { whiteNoise, gain };
    }

    stopDrumroll() {
      if (this.drumrollNode) {
        try {
          this.drumrollNode.gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
          setTimeout(() => {
            this.drumrollNode?.whiteNoise.stop();
            this.drumrollNode = null;
          }, 100);
        } catch (e) {
          this.drumrollNode = null;
        }
      }
    }

    playVictory() {
      if (isMuted) return;
      this.init();
      this.stopDrumroll();

      const now = this.ctx.currentTime;
      // Triumphant Fanfare Arpeggio: C4, E4, G4, C5
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = idx >= 4 ? 'triangle' : 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.08 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 2.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 2.5);
      });

      // Noise Cymbal Crash
      const bufferSize = this.ctx.sampleRate * 1.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const crash = this.ctx.createBufferSource();
      crash.buffer = buffer;

      const crashFilter = this.ctx.createBiquadFilter();
      crashFilter.type = 'highpass';
      crashFilter.frequency.setValueAtTime(4000, now);

      const crashGain = this.ctx.createGain();
      crashGain.gain.setValueAtTime(0.4, now);
      crashGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      crash.connect(crashFilter);
      crashFilter.connect(crashGain);
      crashGain.connect(this.ctx.destination);

      crash.start(now);
    }
  }

  const sound = new SoundEngine();

  /* ------------------------------------------------------------------------
     5. BACKGROUND CANVAS ENGINE (Particles & Ambient Glow)
     ------------------------------------------------------------------------ */
  class BackgroundCanvas {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.particles = [];
      this.width = 0;
      this.height = 0;
      this.resize();
      this.initParticles();
      window.addEventListener('resize', () => this.resize());
    }

    resize() {
      this.width = this.canvas.width = window.innerWidth;
      this.height = this.canvas.height = window.innerHeight;
    }

    initParticles() {
      this.particles = [];
      const count = Math.floor((this.width * this.height) / 18000);
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          radius: Math.random() * 2 + 0.5,
          color: Math.random() > 0.5 ? '#00f0ff' : '#7b61ff',
          alpha: Math.random() * 0.5 + 0.2,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          pulse: Math.random() * Math.PI
        });
      }
    }

    render() {
      this.ctx.clearRect(0, 0, this.width, this.height);

      this.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.02;

        if (p.x < 0) p.x = this.width;
        if (p.x > this.width) p.x = 0;
        if (p.y < 0) p.y = this.height;
        if (p.y > this.height) p.y = 0;

        const currentAlpha = p.alpha + Math.sin(p.pulse) * 0.15;
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = Math.max(0.1, Math.min(1, currentAlpha));
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = p.color;
        this.ctx.fill();
        this.ctx.restore();
      });

      requestAnimationFrame(() => this.render());
    }
  }

  const bgEngine = new BackgroundCanvas(bgCanvas);
  bgEngine.render();

  /* ------------------------------------------------------------------------
     6. CELEBRATION FX CANVAS ENGINE (Confetti & Fireworks)
     ------------------------------------------------------------------------ */
  class FXCanvas {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.particles = [];
      this.fireworks = [];
      this.width = 0;
      this.height = 0;
      this.active = false;
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }

    resize() {
      this.width = this.canvas.width = window.innerWidth;
      this.height = this.canvas.height = window.innerHeight;
    }

    triggerCelebration(durationMs = 5000) {
      this.active = true;
      this.spawnConfettiBurst();
      this.spawnFireworksSeries();
      
      setTimeout(() => {
        this.active = false;
      }, durationMs);
    }

    spawnConfettiBurst() {
      const colors = ['#ffd700', '#00f0ff', '#7b61ff', '#ff2a8d', '#ffffff', '#00ff88'];
      for (let i = 0; i < 180; i++) {
        this.particles.push({
          x: this.width / 2 + (Math.random() - 0.5) * 200,
          y: this.height / 2 + (Math.random() - 0.5) * 100,
          vx: (Math.random() - 0.5) * 18,
          vy: Math.random() * -16 - 4,
          gravity: 0.25,
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 12,
          size: Math.random() * 10 + 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          shape: Math.random() > 0.4 ? 'rect' : 'circle'
        });
      }
    }

    spawnFireworksSeries() {
      const launch = () => {
        if (!this.active) return;
        const colors = ['#ffd700', '#00f0ff', '#ff2a8d', '#7b61ff'];
        const targetX = Math.random() * (this.width * 0.8) + (this.width * 0.1);
        const targetY = Math.random() * (this.height * 0.4) + (this.height * 0.1);
        const color = colors[Math.floor(Math.random() * colors.length)];

        for (let i = 0; i < 60; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 8 + 2;
          this.fireworks.push({
            x: targetX,
            y: targetY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            gravity: 0.1,
            color: color,
            alpha: 1,
            decay: Math.random() * 0.02 + 0.015,
            radius: Math.random() * 3 + 1
          });
        }
      };

      for (let t = 0; t < 3500; t += 400) {
        setTimeout(launch, t);
      }
    }

    render() {
      this.ctx.clearRect(0, 0, this.width, this.height);

      // Render Confetti
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.rotSpeed;
        p.alpha -= 0.005;

        if (p.alpha <= 0 || p.y > this.height) {
          this.particles.splice(i, 1);
          continue;
        }

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = Math.max(0, p.alpha);

        if (p.shape === 'rect') {
          this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          this.ctx.beginPath();
          this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          this.ctx.fill();
        }
        this.ctx.restore();
      }

      // Render Fireworks
      for (let i = this.fireworks.length - 1; i >= 0; i--) {
        const f = this.fireworks[i];
        f.x += f.vx;
        f.y += f.vy;
        f.vy += f.gravity;
        f.alpha -= f.decay;

        if (f.alpha <= 0) {
          this.fireworks.splice(i, 1);
          continue;
        }

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = f.color;
        this.ctx.globalAlpha = Math.max(0, f.alpha);
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = f.color;
        this.ctx.fill();
        this.ctx.restore();
      }

      requestAnimationFrame(() => this.render());
    }
  }

  const fxEngine = new FXCanvas(fxCanvas);
  fxEngine.render();

  /* ------------------------------------------------------------------------
     7. DRAW STATE MACHINE (6-Second Suspense Sequence)
     ------------------------------------------------------------------------ */
  function updateStats() {
    statTotal.textContent = allCandidateNames.length;
    statSelected.textContent = selectedWinners.length;
    statRemaining.textContent = availableNames.length;
    saveStateToStorage();
  }

  function setStatusMessage(msg) {
    statusText.classList.add('fade-out');
    setTimeout(() => {
      statusText.textContent = msg;
      statusText.classList.remove('fade-out');
    }, 200);
  }

  function addWinnerToHistory(name) {
    // History panel removed — silently track in hidden list for data integrity
    const item = document.createElement('li');
    item.textContent = name;
    winnersList.appendChild(item);
  }

  function renderHistoryFromState() {
    // No visible history panel — no-op
  }

  function startDraw() {
    if (isDrawing) return;

    if (availableNames.length === 0) {
      showCompletionModal();
      return;
    }

    isDrawing = true;
    sound.playClick();
    startBtn.disabled = true;
    resetBtn.disabled = true;

    // Reset visual states & Trigger Mascot Dance!
    nameText.className = 'name-text spinning';
    winnerCongratsLabel.classList.remove('visible');
    winnerSubtitle.classList.remove('visible');
    stageCard.classList.add('drawing-active');
    stageCard.classList.remove('winner-active');
    stageStatusLabel.textContent = 'DRAW IN PROGRESS';

    if (cyberDancerAvatar && danceStageWrapper) {
      cyberDancerAvatar.className = 'cyber-dancer-avatar dancing';
      danceStageWrapper.className = 'dance-stage-wrapper dance-stage-full active-dance';
      if (dancerStatusText) dancerStatusText.textContent = 'GROOVING TO THE DRAW! 🕺🔥';
    }

    setStatusMessage('Searching...');

    // Speed curve setup: ~6.0 seconds total
    let delay = 30; // initial super fast
    let elapsed = 0;
    const totalSpinTime = 4200; // 4.2 seconds of spinning

    const spin = () => {
      if (!isDrawing) return;

      const randomIndex = Math.floor(Math.random() * availableNames.length);
      nameText.textContent = availableNames[randomIndex];

      sound.playSpinTick(delay / 300);

      if (Math.random() > 0.6) {
        nameText.classList.add('spin-blur');
      } else {
        nameText.classList.remove('spin-blur');
      }

      if (Math.random() > 0.7) {
        nameText.classList.add(Math.random() > 0.5 ? 'spin-zoom-in' : 'spin-zoom-out');
      } else {
        nameText.classList.remove('spin-zoom-in', 'spin-zoom-out');
      }

      elapsed += delay;

      if (elapsed > 800 && elapsed <= 1600) setStatusMessage('Mixing Names...');
      else if (elapsed > 1600 && elapsed <= 2400) setStatusMessage('Generating Random Pick...');
      else if (elapsed > 2400 && elapsed <= 3300) setStatusMessage('Almost There...');
      else if (elapsed > 3300) setStatusMessage('Final Decision...');

      if (elapsed < 2000) {
        delay += 5;
      } else if (elapsed < 3200) {
        delay += 20;
      } else {
        delay += 50;
      }

      if (elapsed < totalSpinTime) {
        setTimeout(spin, delay);
      } else {
        triggerCountdown();
      }
    };

    spin();
  }

  function triggerCountdown() {
    nameText.classList.remove('spin-blur', 'spin-zoom-in', 'spin-zoom-out');
    sound.startDrumroll();

    const runCount = (num, nextCallback) => {
      // Clear and force browser reflow so the CSS animation fully restarts each number
      countdownText.textContent = '';
      countdownText.className = '';
      void countdownText.offsetWidth; // ← critical: forces repaint so animation resets
      countdownText.textContent = num;
      countdownText.className = 'pop';
      sound.playCountdownBeep(num);

      if (num === 1) {
        stageCard.classList.add('shake-heavy');
      }

      setTimeout(() => {
        countdownText.className = '';
        if (nextCallback) nextCallback();
      }, 950); // 950ms > 800ms animation duration — gives full play time
    };

    runCount(3, () => {
      runCount(2, () => {
        runCount(1, () => {
          stageCard.classList.remove('shake-heavy');
          triggerFreezeAndReveal();
        });
      });
    });
  }

  function triggerFreezeAndReveal() {
    spotlightOverlay.classList.add('active');
    setStatusMessage('FINAL SELECTION LOCKED...');

    setTimeout(() => {
      sound.stopDrumroll();
      spotlightOverlay.classList.remove('active');

      const winIndex = Math.floor(Math.random() * availableNames.length);
      const winningName = availableNames[winIndex];

      availableNames.splice(winIndex, 1);
      selectedWinners.push(winningName);

      goldenFlash.classList.add('trigger');
      setTimeout(() => goldenFlash.classList.remove('trigger'), 900);

      shockwaveRing.classList.add('expand');
      setTimeout(() => shockwaveRing.classList.remove('expand'), 900);

      sound.playVictory();
      fxEngine.triggerCelebration(5000);

      // DOM UI Updates & Mascot Victory Crown Dance
      nameText.textContent = winningName;
      nameText.className = 'name-text winner-reveal';
      winnerCongratsLabel.classList.add('visible');
      winnerSubtitle.classList.add('visible');
      
      stageCard.classList.remove('drawing-active');
      stageCard.classList.add('winner-active');
      stageStatusLabel.textContent = 'WINNER ANNOUNCED';
      setStatusMessage(`🏆 Congratulations to ${winningName}!`);

      if (cyberDancerAvatar && danceStageWrapper) {
        cyberDancerAvatar.className = 'cyber-dancer-avatar victory';
        danceStageWrapper.className = 'dance-stage-wrapper dance-stage-full victory-dance';
        if (dancerStatusText) dancerStatusText.textContent = 'VICTORY DANCE! 👑🎉';
      }

      addWinnerToHistory(winningName);
      updateStats();

      isDrawing = false;
      startBtn.disabled = false;
      resetBtn.disabled = false;

      if (availableNames.length === 0) {
        setTimeout(showCompletionModal, 3000);
      }
    }, 500);
  }

  /* ------------------------------------------------------------------------
     8. RESET & MODAL HANDLERS
     ------------------------------------------------------------------------ */
  function resetAll() {
    sound.playClick();
    isDrawing = false;
    availableNames = [...allCandidateNames];
    selectedWinners = [];

    nameText.textContent = 'PRESS START DRAW';
    nameText.className = 'name-text idle-state';
    winnerCongratsLabel.classList.remove('visible');
    winnerSubtitle.classList.remove('visible');
    
    stageCard.classList.remove('drawing-active', 'winner-active');
    stageStatusLabel.textContent = 'READY FOR DRAW';
    setStatusMessage(`System Reset. ${allCandidateNames.length} Names Ready.`);

    if (cyberDancerAvatar && danceStageWrapper) {
      cyberDancerAvatar.className = 'cyber-dancer-avatar idle';
      danceStageWrapper.className = 'dance-stage-wrapper dance-stage-full';
      if (dancerStatusText) dancerStatusText.textContent = 'Mascot Ready to Groove 🎧';
    }

    winnersList.innerHTML = '';

    updateStats();
    hideCompletionModal();
    startBtn.disabled = false;
    resetBtn.disabled = false;
  }

  function showCompletionModal() {
    completionModal.classList.add('active');
    fxEngine.triggerCelebration(6000);
  }

  function hideCompletionModal() {
    completionModal.classList.remove('active');
  }

  function toggleSound() {
    isMuted = !isMuted;
    if (isMuted) {
      muteIcon.textContent = '🔇';
      muteBtn.querySelector('.btn-tooltip').textContent = 'Sound OFF';
    } else {
      muteIcon.textContent = '🔊';
      muteBtn.querySelector('.btn-tooltip').textContent = 'Sound ON';
      sound.playClick();
    }
  }

  /* ------------------------------------------------------------------------
     9. MANAGE NAMES POOL LOGIC & INTERACTION
     ------------------------------------------------------------------------ */
  function openManageModal() {
    sound.playClick();
    renderModalNameTags();
    namesModal.classList.add('active');
  }

  function closeManageModal() {
    namesModal.classList.remove('active');
  }

  function renderModalNameTags() {
    namesTagsContainer.innerHTML = '';
    modalNamesCount.textContent = allCandidateNames.length;

    if (allCandidateNames.length === 0) {
      namesTagsContainer.innerHTML = `<span style="color: var(--text-muted); font-size: 0.85rem;">No names in candidate pool. Add names above or click "Reset to Default 70".</span>`;
      return;
    }

    allCandidateNames.forEach((name, idx) => {
      const tag = document.createElement('span');
      tag.className = 'name-tag';
      tag.innerHTML = `
        <span>${name}</span>
        <button class="tag-delete-btn" data-index="${idx}" title="Remove name">✕</button>
      `;
      namesTagsContainer.appendChild(tag);
    });

    // Attach tag delete handlers
    namesTagsContainer.querySelectorAll('.tag-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'), 10);
        removeCandidateName(index);
      });
    });
  }

  function removeCandidateName(index) {
    if (index >= 0 && index < allCandidateNames.length) {
      const name = allCandidateNames[index];
      allCandidateNames.splice(index, 1);
      
      // Also remove from availableNames if present
      const availIdx = availableNames.indexOf(name);
      if (availIdx !== -1) availableNames.splice(availIdx, 1);

      renderModalNameTags();
      updateStats();
    }
  }

  function handleAddSingleName() {
    const val = singleNameInput.value.trim();
    if (val) {
      if (!allCandidateNames.includes(val)) {
        allCandidateNames.push(val);
        availableNames.push(val);
        singleNameInput.value = '';
        renderModalNameTags();
        updateStats();
        sound.playClick();
      } else {
        alert(`"${val}" is already in the names list!`);
      }
    }
  }

  function handleAddBulkNames() {
    const text = bulkNamesInput.value.trim();
    if (!text) return;

    // Split by newlines or commas
    const rawNames = text.split(/[\n,]/).map(s => s.trim()).filter(s => s.length > 0);
    let addedCount = 0;

    rawNames.forEach(name => {
      if (!allCandidateNames.includes(name)) {
        allCandidateNames.push(name);
        availableNames.push(name);
        addedCount++;
      }
    });

    bulkNamesInput.value = '';
    renderModalNameTags();
    updateStats();
    sound.playClick();

    if (addedCount > 0) {
      setStatusMessage(`Added ${addedCount} custom names to the pool.`);
    }
  }

  function handleRestoreDefaults() {
    if (confirm('Reset pool to default 70 candidate names?')) {
      allCandidateNames = [...DEFAULT_NAMES];
      availableNames = [...DEFAULT_NAMES];
      selectedWinners = [];
      renderModalNameTags();
      resetAll();
    }
  }

  function handleClearAllNames() {
    if (confirm('Clear ALL names from the pool?')) {
      allCandidateNames = [];
      availableNames = [];
      selectedWinners = [];
      renderModalNameTags();
      resetAll();
    }
  }

  /* ------------------------------------------------------------------------
     10. EVENT LISTENERS
     ------------------------------------------------------------------------ */
  startBtn.addEventListener('click', startDraw);
  resetBtn.addEventListener('click', resetAll);
  modalResetBtn.addEventListener('click', resetAll);
  muteBtn.addEventListener('click', toggleSound);

  manageNamesBtn.addEventListener('click', openManageModal);
  closeNamesModalBtn.addEventListener('click', closeManageModal);
  saveNamesModalBtn.addEventListener('click', closeManageModal);

  addSingleBtn.addEventListener('click', handleAddSingleName);
  singleNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAddSingleName();
  });

  addBulkBtn.addEventListener('click', handleAddBulkNames);
  loadDefaultsBtn.addEventListener('click', handleRestoreDefaults);
  clearAllNamesBtn.addEventListener('click', handleClearAllNames);

  // Initialize App State & Winners History
  renderHistoryFromState();
  updateStats();
});

