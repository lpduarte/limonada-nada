// ── Helpers ──────────────────────────────────────────────
function positionLines() {
  const mainEl = document.getElementById('main-line');
  const subEl = document.getElementById('subtitle-line');
  const mainRect = mainEl.getBoundingClientRect();
  subEl.style.top = mainRect.bottom + 'px';
}
document.fonts.ready.then(positionLines);
window.addEventListener('resize', positionLines);

const dur = 0.8;
const ease = 'power2.out';
const hint = document.getElementById('scroll-hint');

// Clip-path helpers — using polygon for reliable direction control
const CLIP_HIDDEN_BOTTOM = 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)'; // hidden: collapsed at bottom
const CLIP_HIDDEN_TOP    = 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)';         // hidden: collapsed at top
const CLIP_VISIBLE       = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';     // fully visible

// ── Virtual scroll ──────────────────────────────────────
let currentBlock = 0;
let blockAnimating = false;
let blockReady = false;
const blockTimelines = [];

function onWheelDown() {
  if (!blockReady || blockAnimating || currentBlock > 4) return;
  blockReady = false;
  hideHint();
  playBlock(currentBlock);
}

function onWheelUp() {
  if (blockAnimating || currentBlock === 0) return;
  blockReady = false;
  hideHint();
  reverseBlock(currentBlock - 1);
}

window.addEventListener('wheel', (e) => {
  if (e.deltaY > 0) onWheelDown();
  else if (e.deltaY < 0) onWheelUp();
}, { passive: true });

let touchStartY = 0;
window.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
window.addEventListener('touchend', (e) => {
  const diff = touchStartY - e.changedTouches[0].clientY;
  if (diff > 30) onWheelDown();
  else if (diff < -30) onWheelUp();
}, { passive: true });

hint.style.pointerEvents = 'auto';
hint.style.cursor = 'pointer';
hint.addEventListener('click', onWheelDown);

// ── Hint ────────────────────────────────────────────────
let hintAnim = null;
let hintFadeTween = null;
const isMobile = window.matchMedia('(max-width: 768px)').matches;

function showHint() {
  if (hintAnim) hintAnim.kill();
  if (hintFadeTween) hintFadeTween.kill();
  gsap.set(hint, { y: 0 });

  if (isMobile) {
    // Pointer: swipe up, fade out, reappear at bottom, repeat
    hintAnim = gsap.timeline({ repeat: -1, delay: 1 });
    hintAnim.set(hint, { y: 15, opacity: 0 })
            .to(hint, { y: 0, opacity: 1, duration: 0.5, ease: 'sine.out' })
            .to({}, { duration: 0.4 })
            .to(hint, { opacity: 0, duration: 0.3 })
            .to({}, { duration: 0.3 });
  } else {
    hintFadeTween = gsap.to(hint, { opacity: 1, duration: 0.6, delay: 1 });
    // Mouse: bounce
    hintAnim = gsap.to(hint, { y: -10, duration: 0.8, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1 });
  }
  blockReady = true;
}
function hideHint() {
  if (hintAnim) hintAnim.kill();
  if (hintFadeTween) hintFadeTween.kill();
  gsap.to(hint, { opacity: 0, duration: 0.3 });
}

// ── NADA pulse (intro) ─────────────────────────────────
let nadaPulseTweens = [];
function startNadaPulse() {
  document.querySelectorAll('.nada-letter').forEach(letter => {
    function pulse() {
      const tw = gsap.to(letter, {
        opacity: 0.65, filter: 'blur(3px)',
        duration: 0.3 + Math.random() * 0.5,
        ease: 'sine.inOut', yoyo: true, repeat: 1,
        delay: Math.random() * 0.4, onComplete: pulse
      });
      nadaPulseTweens.push(tw);
    }
    pulse();
  });
}
function stopNadaPulse() {
  nadaPulseTweens.forEach(tw => tw.kill());
  nadaPulseTweens = [];
  document.querySelectorAll('.nada-letter').forEach(el => {
    gsap.set(el, { opacity: 1, filter: 'blur(0px)' });
  });
}

// ── Product pulse ───────────────────────────────────────
const productPulseTweens = {};
function startProductPulse(id) {
  productPulseTweens[id] = [];
  document.querySelectorAll('.nada-letter-' + id).forEach(letter => {
    function pulse() {
      const tw = gsap.to(letter, {
        opacity: 0.65, filter: 'blur(3px)',
        duration: 0.3 + Math.random() * 0.5,
        ease: 'sine.inOut', yoyo: true, repeat: 1,
        delay: Math.random() * 0.4, onComplete: pulse
      });
      productPulseTweens[id].push(tw);
    }
    pulse();
  });
}
function stopProductPulse(id) {
  if (productPulseTweens[id]) {
    productPulseTweens[id].forEach(tw => tw.kill());
    productPulseTweens[id] = [];
  }
  document.querySelectorAll('.nada-letter-' + id).forEach(el => {
    gsap.set(el, { opacity: 1, filter: 'blur(0px)' });
  });
}

// ── Products config ─────────────────────────────────────
const products = [
  { id: 'limao',    color: '#e8b000', prevColor: '#0a5eb5' },
  { id: 'morango',  color: '#d94452', prevColor: '#e8b000' },
  { id: 'maracuja', color: '#6b2fa0', prevColor: '#d94452' },
  { id: 'final',    color: '#0a5eb5', prevColor: '#6b2fa0' }
];

// ── Build product block (forward) ───────────────────────
function buildProductBlock(productIndex, blockIndex) {
  const p = products[productIndex];
  const prevTextLayer = productIndex === 0
    ? '.reconheca-layer'
    : '#' + products[productIndex - 1].id + '-text-layer';

  const tl = gsap.timeline({
    onComplete: () => {
      blockAnimating = false;
      currentBlock = blockIndex + 1;
      lastPlayedBlock = blockIndex;
      blockTimelines[blockIndex] = tl;
      saveBlock();
      if (blockIndex < 4) showHint();
    }
  });

  const lw = document.querySelectorAll('#' + p.id + '-text-layer .pw');

  // Reset clip
  gsap.set('#' + p.id + '-layer', { clipPath: CLIP_HIDDEN_BOTTOM });

  if (productIndex === 0) {
    tl.to('.fixed-layer', { filter: 'blur(0px)', duration: 1, ease: 'none' }, 0)
      .to('#mobile-overlay', { opacity: 0, duration: 1, ease: 'none' }, 0);
  }
  tl.to('#logo-h3', { opacity: 0, filter: 'blur(30px)', duration: 0.6, ease: 'power2.in' }, 0)
    .to(prevTextLayer, { opacity: 0, duration: 1, ease: 'none' }, 0)
    .to('#' + p.id + '-layer', { clipPath: CLIP_VISIBLE, duration: 1.5, ease: 'power2.inOut' }, 0.5)
    .to('body', { backgroundColor: p.color, duration: 1.5, ease: 'power2.inOut' }, 0.5);

  if (p.id === 'final') {
    // LIMO(0) N(1)A(2)D(3)A(4), TODO(5) O(6) SABOR.(7) NADA(8) DE(9) AÇÚCAR(10)
    tl.to(lw[0], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '+=0.3')
      .to([lw[1],lw[2],lw[3],lw[4]], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease, stagger: 0, onComplete: () => startProductPulse(p.id) }, '-=0.45')
      .to(lw[5], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '+=0.1')
      .to(lw[6], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '-=0.45')
      .to(lw[7], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '-=0.45')
      .to(lw[8], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '+=0.4')
      .to(lw[9], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '-=0.45')
      .to(lw[10], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '-=0.45')
      .to('#logo-h3', { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '+=0.2');
  } else {
    // LIMO(0) N(1)A(2)D(3)A(4) H3(5) DE(6), NAME(7), TODO(8) O(9) SABOR.(10) NADA(11) DE(12) AÇÚCAR(13)
    tl.to(lw[0], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '+=0.3')
      .to([lw[1],lw[2],lw[3],lw[4]], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease, stagger: 0 }, '-=0.45')
      .to(lw[5], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '-=0.45')
      .to(lw[6], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '-=0.45')
      .to(lw[7], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '+=0.1')
      .to(lw[8], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '+=0.1')
      .to(lw[9], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '-=0.45')
      .to(lw[10], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '-=0.45')
      .to(lw[11], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '+=0.4')
      .to(lw[12], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '-=0.45')
      .to(lw[13], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease, onComplete: () => startProductPulse(p.id) }, '-=0.45')
      .to('#' + p.id + '-kcal', { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '+=0.3')
      .to('#logo-h3', { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '+=0.2');
  }
  return tl;
}

// ── Reverse product block (always manual, wipe DOWN) ────
function reverseProductBlock(n) {
  const p = products[n - 1];
  stopProductPulse(p.id);
  const prevTextLayer = n === 1 ? '.reconheca-layer' : '#' + products[n - 2].id + '-text-layer';

  const revTl = gsap.timeline({
    onComplete: () => {
      blockAnimating = false;
      currentBlock = n;
      lastPlayedBlock = n - 1;
      if (n > 1) gsap.to('#logo-h3', { opacity: 1, filter: 'blur(0px)', duration: 0.8 });
      saveBlock();
      showHint();
    }
  });

  revTl.to('#' + p.id + '-text-layer .pw', { opacity: 0, filter: 'blur(30px)', duration: 0.6, ease: 'power2.in' }, 0)
       .to('#' + p.id + '-kcal', { opacity: 0, filter: 'blur(30px)', duration: 0.6, ease: 'power2.in' }, 0)
       .to('#logo-h3', { opacity: 0, filter: 'blur(30px)', duration: 0.6, ease: 'power2.in' }, 0)
       .to('#' + p.id + '-layer', { clipPath: CLIP_HIDDEN_BOTTOM, duration: 1.5, ease: 'power2.inOut' }, 0.3)
       .to('body', { backgroundColor: p.prevColor, duration: 1.5, ease: 'power2.inOut' }, 0.3)
       .to(prevTextLayer, { opacity: 1, duration: 1, ease: 'none' }, 0.5);

  if (n === 1) {
    revTl.to('.fixed-layer', { filter: 'blur(20px)', duration: 1, ease: 'none' }, 0.5)
         .to('#mobile-overlay', { opacity: 1, duration: 1, ease: 'none' }, 0.5)
         .to('#logo-h3', { opacity: 0, duration: 0.3 }, 0);
  }
}

// ── Play block ──────────────────────────────────────────
function playBlock(n) {
  blockAnimating = true;

  if (n === 0) {
    // Stop pulse and reset reconheca layer
    stopNadaPulse();
    gsap.set('.reconheca-layer', { opacity: 1 });
    gsap.set('.sub-word2', { opacity: 0, filter: 'blur(30px)' });
    gsap.set('#stevia-points', { opacity: 0, filter: 'blur(30px)' });
    const subWords2 = document.querySelectorAll('.sub-word2');
    const tl = gsap.timeline({
      onComplete: () => {
        blockAnimating = false;
        currentBlock = 1;
        lastPlayedBlock = 0;
        blockTimelines[0] = tl;
        saveBlock();
        showHint();
      }
    });
    // subWords2: 0=RE, 1=CONHEÇA, 2=AS, 3=LIMONADAS, 4=H3, 5=ADOÇADAS, 6=COM, 7=STEVIA
    tl.to('.fixed-layer', { filter: 'blur(20px)', duration: 1.2, ease: 'none' }, 0)
      .to('.text-layer', { filter: 'blur(20px)', opacity: 0, duration: 1.2, ease: 'none' }, 0)
      .to('#mobile-overlay', { opacity: 1, duration: 1.2, ease: 'none' }, 0)
      .to('#logo-h3', { opacity: 0, filter: 'blur(30px)', duration: 0.6, ease: 'power2.in' }, 0)
      .to(subWords2[0], { opacity: 1, filter: 'blur(0px)', duration: dur, ease }, 0.6)
      .to(subWords2[1], { opacity: 1, filter: 'blur(0px)', duration: dur, ease }, '+=0.1')
      .to(subWords2[2], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '+=0.1')
      .to(subWords2[3], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '-=0.45')
      .to(subWords2[4], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '-=0.45')
      .to(subWords2[5], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '-=0.45')
      .to(subWords2[6], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '-=0.45')
      .to(subWords2[7], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '-=0.45')
      .to('#stevia-points', { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '+=0.3');
  }

  if (n >= 1 && n <= 4) {
    buildProductBlock(n - 1, n);
  }
}

// ── Reverse block ───────────────────────────────────────
function reverseBlock(n) {
  blockAnimating = true;
  const tl = blockTimelines[n];

  if (n === 0) {
    // Fade out reconheça, unblur and show intro
    const revTl = gsap.timeline({
      onComplete: () => {
        gsap.set('.text-layer', { filter: 'none', opacity: 1 });
        blockAnimating = false;
        currentBlock = 0;
        lastPlayedBlock = -1;
        startNadaPulse();
        saveBlock();
        showHint();
      }
    });
    revTl.to('.reconheca-layer', { opacity: 0, duration: 0.8, ease: 'power2.in' }, 0)
         .to('#mobile-overlay', { opacity: 0, duration: 0.8, ease: 'none' }, 0)
         .to('.fixed-layer', { filter: 'blur(0px)', duration: 1, ease: 'none' }, 0)
         .to('.text-layer', { filter: 'none', opacity: 1, duration: 1, ease: 'none' }, 0.3)
         .to('#logo-h3', { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, 0.3);
    return;
  }

  if (n >= 1 && n <= 4) {
    reverseProductBlock(n);
    return;
  }
}

// ── Session persistence ─────────────────────────────────
let lastPlayedBlock = -1;
function saveBlock() {
  sessionStorage.setItem('lastPlayedBlock', lastPlayedBlock);
}
const savedBlock = parseInt(sessionStorage.getItem('lastPlayedBlock') ?? '-1');

// ── State setters for skip-on-reload ────────────────────
function setIntroComplete() {
  gsap.set('#limo', { opacity: 1, filter: 'blur(0px)' });
  gsap.set('.nada-letter', { opacity: 1, filter: 'blur(0px)' });
  document.querySelectorAll('.subtitle-line .sub-word').forEach(el => {
    gsap.set(el, { opacity: 1, filter: 'blur(0px)' });
  });
  startNadaPulse();
}

function setBlock0Complete() {
  setIntroComplete();
  gsap.set('.fixed-layer', { filter: 'blur(20px)' });
  gsap.set('.text-layer', { filter: 'blur(20px)', opacity: 0 });
  gsap.set('#re', { opacity: 1, filter: 'blur(0px)' });
  gsap.set('#conheca', { opacity: 1, filter: 'blur(0px)' });
  document.querySelectorAll('.sub-word2').forEach(el => gsap.set(el, { opacity: 1, filter: 'blur(0px)' }));
  gsap.set('#stevia-points', { opacity: 1, filter: 'blur(0px)' });
}

function setProductComplete(productIndex) {
  const p = products[productIndex];
  if (productIndex === 0) {
    gsap.set('.fixed-layer', { filter: 'blur(0px)' });
    gsap.set('.reconheca-layer', { opacity: 0 });
  }
  if (productIndex > 0) {
    gsap.set('#' + products[productIndex - 1].id + '-text-layer', { opacity: 0 });
  }
  gsap.set('#' + p.id + '-layer', { clipPath: CLIP_VISIBLE });
  gsap.set('body', { backgroundColor: p.color });
  document.querySelectorAll('#' + p.id + '-text-layer .pw').forEach(el => gsap.set(el, { opacity: 1, filter: 'blur(0px)' }));
  gsap.set('#' + p.id + '-kcal', { opacity: 1, filter: 'blur(0px)' });
  startProductPulse(p.id);
}

// ── Init ────────────────────────────────────────────────
function init() {
  if (savedBlock === -1) {
    currentBlock = 0;
    const subWords = document.querySelectorAll('.subtitle-line .sub-word');
    const tl1 = gsap.timeline({ delay: 1 });
    tl1.to('#limo', { opacity: 1, filter: 'blur(0px)', duration: dur, ease })
       .to('.nada-letter', { opacity: 1, filter: 'blur(0px)', duration: dur, ease, stagger: 0, onComplete: startNadaPulse }, '+=0.3')
       .to(subWords[0], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '+=0.1')
       .to(subWords[1], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '-=0.45')
       .to(subWords[2], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '-=0.45')
       .to(subWords[3], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '+=0.4')
       .to(subWords[4], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '-=0.45')
       .to(subWords[5], { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '-=0.45')
       .to('#logo-h3', { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '-=0.3');
    tl1.eventCallback('onComplete', () => { showHint(); });
  } else if (savedBlock === 0) {
    setIntroComplete();
    currentBlock = 0;
    setTimeout(() => playBlock(0), 500);
  } else if (savedBlock >= 1 && savedBlock <= 4) {
    setIntroComplete();
    setBlock0Complete();
    for (let i = 0; i < savedBlock - 1; i++) {
      setProductComplete(i);
    }
    currentBlock = savedBlock;
    setTimeout(() => playBlock(savedBlock), 500);
  }
}

init();
