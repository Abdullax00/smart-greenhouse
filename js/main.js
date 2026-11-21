/**
 * Умная Теплица — Интерактивный JavaScript
 * По дизайн-макету Figma (Frame 7.svg)
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initVideoPlayer();
  initCarousels();
  initLightbox();
});

/* ==========================================================================
   Header & Navigation
   ========================================================================== */
function initHeader() {
  const header = document.querySelector('.site-header');
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const navLinks = document.getElementById('navLinks');
  const links = document.querySelectorAll('.nav-link');

  // Header background on scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });

  // Mobile menu toggle
  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });

    links.forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
      });
    });
  }

  // Active section indicator
  const sections = document.querySelectorAll('section[id], div[id="gallery"]');
  window.addEventListener('scroll', () => {
    let current = '';
    const scrollPos = window.scrollY + 200;

    sections.forEach(sec => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        current = sec.getAttribute('id');
      }
    });

    links.forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href').replace('#', '');
      if (href === current) {
        link.classList.add('active');
      }
    });
  }, { passive: true });
}

/* ==========================================================================
   Custom Video Player ("Обзор моей работы")
   ========================================================================== */
function initVideoPlayer() {
  const wrapper = document.querySelector('.video-player-wrapper');
  if (!wrapper) return;

  const video = wrapper.querySelector('.main-video');
  const bigPlayBtn = wrapper.querySelector('.video-big-play');
  const playBtn = wrapper.querySelector('.btn-play');
  const progressContainer = wrapper.querySelector('.video-progress-container');
  const progressBar = wrapper.querySelector('.video-progress-bar');
  const timeDisplay = wrapper.querySelector('.video-time');
  const muteBtn = wrapper.querySelector('.btn-mute');
  const fullscreenBtn = wrapper.querySelector('.btn-fullscreen');

  function togglePlay() {
    if (video.paused || video.ended) {
      video.play().catch(err => console.log('Autoplay blocked:', err));
      wrapper.classList.add('playing');
    } else {
      video.pause();
      wrapper.classList.remove('playing');
    }
    updatePlayIcons();
  }

  function updatePlayIcons() {
    const isPaused = video.paused;
    const playIcon = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
    const pauseIcon = `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
    if (playBtn) {
      playBtn.innerHTML = isPaused ? playIcon : pauseIcon;
    }
  }

  if (bigPlayBtn) bigPlayBtn.addEventListener('click', togglePlay);
  if (video) video.addEventListener('click', togglePlay);
  if (playBtn) playBtn.addEventListener('click', togglePlay);

  video.addEventListener('timeupdate', () => {
    if (!video.duration) return;
    const percent = (video.currentTime / video.duration) * 100;
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (timeDisplay) {
      timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
    }
  });

  video.addEventListener('ended', () => {
    wrapper.classList.remove('playing');
    updatePlayIcons();
  });

  if (progressContainer) {
    progressContainer.addEventListener('click', (e) => {
      const rect = progressContainer.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      video.currentTime = pos * video.duration;
    });
  }

  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      video.muted = !video.muted;
      muteBtn.innerHTML = video.muted
        ? `<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`
        : `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
    });
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        wrapper.requestFullscreen().catch(err => console.log(err));
      } else {
        document.exitFullscreen();
      }
    });
  }

  function formatTime(sec) {
    if (isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}

/* ==========================================================================
   3D Coverflow Carousel Class
   ========================================================================== */
class CoverflowCarousel {
  constructor(container) {
    this.container = container;
    this.stage = container.querySelector('.carousel-stage');
    this.cards = Array.from(container.querySelectorAll('.carousel-card'));
    this.prevBtn = container.querySelector('.prev-btn');
    this.nextBtn = container.querySelector('.next-btn');
    this.dotsContainer = container.querySelector('.carousel-dots');
    this.currentIndex = 0;
    this.total = this.cards.length;

    if (this.total === 0) return;

    this.createDots();
    this.update();
    this.bindEvents();
  }

  createDots() {
    if (!this.dotsContainer) return;
    this.dotsContainer.innerHTML = '';
    this.cards.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = `dot ${i === 0 ? 'active' : ''}`;
      dot.setAttribute('aria-label', `Слайд ${i + 1}`);
      dot.addEventListener('click', () => this.goTo(i));
      this.dotsContainer.appendChild(dot);
    });
    this.dots = Array.from(this.dotsContainer.querySelectorAll('.dot'));
  }

  update() {
    this.cards.forEach((card, index) => {
      card.classList.remove('active', 'prev', 'next', 'hidden-left', 'hidden-right');

      const diff = (index - this.currentIndex + this.total) % this.total;

      if (diff === 0) {
        card.classList.add('active');
      } else if (diff === this.total - 1 || (this.total === 2 && diff === 1)) {
        card.classList.add('prev');
      } else if (diff === 1) {
        card.classList.add('next');
      } else if (diff > 1 && diff <= Math.floor(this.total / 2)) {
        card.classList.add('hidden-right');
      } else {
        card.classList.add('hidden-left');
      }
    });

    if (this.dots) {
      this.dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === this.currentIndex);
      });
    }
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.total;
    this.update();
  }

  prev() {
    this.currentIndex = (this.currentIndex - 1 + this.total) % this.total;
    this.update();
  }

  goTo(idx) {
    this.currentIndex = idx;
    this.update();
  }

  bindEvents() {
    if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.prev());
    if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.next());

    // Click on slide to navigate or open lightbox
    this.cards.forEach((card, idx) => {
      card.addEventListener('click', () => {
        if (card.classList.contains('active')) {
          const img = card.querySelector('img');
          const caption = card.querySelector('.card-caption')?.textContent || '';
          if (img && window.openLightbox) {
            const fullSrc = img.getAttribute('data-full') || img.src;
            window.openLightbox(fullSrc, caption);
          }
        } else if (card.classList.contains('prev')) {
          this.prev();
        } else if (card.classList.contains('next')) {
          this.next();
        }
      });
    });

    // Touch swipe support
    let startX = 0;
    let endX = 0;
    this.stage.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    }, { passive: true });

    this.stage.addEventListener('touchend', (e) => {
      endX = e.changedTouches[0].clientX;
      const diff = startX - endX;
      if (Math.abs(diff) > 40) {
        if (diff > 0) this.next();
        else this.prev();
      }
    }, { passive: true });
  }
}

function initCarousels() {
  document.querySelectorAll('.carousel-outer').forEach(container => {
    new CoverflowCarousel(container);
  });
}

/* ==========================================================================
   Full-screen Lightbox
   ========================================================================== */
function initLightbox() {
  const modal = document.getElementById('lightboxModal');
  if (!modal) return;

  const img = modal.querySelector('.lightbox-img');
  const caption = modal.querySelector('.lightbox-caption');
  const closeBtn = modal.querySelector('.lightbox-close');

  window.openLightbox = function(src, text) {
    img.src = src;
    caption.textContent = text || '';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  function close() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      close();
    }
  });
}
