// ── Helpers ──────────────────────────────────────────────
function positionLines() {
  const mainEl = document.getElementById('main-line');
  const subEl = document.getElementById('subtitle-line');
  const mainRect = mainEl.getBoundingClientRect();
  subEl.style.top = mainRect.bottom + 'px';
}
document.fonts.ready.then(positionLines);
window.addEventListener('resize', positionLines);

const ease = 'power2.out';
const hint = document.getElementById('scroll-hint');

// ── Sugar fade effect ───────────────────────────────────
function applySugarFade() {
  const chars = document.querySelectorAll('.sugar-char');
  const steps = [
    { opacity: 0.95, blur: 0.3 },
    { opacity: 0.85, blur: 0.8 },
    { opacity: 0.7,  blur: 2 },
    { opacity: 0.55, blur: 4 },
    { opacity: 0.4,  blur: 7 },
    { opacity: 0.3,  blur: 11 }
  ];
  chars.forEach((ch, i) => {
    gsap.to(ch, {
      opacity: steps[i].opacity,
      filter: 'blur(' + steps[i].blur + 'px)',
      duration: 2.5,
      delay: i * 0.15,
      ease: 'power2.in'
    });
  });
}
const isDesktop = window.matchMedia('(min-width: 769px)').matches;

// Calculate cup offset: desired 15vw, clamped to image limit
function getCupOffset() {
  if (!isDesktop) return 0;
  const img = document.querySelector('.product-layer img');
  if (!img) return 0;
  const imgWidth = img.offsetWidth;
  const vw = window.innerWidth;
  const maxSafe = (imgWidth - vw) / 2;
  const desired = vw * 0.15; // 15vw
  return Math.max(0, Math.min(desired, maxSafe));
}

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
  if (steviaOpen || steviaAnimating) return;
  if (!blockReady || blockAnimating || currentBlock > 3) return;
  blockReady = false;
  hideHint();
  playBlock(currentBlock);
}

function onWheelUp() {
  if (steviaOpen || steviaAnimating) return;
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


// ── Stevia detour ──────────────────────────────────────
let steviaOpen = false;
let steviaAnimating = false;
const steviaLink = document.getElementById('stevia-link');
const steviaHint = document.getElementById('stevia-hint');
const steviaPanel = document.getElementById('stevia-panel');
const steviaBack = document.getElementById('stevia-back');

// Calculate max safe pan for the hero image
function getMaxPan() {
  const img = document.querySelector('.hero-img');
  if (!img) return 0;
  const imgWidth = img.offsetWidth;
  const vw = window.innerWidth;
  return Math.max(0, (imgWidth - vw) / 2);
}

// Show "saber mais" hint after reconheça block completes
function showSteviaHint() {
  gsap.to(steviaHint, { opacity: 1, filter: 'blur(0px)', duration: 0.6, delay: 0.3, ease });
}
function hideSteviaHint() {
  gsap.to(steviaHint, { opacity: 0, filter: 'blur(10px)', duration: 0.3 });
}

function openStevia() {
  if (steviaAnimating || steviaOpen) return;
  steviaAnimating = true;
  steviaOpen = true;
  hideHint();
  hideSteviaHint();

  const tl = gsap.timeline({
    onComplete: () => {
      steviaAnimating = false;
      steviaPanel.style.pointerEvents = 'auto';
    }
  });

  // Shift background left (clamped to image edge), texts travel further
  const maxPan = getMaxPan();
  tl.to('.hero-img', { x: -maxPan, duration: 1.4, ease: 'power2.inOut' }, 0)
    .to('.reconheca-layer', { x: '-100vw', opacity: 0, duration: 1.4, ease: 'power2.inOut' }, 0)
    .fromTo('#stevia-panel', { opacity: 0, x: '100vw' }, { opacity: 1, x: 0, duration: 1.4, ease: 'power2.inOut' }, 0)
    .to('#stevia-back', { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0.8);
}

function closeStevia() {
  if (steviaAnimating || !steviaOpen) return;
  steviaAnimating = true;
  steviaPanel.style.pointerEvents = 'none';

  const tl = gsap.timeline({
    onComplete: () => {
      steviaAnimating = false;
      steviaOpen = false;
      showSteviaHint();
      showHint();
    }
  });

  tl.to('#stevia-back', { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0)
    .to('#stevia-panel', { opacity: 0, x: '100vw', duration: 1.2, ease: 'power2.inOut' }, 0)
    .to('.hero-img', { x: 0, duration: 1.2, ease: 'power2.inOut' }, 0)
    .to('.reconheca-layer', { x: 0, opacity: 1, duration: 1.2, ease: 'power2.inOut' }, 0);
}

steviaLink.addEventListener('click', (e) => { e.preventDefault(); openStevia(); });
steviaHint.addEventListener('click', openStevia);
steviaBack.addEventListener('click', closeStevia);

// ── Product pulse ───────────────────────────────────────
const productPulseTweens = {};
function startProductPulse(id) {
  productPulseTweens[id] = [];
  document.querySelectorAll('.nada-letter-' + id).forEach((letter, i) => {
    function pulse() {
      const tw = gsap.to(letter, {
        opacity: 0.65, filter: 'blur(3px)',
        duration: 0.3 + Math.random() * 0.5,
        ease: 'sine.inOut', yoyo: true, repeat: 1,
        delay: Math.random() * 0.4, onComplete: pulse
      });
      productPulseTweens[id][i] = tw;
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
    gsap.killTweensOf(el);
    gsap.set(el, { opacity: 1, filter: 'blur(0px)' });
  });
}

// ── Products config ─────────────────────────────────────
const products = [
  { id: 'limao',    color: '#e8b000', prevColor: '#0a5eb5' },
  { id: 'morango',  color: '#d94452', prevColor: '#e8b000' },
  { id: 'maracuja', color: '#6b2fa0', prevColor: '#d94452' }
];

// ── Build product block (forward) ───────────────────────
function buildProductBlock(productIndex, blockIndex) {
  const p = products[productIndex];
  const prevTextLayer = productIndex === 0
    ? '.reconheca-layer'
    : '#' + products[productIndex - 1].id + '-text-layer';
  const imgEl = '#' + p.id + '-layer img';

  const tl = gsap.timeline({
    onComplete: () => {
      blockAnimating = false;
      currentBlock = blockIndex + 1;
      lastPlayedBlock = blockIndex;
      blockTimelines[blockIndex] = tl;
      saveBlock();
      if (blockIndex < 3) showHint();
    }
  });

  const lw = document.querySelectorAll('#' + p.id + '-text-layer .pw');

  // Reset clip
  gsap.set('#' + p.id + '-layer', { clipPath: CLIP_HIDDEN_BOTTOM });

  // Desktop: position cup for non-first products (already scaled+offset); first starts centered at normal size
  if (isDesktop && productIndex > 0) {
    gsap.set(imgEl, { x: getCupOffset(), y: '-5vh', scale: 1.28, transformOrigin: 'center center' });
  } else if (isDesktop) {
    gsap.set(imgEl, { x: 0, scale: 1 });
  }

  if (productIndex === 0) {
    document.querySelector('.reconheca-layer').style.pointerEvents = 'none';
    hideSteviaHint();
    tl.to('.fixed-layer', { filter: 'blur(0px)', duration: 1, ease: 'none' }, 0)
      .to('#mobile-overlay', { opacity: 0, duration: 1, ease: 'none' }, 0);
  }
  tl.to(prevTextLayer, { opacity: 0, duration: 1, ease: 'none' }, 0)
    .to('#' + p.id + '-layer', { clipPath: CLIP_VISIBLE, duration: 1.5, ease: 'power2.inOut' }, 0.5)
    .to('body', { backgroundColor: p.color, duration: 1.5, ease: 'power2.inOut' }, 0.5);

  // Desktop: slide + scale limão cup to the right after wipe
  if (isDesktop && productIndex === 0) {
    tl.to(imgEl, { x: getCupOffset(), y: '-5vh', scale: 1.28, transformOrigin: 'center center', duration: 1, ease: 'power2.inOut' }, '-=0.3');
  }

  // Line by line reveal: 0.5s duration, -=0.2 overlap
  const textStart = (isDesktop && productIndex === 0) ? '-=0.3' : '+=0.3';
  const lastTextIdx = lw.length - 1;
  lw.forEach((el, i) => {
    const pos = i === 0 ? textStart : '-=0.2';
    const opts = { opacity: 1, filter: 'blur(0px)', duration: 0.5, ease };
    if (i === lastTextIdx) opts.onComplete = () => startProductPulse(p.id);
    tl.to(el, opts, pos);
  });

  tl.to('#' + p.id + '-kcal', { opacity: 1, filter: 'blur(0px)', duration: 0.5, ease }, '+=0.2');
  return tl;
}

// ── Reverse product block (always manual, wipe DOWN) ────
function reverseProductBlock(n) {
  const p = products[n - 1];
  stopProductPulse(p.id);
  const prevTextLayer = n === 1 ? '.reconheca-layer' : '#' + products[n - 2].id + '-text-layer';
  const imgEl = '#' + p.id + '-layer img';

  const revTl = gsap.timeline({
    onComplete: () => {
      blockAnimating = false;
      currentBlock = n;
      lastPlayedBlock = n - 1;
      saveBlock();
      if (n === 1) {
        document.querySelector('.reconheca-layer').style.pointerEvents = 'auto';
        showSteviaHint();
      }
      showHint();
    }
  });

  revTl.to('#' + p.id + '-text-layer .pw', { opacity: 0, filter: 'blur(30px)', duration: 0.6, ease: 'power2.in' }, 0)
       .to('#' + p.id + '-kcal', { opacity: 0, filter: 'blur(30px)', duration: 0.6, ease: 'power2.in' }, 0);

  // Desktop: slide limão cup back to center before wipe
  if (isDesktop && n === 1) {
    revTl.to(imgEl, { x: 0, y: 0, scale: 1, duration: 1, ease: 'power2.inOut' }, 0.3);
  }

  revTl.to('#' + p.id + '-layer', { clipPath: CLIP_HIDDEN_BOTTOM, duration: 1.5, ease: 'power2.inOut' }, 0.5)
       .to('body', { backgroundColor: p.prevColor, duration: 1.5, ease: 'power2.inOut' }, 0.5)
       .to(prevTextLayer, { opacity: 1, duration: 1, ease: 'none' }, 0.7);

  if (n === 1) {
    revTl.to('.fixed-layer', { filter: 'blur(20px)', duration: 1, ease: 'none' }, 0.7)
         .to('#mobile-overlay', { opacity: 1, duration: 1, ease: 'none' }, 0.7);
  }
}

// ── Play block ──────────────────────────────────────────
function playBlock(n) {
  blockAnimating = true;

  if (n === 0) {
    gsap.set('.reconheca-layer', { opacity: 1 });
    gsap.set('.reconheca-line', { opacity: 0, filter: 'blur(30px)' });
    gsap.set('#stevia-points', { opacity: 0, filter: 'blur(30px)' });
    const tl = gsap.timeline({
      onComplete: () => {
        blockAnimating = false;
        currentBlock = 1;
        lastPlayedBlock = 0;
        blockTimelines[0] = tl;
        saveBlock();
        document.querySelector('.reconheca-layer').style.pointerEvents = 'auto';
        showSteviaHint();
        showHint();
      }
    });
    tl.to('.fixed-layer', { filter: 'blur(20px)', duration: 1.2, ease: 'none' }, 0)
      .to('.text-layer', { filter: 'blur(20px)', opacity: 0, duration: 1.2, ease: 'none' }, 0)
      .to('#mobile-overlay', { opacity: 1, duration: 1.2, ease: 'none' }, 0)
      .to('#reconheca-line-1', { opacity: 1, filter: 'blur(0px)', duration: 0.5, ease }, 0.6)
      .to('#reconheca-line-2', { opacity: 1, filter: 'blur(0px)', duration: 0.5, ease }, '-=0.2')
      .to('#reconheca-line-3', { opacity: 1, filter: 'blur(0px)', duration: 0.5, ease }, '-=0.2')
      .to('#stevia-points', { opacity: 1, filter: 'blur(0px)', duration: 0.5, ease }, '-=0.2');
  }

  if (n >= 1 && n <= 3) {
    buildProductBlock(n - 1, n);
  }
}

// ── Reverse block ───────────────────────────────────────
function reverseBlock(n) {
  blockAnimating = true;
  const tl = blockTimelines[n];

  if (n === 0) {
    // Fade out reconheça, unblur and show intro
    document.querySelector('.reconheca-layer').style.pointerEvents = 'none';
    hideSteviaHint();
    const revTl = gsap.timeline({
      onComplete: () => {
        gsap.set('.text-layer', { filter: 'none', opacity: 1 });
        blockAnimating = false;
        currentBlock = 0;
        lastPlayedBlock = -1;
        saveBlock();
        showHint();
      }
    });
    revTl.to('.reconheca-layer', { opacity: 0, duration: 0.8, ease: 'power2.in' }, 0)
         .to('#mobile-overlay', { opacity: 0, duration: 0.8, ease: 'none' }, 0)
         .to('.fixed-layer', { filter: 'blur(0px)', duration: 1, ease: 'none' }, 0)
         .to('.text-layer', { filter: 'none', opacity: 1, duration: 1, ease: 'none' }, 0.3);
    return;
  }

  if (n >= 1 && n <= 3) {
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
  gsap.set('#nada', { opacity: 1, filter: 'blur(0px)' });
  gsap.set('.sub-group', { opacity: 1, filter: 'blur(0px)' });
  applySugarFade();
}

function setBlock0Complete() {
  setIntroComplete();
  gsap.set('.fixed-layer', { filter: 'blur(20px)' });
  gsap.set('.text-layer', { filter: 'blur(20px)', opacity: 0 });
  gsap.set('.reconheca-line', { opacity: 1, filter: 'blur(0px)' });
  gsap.set('#stevia-points', { opacity: 1, filter: 'blur(0px)' });
  document.querySelector('.reconheca-layer').style.pointerEvents = 'auto';
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
  // Desktop: set cup to right position
  if (isDesktop) {
    gsap.set('#' + p.id + '-layer img', { x: getCupOffset(), y: '-5vh', scale: 1.28, transformOrigin: 'center center' });
  }
  document.querySelectorAll('#' + p.id + '-text-layer .pw').forEach(el => gsap.set(el, { opacity: 1, filter: 'blur(0px)' }));
  gsap.set('#' + p.id + '-kcal', { opacity: 1, filter: 'blur(0px)' });
  startProductPulse(p.id);
}

// ── Init ────────────────────────────────────────────────
function init() {
  if (savedBlock === -1) {
    currentBlock = 0;
    const tl1 = gsap.timeline({ delay: 1 });
    tl1.to('#limo', { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease })
       .to('#nada', { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease }, '-=0.2')
       .to('#sub-group-1', { opacity: 1, filter: 'blur(0px)', duration: 0.5, ease }, '-=0.2')
       .to('#sub-group-2', { opacity: 1, filter: 'blur(0px)', duration: 0.5, ease, onStart: applySugarFade }, '-=0.2');
    tl1.eventCallback('onComplete', () => { showHint(); });
  } else if (savedBlock === 0) {
    setIntroComplete();
    currentBlock = 0;
    gsap.delayedCall(0.5, () => { if (!blockAnimating) playBlock(0); });
  } else if (savedBlock >= 1 && savedBlock <= 3) {
    setIntroComplete();
    setBlock0Complete();
    for (let i = 0; i < savedBlock - 1; i++) {
      setProductComplete(i);
    }
    currentBlock = savedBlock;
    gsap.delayedCall(0.5, () => { if (!blockAnimating) playBlock(savedBlock); });
  }
}

init();
