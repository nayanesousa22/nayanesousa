/* ═══════════════════════════════════════════════
   NAYANE — Dobras 1 e 2
   1) Carrossel do hero
   2) Vídeo de fundo + astronauta guiados pelo scroll
   3) Revelações da dobra 2
═══════════════════════════════════════════════ */
(() => {
  'use strict';

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  /* ───────────── 1) VÍDEO + ASTRONAUTA ───────────── */
  const space      = document.getElementById('space');
  const video      = document.getElementById('spaceVideo');
  const hole       = document.getElementById('spaceHole');
  const dim        = document.getElementById('fold1Dim');
  const inner      = document.getElementById('fold1Inner');
  const cue        = document.getElementById('scrollCue');
  const astro      = document.getElementById('astro');
  const slot       = document.getElementById('astroSlot');
  const fold2      = document.getElementById('fold2');

  // medidas do astronauta dentro do vídeo (1920×1080) e do PNG (1024×587)
  const VID  = { w: 1920, h: 1080, cx: 950, cy: 526, astroW: 352 };
  const PNG  = { w: 1024, h: 587, bboxW: 928 / 1024, ox: 0.5068, oy: 0.5017 };

  const VIDEO_ZOOM0   = 1.06;   // zoom inicial (dá folga para deslocar o vídeo)
  const VIDEO_ZOOM_GAIN = 0.42; // quanto o vídeo "cai para dentro" ao rolar
  const SHIFT_X = -0.022;       // posiciona o astronauta equilibrado entre o texto e o carrossel maior

  let vw = 0, vh = 0, sc = 1, shiftX = 0, shiftY = 0;
  let endBboxW = 0, elW = 0, elH = 0;
  let targetY = 0, shown = 0;    // rolagem "suavizada"

  function layout() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    sc = Math.max(vw / VID.w, vh / VID.h);
    const W = VID.w * sc, H = VID.h * sc;
    shiftX = vw >= 960 ? vw * SHIFT_X : 0;
    shiftY = vw < 960 ? -vh * 0.075 : 0;

    space.style.width  = W + 'px';
    space.style.height = H + 'px';
    space.style.left   = (vw - W) / 2 + 'px';
    space.style.top    = (vh - H) / 2 + 'px';

    const hw = 560 * sc, hh = 380 * sc;
    hole.style.width  = hw + 'px';
    hole.style.height = hh + 'px';
    hole.style.left   = VID.cx * sc - hw / 2 + 'px';
    hole.style.top    = VID.cy * sc - hh / 2 + 'px';

    // tamanho final do astronauta = largura da coluna da dobra 2
    const slotRect = slot.getBoundingClientRect();
    endBboxW = vw < 960
      ? Math.min(slotRect.width * 0.72, 260)
      : Math.min(Math.max(slotRect.width * 1.15, 620), 750, vh * 1.3);
    elW = endBboxW / PNG.bboxW;
    elH = elW * (PNG.h / PNG.w);
    astro.style.width  = elW + 'px';
    astro.style.height = elH + 'px';
  }

  // posição (em viewport) do astronauta do vídeo na pose inicial
  function startPoint() {
    const W = VID.w * sc, H = VID.h * sc;
    const x = vw / 2 + (VID.cx * sc - W / 2) * VIDEO_ZOOM0 + shiftX;
    const y = vh / 2 + (VID.cy * sc - H / 2) * VIDEO_ZOOM0 + shiftY;
    return { x, y, bboxW: VID.astroW * sc * VIDEO_ZOOM0 };
  }

  function render(y) {
    const isDesk = vw >= 960;
    const t = clamp(y / (vh * 0.92));          // 0 → 1 ao chegar na dobra 2
    const e = easeInOut(t);

    /* vídeo: acompanha o scroll */
    const zoom = VIDEO_ZOOM0 + VIDEO_ZOOM_GAIN * easeOut(clamp(y / vh));
    space.style.transform = `translate3d(${shiftX}px,${shiftY}px,0) scale(${zoom})`;
    const rate = 1 + 1.8 * clamp(y / (vh * 0.8));
    if (Math.abs(video.playbackRate - rate) > 0.05) video.playbackRate = rate;
    dim.style.setProperty('--dim', (clamp(y / (vh * 0.9)) * 0.6).toFixed(3));

    /* troca do astronauta do vídeo pelo PNG logo no início do scroll */
    const swap = clamp(y / 60);
    hole.style.opacity = swap;

    /* limites da dobra 2 para descida e saída suave (somente até a dobra 2) */
    const f2 = fold2 || document.getElementById('fold2');
    const f2Top = f2 ? f2.offsetTop : vh;
    const f2H   = f2 ? f2.offsetHeight : vh * 1.4;
    const f3Top = f2Top + f2H;

    let astroOpacity = swap;
    if (y > f3Top - vh) {
      const exitFade = clamp((f3Top - y) / (vh * 0.45));
      astroOpacity = Math.max(0, swap * exitFade);
    }
    astro.style.opacity = astroOpacity.toFixed(3);

    /* conteúdo da dobra 1 sai de cena */
    const out = clamp(y / (vh * 0.55));
    inner.style.opacity = (1 - out).toFixed(3);
    inner.style.transform = `translate3d(0,${(-y * 0.1).toFixed(1)}px,0)`;
    inner.style.pointerEvents = out > 0.5 ? 'none' : '';
    if (cue) cue.style.opacity = (1 - clamp(y / 80)).toFixed(3);

    /* trajetória: do centro (vídeo) para a direita (dobra 2) */
    const s = startPoint();
    const r = slot.getBoundingClientRect();
    const endX = r.left + r.width / 2;

    let endY;
    if (isDesk) {
      // no desktop: chega na dobra 2 e, à medida que desce na dobra 2,
      // acompanha descendo junto (somente até o final da dobra 2)
      const arrivalY = vh * 0.26;
      const d2ScrollDist = Math.max(1, f2H - vh * 0.85);
      const d2Prog = clamp((y - f2Top) / d2ScrollDist); // 0 no topo da dobra 2, 1 no fim
      const d2Descent = d2Prog * (vh * 0.38);
      endY = arrivalY + d2Descent;
    } else {
      endY = r.top + r.height * 0.36;
    }

    const arc = Math.sin(e * Math.PI);
    const px = lerp(s.x, endX, e);
    const py = lerp(s.y, endY, e) + arc * vh * 0.07;     // leve arco de queda
    const k0 = s.bboxW / endBboxW;                        // escala inicial
    const k  = lerp(k0, 1, easeOut(t));                   // vai crescendo
    const rot = arc * 9;                                  // tomba um pouco p/ a direita

    const tx = px - elW * PNG.ox;
    const ty = py - elH * PNG.oy;
    astro.style.transform = `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg) scale(${k.toFixed(4)})`;
  }

  /* suavização leve do scroll p/ dar sensação de queda */
  let raf = null;
  function loop() {
    raf = null;
    const diff = targetY - shown;
    shown = Math.abs(diff) < 0.3 ? targetY : shown + diff * 0.2;
    render(shown);
    if (shown !== targetY) raf = requestAnimationFrame(loop);
  }
  function onScroll() {
    targetY = window.scrollY;
    if (!raf) raf = requestAnimationFrame(loop);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { layout(); targetY = shown = window.scrollY; render(shown); });

  const boot = () => { layout(); targetY = shown = window.scrollY; render(shown); };
  boot();
  window.addEventListener('load', boot);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot);
  if (video) {
    video.muted = true;
    video.play().catch(() => {});
  }

  /* ───────────── 3) VÍDEO DA DOBRA 4 ───────────── */
  const fold4Vid = document.getElementById('fold4Video') || document.querySelector('.fold4__video');
  if (fold4Vid) {
    fold4Vid.muted = true;
    fold4Vid.defaultMuted = true;
    fold4Vid.playsInline = true;

    const playFold4 = () => {
      if (fold4Vid.paused) {
        const p = fold4Vid.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    };

    playFold4();

    // Garante reinício contínuo em looping
    fold4Vid.addEventListener('ended', () => {
      fold4Vid.currentTime = 0;
      playFold4();
    });

    // Quando a Dobra 4 entrar na tela, dispara o vídeo
    const f4Observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) playFold4();
      });
    }, { threshold: 0.05 });
    const fold4Sec = document.getElementById('portfolio');
    if (fold4Sec) f4Observer.observe(fold4Sec);

    // Fallbacks para interação do usuário
    window.addEventListener('scroll', playFold4, { passive: true });
    window.addEventListener('click', playFold4, { once: true });
    window.addEventListener('touchstart', playFold4, { passive: true, once: true });
  }

  /* ───────────── CARROSSEIS INTERATIVOS COM AUTO-PLAY E ARRASTE (DOBRAS 1 E 4) ───────────── */
  function setupInteractiveMarquee(wrapSelector, trackSelector, cardSelector, baseSpeed = 0.85) {
    const wrap = document.querySelector(wrapSelector);
    const track = wrap ? wrap.querySelector(trackSelector) : null;
    if (!wrap || !track) return;

    const originalCards = Array.from(track.querySelectorAll(cardSelector));
    if (originalCards.length < 6) return;

    // Clona o Set 1 para criar o Set 3, garantindo buffer contínuo em ambas as direções
    const setSize = originalCards.length / 2; // 6 cards
    for (let i = 0; i < setSize; i++) {
      const clone = originalCards[i].cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('tabindex', '-1');
      track.appendChild(clone);
    }

    let setWidth = 0;
    function updateSetWidth() {
      const cardSet2 = track.children[setSize];
      if (cardSet2) {
        setWidth = cardSet2.offsetLeft;
      }
    }

    const setInitialPos = () => {
      updateSetWidth();
      if (setWidth > 0 && (wrap.scrollLeft === 0 || wrap.scrollLeft < 10)) {
        wrap.scrollLeft = setWidth;
      }
    };
    setInitialPos();
    window.addEventListener('load', setInitialPos);
    window.addEventListener('resize', updateSetWidth);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(setInitialPos);
    }

    let isInteracting = false;
    let resumeTimer = null;
    let hasDragged = false;

    function pauseAuto() {
      isInteracting = true;
      if (resumeTimer) {
        clearTimeout(resumeTimer);
        resumeTimer = null;
      }
    }

    function resumeAuto(delay = 1400) {
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        isInteracting = false;
      }, delay);
    }

    function handleWrap() {
      if (setWidth <= 0) updateSetWidth();
      if (setWidth <= 0) return;

      if (wrap.scrollLeft >= setWidth * 2) {
        wrap.scrollLeft -= setWidth;
      } else if (wrap.scrollLeft <= 5) {
        wrap.scrollLeft += setWidth;
      }
    }

    wrap.addEventListener('scroll', handleWrap, { passive: true });
    wrap.addEventListener('wheel', () => {
      pauseAuto();
      resumeAuto(1400);
    }, { passive: true });

    // Touch handling (Mobile)
    let touchStartX = 0;
    wrap.addEventListener('touchstart', e => {
      if (e.touches && e.touches[0]) {
        touchStartX = e.touches[0].pageX;
      }
      pauseAuto();
    }, { passive: true });

    wrap.addEventListener('touchmove', e => {
      if (e.touches && e.touches[0] && Math.abs(e.touches[0].pageX - touchStartX) > 6) {
        hasDragged = true;
      }
      pauseAuto();
    }, { passive: true });

    wrap.addEventListener('touchend', () => {
      resumeAuto(1400);
      setTimeout(() => { hasDragged = false; }, 120);
    }, { passive: true });

    wrap.addEventListener('touchcancel', () => {
      resumeAuto(1000);
      setTimeout(() => { hasDragged = false; }, 120);
    }, { passive: true });

    // Mouse drag handling (Desktop)
    let isMouseDown = false;
    let startX = 0;
    let startScrollLeft = 0;

    wrap.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      isMouseDown = true;
      hasDragged = false;
      startX = e.pageX;
      startScrollLeft = wrap.scrollLeft;
      pauseAuto();
      wrap.classList.add('is-dragging');
    });

    window.addEventListener('mousemove', e => {
      if (!isMouseDown) return;
      const dx = e.pageX - startX;
      if (Math.abs(dx) > 4) {
        hasDragged = true;
      }
      wrap.scrollLeft = startScrollLeft - dx;
      handleWrap();
    });

    window.addEventListener('mouseup', () => {
      if (!isMouseDown) return;
      isMouseDown = false;
      wrap.classList.remove('is-dragging');
      resumeAuto(1500);
      setTimeout(() => { hasDragged = false; }, 80);
    });

    // Hover pause em Desktop (apenas mouse)
    wrap.addEventListener('pointerenter', e => {
      if (e.pointerType === 'mouse') pauseAuto();
    });
    wrap.addEventListener('pointerleave', e => {
      if (e.pointerType === 'mouse' && !isMouseDown) resumeAuto(600);
    });

    // Previne clique acidental durante arraste
    track.addEventListener('click', e => {
      if (hasDragged) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    // Auto-scroll contínuo e suave a 60fps
    function tick() {
      if (!isInteracting && wrap.offsetParent !== null) {
        const speed = window.innerWidth <= 768 ? baseSpeed * 0.75 : baseSpeed;
        wrap.scrollLeft += speed;
        handleWrap();
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // Inicializa carrossel da Dobra 1 e Dobra 4
  setupInteractiveMarquee('.marquee-wrap', '.marquee-track', '.c-card', 0.85);
  setupInteractiveMarquee('.fold4__marquee-wrap', '.fold4__track', '.p-card', 0.95);

  /* ───────────── NOVO: DECK DE DESEMPENHO (PASSAR FOLHA PRA CIMA EM LOOPING) ───────────── */
  const sheetDeck = document.getElementById('sheetDeck');
  if (sheetDeck) {
    const cards = Array.from(sheetDeck.querySelectorAll('.sheet-card'));
    const dots = Array.from(sheetDeck.querySelectorAll('.sheet-dot'));
    const nextBtn = document.getElementById('sheetNextBtn');
    const stage = document.getElementById('sheetStage');
    let current = 0;
    let isFlipping = false;

    function applyPositions() {
      cards.forEach((card, i) => {
        card.classList.remove('is-flipping-up');
        const pos = (i - current + cards.length) % cards.length;
        card.setAttribute('data-pos', pos);
      });
      dots.forEach((dot, i) => {
        dot.classList.toggle('is-active', i === current);
      });
    }

    function flipNext() {
      if (isFlipping || cards.length < 2) return;
      isFlipping = true;

      const topCard = cards[current];
      topCard.classList.add('is-flipping-up');

      current = (current + 1) % cards.length;

      // As demais folhas avançam suavemente
      cards.forEach((card, i) => {
        if (card === topCard) return;
        const pos = (i - current + cards.length) % cards.length;
        card.setAttribute('data-pos', pos);
      });
      dots.forEach((dot, i) => {
        dot.classList.toggle('is-active', i === current);
      });

      setTimeout(() => {
        topCard.classList.remove('is-flipping-up');
        topCard.setAttribute('data-pos', cards.length - 1);
        isFlipping = false;
      }, 520);
    }

    applyPositions();

    // Rotação contínua e automática em looping (2 segundos)
    setInterval(flipNext, 2000);

    if (nextBtn) nextBtn.addEventListener('click', flipNext);
    if (stage) stage.addEventListener('click', flipNext);

    dots.forEach((dot, idx) => {
      dot.addEventListener('click', () => {
        if (isFlipping || idx === current) return;
        flipNext();
      });
    });

    let touchStartY = 0;
    if (stage) {
      stage.addEventListener('touchstart', e => {
        touchStartY = e.touches[0].clientY;
      }, { passive: true });
      stage.addEventListener('touchend', e => {
        const diff = touchStartY - e.changedTouches[0].clientY;
        if (diff > 35) flipNext();
      }, { passive: true });
    }
  }

  /* ───────────── 4) REVELAÇÕES DA PÁGINA ───────────── */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  /* ───────────── 5) MODAL DE ORÇAMENTO (DOBRA 5) ───────────── */
  const quoteModal = document.getElementById('quoteModal');
  const openQuoteBtn = document.getElementById('openQuoteModal');
  const closeQuoteBtn = document.getElementById('closeQuoteModal');
  const quoteForm = document.getElementById('quoteForm');
  const qFeedback = document.getElementById('qFeedback');

  if (quoteModal && openQuoteBtn) {
    const closeModal = () => { quoteModal.hidden = true; };
    openQuoteBtn.addEventListener('click', () => {
      quoteModal.hidden = false;
      const firstInput = document.getElementById('qName');
      if (firstInput) firstInput.focus();
    });
    if (closeQuoteBtn) closeQuoteBtn.addEventListener('click', closeModal);
    quoteModal.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', closeModal));
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !quoteModal.hidden) closeModal();
    });

    if (quoteForm) {
      quoteForm.addEventListener('submit', e => {
        e.preventDefault();
        const name = (document.getElementById('qName')?.value || '').trim();
        const biz = (document.getElementById('qBiz')?.value || '').trim();
        const goal = (document.getElementById('qGoal')?.value || '').trim();
        const msg = `Olá Nayane! Me chamo ${name}.\nMeu negócio: ${biz}\nO que quero que o site faça por mim: ${goal}`;

        const done = () => {
          if (qFeedback) qFeedback.textContent = 'Mensagem copiada! Abrindo @nay.webdesigner para você colar no Direct.';
          window.open('https://www.instagram.com/nay.webdesigner/', '_blank', 'noopener,noreferrer');
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(msg).then(done).catch(done);
        } else {
          done();
        }
      });
    }
  }
})();
