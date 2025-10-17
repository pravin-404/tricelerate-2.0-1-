// script.js — GSAP-enhanced behaviour for Tricelerate 2.0 (click-to-enlarge poster)
// Features:
// - Cinematic preloader that waits for poster to load before playing its reveal
// - Click-to-open poster lightbox (enlarged view) with GSAP animation
// - Poster no longer reacts to mousemove/hover animations
// - Button micro-interactions
// - Robust modal open/close with GSAP animations and accessibility basics
// - Uses GSAP 3 + ScrollTrigger (ensure GSAP and ScrollTrigger are included in index.html)

/* global gsap, ScrollTrigger */
(function () {
  // Register plugins safely
  try {
    gsap.registerPlugin(window.ScrollTrigger);
  } catch (e) {
    // ignore if already registered or not present
  }

  const qs = (s) => document.querySelector(s);
  const qsa = (s) => Array.from(document.querySelectorAll(s));

  /* -----------------------------
     Utility: wait for image load with timeout fallback
     ----------------------------- */
  function waitForImageLoad(img, timeout = 1800) {
    return new Promise((resolve) => {
      if (!img) return resolve();
      if (img.complete && img.naturalWidth) return resolve();
      let fired = false;
      const onLoad = () => {
        if (fired) return;
        fired = true;
        cleanup();
        resolve();
      };
      const onError = () => {
        if (fired) return;
        fired = true;
        cleanup();
        resolve();
      };
      const cleanup = () => {
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
        clearTimeout(timer);
      };
      img.addEventListener('load', onLoad);
      img.addEventListener('error', onError);
      const timer = setTimeout(() => {
        if (!fired) {
          fired = true;
          cleanup();
          resolve();
        }
      }, timeout);
    });
  }

  /* -----------------------------
     Preloader + Intro (waits for poster image)
     ----------------------------- */
  function initPreloader() {
    const preloader = qs('.preloader');
    const letters = qsa('.reveal-text span');
    const eventCard = qs('.event-card');
    const poster = qs('#posterImage');

    // poster tween paused — will be played when image loaded
    const posterTween = gsap.from('#posterImage', {
      scale: 0.97,
      y: 10,
      opacity: 0,
      duration: 0.7,
      ease: 'expo.out',
      paused: true
    });

    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

    // letters: rise + bounce
    tl.fromTo(
      letters,
      { y: '130%', opacity: 0, scale: 0.6 },
      { y: '0%', opacity: 1, scale: 1, duration: 1, stagger: 0.08, ease: 'back.out(1.7)' }
    );

    // gradient shimmer wave
    tl.to(
      letters,
      { backgroundPosition: '200% center', duration: 1.8, stagger: { amount: 0.5, from: 'random' }, ease: 'sine.inOut' },
      '-=0.5'
    );

    // preloader fade + soft zoom out (no rotation)
    tl.to(
      preloader,
      {
        opacity: 0,
        scale: 1.1,
        filter: 'blur(10px)',
        duration: 1,
        ease: 'power2.inOut',
        onComplete: () => {
          try { preloader.style.display = 'none'; } catch (e) {}
        }
      },
      '+=0.15'
    );

    // landing reveal (balanced)
    tl.to(
      eventCard,
      {
        opacity: 1,
        y: 0,
        visibility: 'visible',
        duration: 0.9,
        ease: 'power3.out',
        boxShadow: '0 20px 60px rgba(124,92,255,0.25)'
      },
      '-=0.35'
    );

    // play main timeline
    tl.play();

    // When the poster image is loaded (or fallback timeout), play posterTween immediately.
    waitForImageLoad(poster, 1800).then(() => {
      posterTween.play();
    });
  }

  /* -----------------------------
     Poster interactions: CLICK to enlarge (no hover/mousemove)
     ----------------------------- */
  function initPosterClickToEnlarge() {
    const posterWrap = qs('.image-container');
    const poster = qs('#posterImage');
    if (!posterWrap || !poster) return;

    // Create lightbox DOM dynamically when needed
    function openLightbox() {
      // if already open, do nothing
      if (qs('.tric-lightbox')) return;

      const src = poster.getAttribute('src') || poster.src;
      const alt = poster.getAttribute('alt') || '';

      // create elements
      const lb = document.createElement('div');
      lb.className = 'tric-lightbox';

      const backdrop = document.createElement('div');
      backdrop.className = 'tric-lightbox-backdrop';

      const imgWrap = document.createElement('div');
      imgWrap.className = 'tric-lightbox-wrap';

      const img = document.createElement('img');
      img.src = src;
      img.alt = alt;

      // append
      imgWrap.appendChild(img);
      lb.appendChild(backdrop);
      lb.appendChild(imgWrap);
      document.body.appendChild(lb);

      // animate in
      const inTL = gsap.timeline();
      inTL.to(backdrop, { autoAlpha: 1, duration: 0.28, ease: 'power2.out' });
      inTL.fromTo(img, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'expo.out' }, '-=0.12');

      // close function
      function closeLightbox() {
        const outTL = gsap.timeline({
          onComplete: () => {
            try { if (lb && lb.parentNode) lb.parentNode.removeChild(lb); } catch (e) {}
          }
        });
        outTL.to(img, { scale: 0.98, opacity: 0, duration: 0.32, ease: 'power2.in' });
        outTL.to(backdrop, { autoAlpha: 0, duration: 0.24, ease: 'power2.in' }, '-=0.18');
      }

      // close on backdrop click, image click, or Escape
      backdrop.addEventListener('click', closeLightbox);
      img.addEventListener('click', closeLightbox);
      window.addEventListener('keydown', function escClose(e) {
        if (e.key === 'Escape') {
          closeLightbox();
          window.removeEventListener('keydown', escClose);
        }
      }, { once: true });
    }

    // attach click (press) handler
    posterWrap.addEventListener('click', (e) => {
      e.preventDefault();
      openLightbox();
    });
  }

  /* -----------------------------
     Scroll parallax for poster wrapper (subtle) — keeps poster moving with scroll
     ----------------------------- */
  function initPosterScrollParallax() {
    const posterWrap = qs('.image-container');
    if (!posterWrap) return;
    if (window.ScrollTrigger) {
      ScrollTrigger.create({
        trigger: posterWrap,
        start: 'top center',
        end: 'bottom top',
        scrub: 0.6,
        onUpdate: (self) => {
          gsap.to(posterWrap, { y: - (self.progress * 18), duration: 0.4, ease: 'none' });
        }
      });
    }
  }

  /* -----------------------------
     Button micro-interactions
     ----------------------------- */
  function initButtonInteractions() {
    const buttons = qsa('.btn');
    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        gsap.to(btn, { y: -4, scale: 1.01, duration: 0.18, ease: 'power2.out' });
      });
      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, { y: 0, scale: 1, duration: 0.28, ease: 'power3.out' });
      });
      btn.addEventListener('focus', () => gsap.to(btn, { boxShadow: '0 10px 30px rgba(99,58,234,0.18)', duration: 0.18 }));
      btn.addEventListener('blur', () => gsap.to(btn, { boxShadow: 'none', duration: 0.18 }));
    });
  }

  /* -----------------------------
     Robust Modal (delegated + GSAP timelines)
     ----------------------------- */
  function initModal() {
    function getModalEls() {
      const modal = qs('#detailsModal');
      if (!modal) return null;
      return {
        modal,
        backdrop: modal.querySelector('.modal-backdrop'),
        content: modal.querySelector('.modal-content'),
        closeBtns: modal.querySelectorAll('.modal-close-btn')
      };
    }

    let openTL = null;
    let closeTL = null;

    function buildTimelines(modalEls) {
      if (!modalEls) return;
      const { backdrop, content } = modalEls;
      gsap.set([backdrop, content], { clearProps: 'all' });

      openTL = gsap.timeline({ paused: true });
      openTL.to(backdrop, { autoAlpha: 1, duration: 0.26, ease: 'power2.out' });
      openTL.fromTo(content, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.36, ease: 'power3.out' }, '-=0.12');

      closeTL = gsap.timeline({ paused: true });
      closeTL.to(content, { y: 18, autoAlpha: 0, duration: 0.32, ease: 'power3.in' });
      closeTL.to(backdrop, { autoAlpha: 0, duration: 0.22, ease: 'power2.in' }, '-=0.18');
    }

    function openModal() {
      const els = getModalEls();
      if (!els) return console.warn('Modal not found');
      const { modal, backdrop, content } = els;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      if (!openTL) buildTimelines(els);
      gsap.set(backdrop, { autoAlpha: 0 });
      gsap.set(content, { y: 18, autoAlpha: 0 });
      openTL.play(0);
      const focusable = modal.querySelectorAll('a, button, input, textarea, select');
      if (focusable.length) focusable[0].focus();
    }

    function closeModal() {
      const els = getModalEls();
      if (!els) return;
      if (!closeTL) buildTimelines(els);
      closeTL.play(0).then(() => {
        els.modal.classList.remove('is-open');
        els.modal.setAttribute('aria-hidden', 'true');
      });
    }

    document.addEventListener('click', (e) => {
      const t = e.target;
      if (t.closest && t.closest('#viewDetailsBtn')) {
        e.preventDefault();
        openModal();
        return;
      }
      const els = getModalEls();
      if (els) {
        if (t.closest && t.closest('.modal-close-btn')) {
          e.preventDefault();
          closeModal();
          return;
        }
        if (t === els.backdrop) {
          e.preventDefault();
          closeModal();
          return;
        }
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const els = getModalEls();
        if (els && els.modal.classList.contains('is-open')) closeModal();
      }
    });

    document.addEventListener('focusin', (e) => {
      const els = getModalEls();
      if (!els) return;
      const { modal } = els;
      if (!modal.classList.contains('is-open')) return;
      if (!modal.contains(e.target)) {
        const focusable = modal.querySelectorAll('a, button, input, textarea, select');
        if (focusable.length) focusable[0].focus();
      }
    });
  }

  /* -----------------------------
     Init all features
     ----------------------------- */
  function initAll() {
    initButtonInteractions();
    initModal();
    initPosterClickToEnlarge();
    initPosterScrollParallax();
    initPreloader();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initAll, 40);
  } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initAll, 40));
  }
})();