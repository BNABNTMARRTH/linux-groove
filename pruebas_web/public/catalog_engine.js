/**
 * GROOVE NEXUS // MOTOR DE VIRTUALIZACION Y CATALOGO INTERACTIVO
 * Maneja carga reactiva de iframes con IntersectionObserver, telemetria de FPS y scroll
 * Estricto: Cero Emojis // 60 FPS garantizados
 */

(function () {
  'use strict';

  // 1. Telemetria de FPS
  let frameCount = 0;
  let lastTime = performance.now();
  let currentFps = 60;
  const fpsEl = document.getElementById('telemetry-fps');
  const activeCountEl = document.getElementById('telemetry-active-count');
  const progressBarEl = document.getElementById('scroll-progress-bar');
  const scrollPctEl = document.getElementById('telemetry-scroll');

  function calculateFps(now) {
    frameCount++;
    if (now - lastTime >= 500) {
      currentFps = Math.round((frameCount * 1000) / (now - lastTime));
      if (fpsEl) {
        fpsEl.textContent = currentFps + ' FPS';
        if (currentFps < 45) {
          fpsEl.style.color = 'var(--accent-amber)';
        } else {
          fpsEl.style.color = 'var(--accent-green)';
        }
      }
      frameCount = 0;
      lastTime = now;
    }
    requestAnimationFrame(calculateFps);
  }
  requestAnimationFrame(calculateFps);

  // 2. Control de Barra de Scroll y Telemetria de Progreso
  function onScrollProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrollPct = docHeight > 0 ? Math.min(100, Math.max(0, Math.round((scrollTop / docHeight) * 100))) : 0;
    
    if (progressBarEl) {
      progressBarEl.style.width = scrollPct + '%';
    }
    if (scrollPctEl) {
      scrollPctEl.textContent = scrollPct + '%';
    }
  }
  window.addEventListener('scroll', onScrollProgress, { passive: true });
  onScrollProgress();

  // 3. Virtualizacion de Micro-Viewports con IntersectionObserver
  let activeIframes = 0;

  function updateActiveCounter() {
    if (activeCountEl) {
      activeCountEl.textContent = activeIframes;
    }
  }

  const observerOptions = {
    root: null,
    rootMargin: '250px 0px 250px 0px', // Pre-carga cuando esta a 250px de entrar en viewport
    threshold: 0.05
  };

  const iframeObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      const card = entry.target;
      const iframe = card.querySelector('.preview-iframe');
      const placeholder = card.querySelector('.preview-placeholder');
      const badge = card.querySelector('.card-status-badge');
      const dataSrc = iframe ? iframe.getAttribute('data-src') : null;

      if (!iframe || !dataSrc) return;

      if (entry.isIntersecting) {
        // Entra en rango: Si no tiene src o esta en about:blank, cargamos el recurso
        if (!iframe.src || iframe.src === 'about:blank' || !iframe.src.endsWith(dataSrc)) {
          iframe.src = dataSrc;
          activeIframes++;
          updateActiveCounter();

          iframe.onload = function () {
            iframe.classList.add('loaded');
            if (placeholder) {
              placeholder.classList.add('hidden');
            }
            if (badge) {
              badge.textContent = 'EN VIVO';
              badge.className = 'card-status-badge live';
            }
          };
        }
      } else {
        // Sale de rango: Descargar iframe para liberar memoria WebGL y ciclos de CPU
        if (iframe.src && iframe.src !== 'about:blank' && !iframe.src.endsWith('about:blank')) {
          iframe.src = 'about:blank';
          iframe.classList.remove('loaded');
          if (placeholder) {
            placeholder.classList.remove('hidden');
          }
          if (badge) {
            badge.textContent = 'EN ESPERA';
            badge.className = 'card-status-badge virtualized';
          }
          activeIframes = Math.max(0, activeIframes - 1);
          updateActiveCounter();
        }
      }
    });
  }, observerOptions);

  // Registrar todas las tarjetas
  const allCards = document.querySelectorAll('.project-card');
  allCards.forEach(function (card) {
    iframeObserver.observe(card);
  });

  // 4. Filtro por Categoria Reactivo
  const filterButtons = document.querySelectorAll('.filter-btn');
  const sections = document.querySelectorAll('.category-section');

  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterButtons.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');

      const targetCategory = btn.getAttribute('data-category');

      sections.forEach(function (sec) {
        const secCat = sec.getAttribute('data-category');
        if (targetCategory === 'all' || secCat === targetCategory) {
          sec.style.display = 'block';
        } else {
          sec.style.display = 'none';
        }
      });
    });
  });

  // 5. Efecto Tilt 3D sutil con Cursor sobre las Tarjetas
  allCards.forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const deltaX = (x - centerX) / centerX;
      const deltaY = (y - centerY) / centerY;

      const rotateX = -deltaY * 5; // Maximo 5 grados
      const rotateY = deltaX * 5;

      card.style.transform = 'perspective(800px) rotateX(' + rotateX.toFixed(2) + 'deg) rotateY(' + rotateY.toFixed(2) + 'deg) translateY(-4px)';
    });

    card.addEventListener('mouseleave', function () {
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  });

})();
