const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const comboEl = document.getElementById('combo');
const missesEl = document.getElementById('misses');
const topScoresEl = document.getElementById('top-scores');
const menuEl = document.getElementById('menu');
const gameEl = document.getElementById('game');
const startGameBtn = document.getElementById('startGame');
const viewScoresBtn = document.getElementById('viewScores');

const audioElements = {};
let gameActive = false;
let score = 0;
let combo = 0;
let misses = 0;
let orbs = [];
let particles = [];
let slowTime = false;
let audioInitialized = false;
let lastSpawnTime = 0;
let spawnInterval = 1000;
let gameLevel = 1;
let highScore = 0;

function preloadAudio() {
  const sounds = {
    beat: 'audio/beat.mp3',
    hit: 'audio/hit.mp3',
    powerup: 'audio/powerup.mp3'
  };

  for (const [key, path] of Object.entries(sounds)) {
    const audio = new Audio(path);
    audio.volume = 0.5;
    audioElements[key] = audio;
  }
  audioInitialized = true;
}

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = Math.random() * 3 + 1;
    this.velocity = {
      x: (Math.random() - 0.5) * 8,
      y: (Math.random() - 0.5) * 8
    };
    this.alpha = 1;
    this.gravity = 0.1;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }

  update() {
    this.velocity.y += this.gravity;
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.alpha -= 0.02;
  }
}

class Orb {
  constructor(isPowerUp = false) {
    this.x = Math.random() * (canvas.width - 60) + 30;
    this.y = -30;
    this.radius = 25;
    this.speed = (Math.random() * 2 + 2) * (1 + gameLevel * 0.15);
    this.isPowerUp = isPowerUp;
    this.color = isPowerUp ? '#ffff00' : `hsl(${Math.random() * 360}, 100%, 50%)`;
    this.pulseSize = 0;
    this.pulseDirection = 1;
    this.points = isPowerUp ? 50 : 10;
  }

  draw() {
    this.pulseSize += 0.1 * this.pulseDirection;
    if (this.pulseSize > 1 || this.pulseSize < 0) this.pulseDirection *= -1;

    const glowRadius = this.radius * (1 + this.pulseSize * 0.2);

    ctx.beginPath();
    ctx.arc(this.x, this.y, glowRadius + 10, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(
      this.x, this.y, this.radius,
      this.x, this.y, glowRadius + 10
    );
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }

  update() {
    this.y += slowTime ? this.speed * 0.5 : this.speed;
    return this.y - this.radius > canvas.height;
  }
}

function createParticles(x, y, color) {
  for (let i = 0; i < 15; i++) {
    particles.push(new Particle(x, y, color));
  }
}

function spawnOrb() {
  if (!gameActive) return;

  const now = Date.now();
  if (now - lastSpawnTime > spawnInterval) {
    const powerUpChance = 0.1 + (gameLevel * 0.02);
    orbs.push(new Orb(Math.random() < powerUpChance));
    lastSpawnTime = now;
    spawnInterval = Math.max(400, 1000 - (gameLevel * 75));
  }
}

function playSound(soundName) {
  if (!audioElements[soundName]) return;
  const sound = audioElements[soundName].cloneNode();
  sound.volume = 0.5;
  sound.play().catch(() => { });
}

function handleClick(x, y) {
  let hit = false;
  for (let i = orbs.length - 1; i >= 0; i--) {
    const orb = orbs[i];
    if (Math.hypot(x - orb.x, y - orb.y) < orb.radius) {
      orbs.splice(i, 1);
      createParticles(orb.x, orb.y, orb.color);

      if (orb.isPowerUp) {
        playSound('powerup');
        slowTime = true;
        setTimeout(() => slowTime = false, 3000);
        score += orb.points * gameLevel;
      } else {
        playSound('hit');
        combo++;
        score += orb.points * combo * gameLevel;
      }

      hit = true;
      if (score > highScore) {
        highScore = score;
      }
      scoreEl.textContent = score;
      comboEl.textContent = combo;
      gameLevel = Math.floor(score / 1000) + 1;
      break;
    }
  }

  if (!hit) {
    combo = 0;
    comboEl.textContent = combo;
  }
}

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  handleClick(x, y);
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
  const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
  handleClick(x, y);
});

async function updateLeaderboard() {
  try {
    const playerName = localStorage.getItem('playerName') || prompt('Enter your name:');
    if (!playerName) return;
    localStorage.setItem('playerName', playerName);

    const response = await fetch('/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: playerName, score })
    });

    if (!response.ok) throw new Error('Network response was not ok');

    const scores = await response.json();
    topScoresEl.innerHTML = scores
      .map((s, i) => `<li>${i + 1}. ${s.name}: ${s.score}</li>`)
      .join('');
  } catch (error) {
    console.error('Failed to update leaderboard:', error);
  }
}

function endGame() {
  gameActive = false;
  updateLeaderboard().then(() => {
    alert(`Game Over!\nFinal Score: ${score}\nLevel: ${gameLevel}\nHigh Score: ${highScore}`);
    menuEl.style.display = 'block';
    gameEl.style.display = 'none';
  });
}

function startGame() {
  if (!audioInitialized) {
    preloadAudio();
  }

  menuEl.style.display = 'none';
  gameEl.style.display = 'block';
  gameActive = true;
  score = 0;
  combo = 0;
  misses = 0;
  gameLevel = 1;
  spawnInterval = 1000;
  lastSpawnTime = Date.now();
  scoreEl.textContent = score;
  comboEl.textContent = combo;
  missesEl.textContent = misses;
  orbs = [];
  particles = [];
}

startGameBtn.addEventListener('click', startGame);
viewScoresBtn.addEventListener('click', async () => {
  try {
    const response = await fetch('/scores');
    if (!response.ok) throw new Error('Network response was not ok');
    const scores = await response.json();
    topScoresEl.innerHTML = scores
      .map((s, i) => `<li>${i + 1}. ${s.name}: ${s.score}</li>`)
      .join('');
  } catch (error) {
    console.error('Failed to fetch scores:', error);
    topScoresEl.innerHTML = '<li>Failed to load scores</li>';
  }
});

function resizeCanvas() {
  canvas.width = Math.min(800, window.innerWidth - 20);
  canvas.height = Math.min(600, window.innerHeight * 0.6);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameActive) {
    spawnOrb();

    particles = particles.filter(p => p.alpha > 0);
    particles.forEach(particle => {
      particle.update();
      particle.draw();
    });

    orbs = orbs.filter(orb => {
      const isOffscreen = orb.update();
      if (!isOffscreen) {
        orb.draw();
      } else if (!orb.isPowerUp) {
        misses++;
        combo = 0;
        missesEl.textContent = misses;
        comboEl.textContent = combo;
        if (misses >= 5) endGame();
      }
      return !isOffscreen;
    });
  }

  requestAnimationFrame(animate);
}

animate();
