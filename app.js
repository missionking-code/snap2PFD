(() => {
  'use strict';

  /* ─── Config ─── */
  const PAGE_SIZES = {
    a4: [595.28, 841.89],
    letter: [612, 792],
    a5: [419.53, 595.28],
  };

  /* ─── State ─── */
  const state = {
    files: [],            // { id, file, url, name }
    settings: {
      pageSize: 'a4',
      orientation: 'portrait',
      perPage: 1,
      margin: 24,
      quality: 85,
      enhance: false,
    },
    nextId: 1,
  };

  /* ─── DOM ─── */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const workspace = $('#workspace');
  const dropzone = $('#dropzone');
  const fileInput = $('#fileInput');
  const thumbs = $('#thumbs');
  const studio = $('#studio');
  const previewFrame = $('#previewFrame');
  const toast = $('#toast');
  const wsSub = $('#wsSub');

  /* ─── Toast ─── */
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  /* ─── Lenis smooth scroll (desktop only) ─── */
  let lenis;
  if (window.Lenis && window.matchMedia('(pointer: fine)').matches) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  /* ─── GSAP Hero entrance ─── */
  if (window.gsap) {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('[data-hero]', { y: 40, opacity: 0, duration: 0.9, stagger: 0.12 })
      .from('[data-hero-preview]', { y: 60, opacity: 0, rotateY: -14, duration: 1.1, ease: 'power4.out' }, '-=0.7');

    if (window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      gsap.utils.toArray('[data-feature]').forEach((el, i) => {
        gsap.from(el, {
          y: 40, opacity: 0, duration: 0.7, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          delay: (i % 5) * 0.05,
        });
      });
    }
  }

  /* ─── Cursor (desktop only) ─── */
  const cursor = $('#cursor');
  const cursorDot = $('#cursorDot');
  if (window.matchMedia('(pointer: fine)').matches) {
    let mx = 0, my = 0, cx = 0, cy = 0;
    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      cursorDot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
    });
    const loop = () => {
      cx += (mx - cx) * 0.15;
      cy += (my - cy) * 0.15;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    };
    loop();
    $$('a, button, .dropzone, .thumb-item').forEach((el) => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
    });
  }

  /* ─── Magnetic buttons ─── */
  $$('[data-magnetic]').forEach((el) => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });

  /* ─── Theme toggle ─── */
  $('#themeToggle').addEventListener('click', () => {
    const html = document.documentElement;
    const next = html.dataset.theme === 'light' ? 'dark' : 'light';
    html.dataset.theme = next;
    showToast(next === 'light' ? 'Light mode' : 'Dark mode');
  });

  /* ─── Open / close workspace ─── */
  function openWorkspace() {
    workspace.hidden = false;
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();
    if (window.gsap) gsap.from('.workspace-inner > *', { y: 30, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out' });
  }
  function closeWorkspace() {
    workspace.hidden = true;
    document.body.style.overflow = '';
    if (lenis) lenis.start();
  }
  $('#startBtn').addEventListener('click', openWorkspace);
  $('#closeWorkspace').addEventListener('click', closeWorkspace);
  $('#demoBtn').addEventListener('click', () => {
    openWorkspace();
    showToast('Sample images coming soon — drop your own for now.');
  });

  /* ─── Smooth scroll links ─── */
  $$('[data-scroll]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          if (lenis) lenis.scrollTo(target, { offset: -80 });
          else target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  /* ─── File handling ─── */
  function addFiles(fileList) {
    const incoming = [...fileList].filter((f) => f.type.startsWith('image/'));
    if (!incoming.length) { showToast('Only image files are supported.'); return; }

    incoming.forEach((file) => {
      const id = state.nextId++;
      const url = URL.createObjectURL(file);
      state.files.push({ id, file, url, name: file.name });
    });
    renderThumbs();
    showToast(`${incoming.length} image${incoming.length > 1 ? 's' : ''} added`);
  }

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    addFiles(e.target.files);
    fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach((ev) => {
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach((ev) => {
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); });
  });
  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  });

  /* ─── Render thumbs ─── */
  let sortable;
  function renderThumbs() {
    if (!state.files.length) {
      thumbs.hidden = true;
      studio.hidden = true;
      wsSub.textContent = 'Drop images below or click to select.';
      return;
    }
    thumbs.hidden = false;
    studio.hidden = false;
    wsSub.textContent = `${state.files.length} image${state.files.length > 1 ? 's' : ''} ready. Drag to reorder.`;

    thumbs.innerHTML = '';
    state.files.forEach((f, i) => {
      const el = document.createElement('div');
      el.className = 'thumb-item';
      el.dataset.id = f.id;
      el.innerHTML = `
        <img src="${f.url}" alt="" loading="lazy" />
        <span class="index-badge">${i + 1}</span>
        <button class="remove" data-remove="${f.id}" aria-label="Remove">✕</button>
      `;
      thumbs.appendChild(el);
    });

    if (sortable) sortable.destroy();
    if (window.Sortable) {
      sortable = new Sortable(thumbs, {
        animation: 220,
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        onEnd: () => {
          const ids = [...thumbs.children].map((c) => Number(c.dataset.id));
          state.files.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
          renderThumbs();
        },
      });
    }

    requestAnimationFrame(renderPreview);
  }

  thumbs.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    const id = Number(btn.dataset.remove);
    const removed = state.files.find((f) => f.id === id);
    if (removed) URL.revokeObjectURL(removed.url);
    state.files = state.files.filter((f) => f.id !== id);
    renderThumbs();
  });

  /* ─── Settings bindings ─── */
  $$('.segmented').forEach((group) => {
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg');
      if (!btn) return;
      $$('.seg', group).forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const key = group.dataset.setting;
      const raw = btn.dataset.val;
      state.settings[key] = key === 'perPage' ? Number(raw) : raw;
      renderPreview();
    });
  });

  const marginRange = $('#marginRange');
  const marginVal = $('#marginVal');
  marginRange.addEventListener('input', () => {
    state.settings.margin = Number(marginRange.value);
    marginVal.textContent = marginRange.value + 'pt';
    renderPreview();
  });

  const qualityRange = $('#qualityRange');
  const qualityVal = $('#qualityVal');
  qualityRange.addEventListener('input', () => {
    state.settings.quality = Number(qualityRange.value);
    qualityVal.textContent = qualityRange.value + '%';
    updateSizeEstimate();
  });

  $('#enhanceToggle').addEventListener('change', (e) => {
    state.settings.enhance = e.target.checked;
    renderPreview();
  });

  /* ─── Size estimate ─── */
  function updateSizeEstimate() {
    const total = state.files.reduce((s, f) => s + f.file.size, 0);
    const factor = state.settings.quality / 100;
    const est = total * factor;
    const fmt = est > 1024 * 1024 ? (est / 1024 / 1024).toFixed(1) + ' MB' : Math.round(est / 1024) + ' KB';
    $('#sizeEstimate').textContent = `≈ ${fmt}`;
  }

  /* ─── Preview rendering (Canvas mock) ─── */
  let previewRAF;
  function renderPreview() {
    cancelAnimationFrame(previewRAF);
    previewRAF = requestAnimationFrame(async () => {
      if (!state.files.length) { previewFrame.innerHTML = ''; return; }
      const [pw, ph] = getPageDims();
      const scale = 0.6;
      const canvas = document.createElement('canvas');
      canvas.width = pw * scale;
      canvas.height = ph * scale;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-2').trim() || '#0b0b10';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Place first image as a preview
      const first = state.files[0];
      try {
        const img = await loadImage(first.url);
        const margin = state.settings.margin * scale;
        const availW = canvas.width - margin * 2;
        const availH = canvas.height - margin * 2;
        const ratio = Math.min(availW / img.width, availH / img.height);
        const dw = img.width * ratio;
        const dh = img.height * ratio;
        const dx = (canvas.width - dw) / 2;
        const dy = (canvas.height - dh) / 2;

        if (state.settings.enhance) ctx.filter = 'grayscale(1) contrast(1.15) brightness(1.05)';
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.filter = 'none';
      } catch {}

      // Page 1 label
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = `${Math.max(10, 12 * scale)}px Inter, sans-serif`;
      ctx.fillText(`Page 1 / ${Math.ceil(state.files.length / state.settings.perPage)}`, margin, canvas.height - margin / 2);

      previewFrame.innerHTML = '';
      previewFrame.appendChild(canvas);
      updateSizeEstimate();
    });
  }

  function getPageDims() {
    const key = state.settings.pageSize;
    let [w, h] = PAGE_SIZES[key] || PAGE_SIZES.a4;
    if (state.settings.orientation === 'landscape') [w, h] = [h, w];
    return [w, h];
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  /* ─── Export PDF ─── */
  $('#exportBtn').addEventListener('click', async () => {
    if (!state.files.length) { showToast('Add images first.'); return; }
    if (!window.PDFLib) { showToast('PDF library still loading…'); return; }

    const btn = $('#exportBtn');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span>Preparing…</span>`;

    try {
      const { PDFDocument } = PDFLib;
      const pdf = await PDFDocument.create();
      const [pw, ph] = getPageDims();
      const margin = state.settings.margin;
      const perPage = state.settings.perPage;
      const quality = state.settings.quality / 100;

      const grid = perPage === 4 ? [2, 2] : perPage === 2 ? [1, 2] : [1, 1];
      const [cols, rows] = grid;

      for (let i = 0; i < state.files.length; i += perPage) {
        const page = pdf.addPage([pw, ph]);
        const chunk = state.files.slice(i, i + perPage);

        const cellW = (pw - margin * 2) / cols;
        const cellH = (ph - margin * 2) / rows;

        for (let j = 0; j < chunk.length; j++) {
          const f = chunk[j];
          const img = await loadImage(f.url);
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (state.settings.enhance) ctx.filter = 'grayscale(1) contrast(1.15) brightness(1.05)';
          ctx.drawImage(img, 0, 0);
          ctx.filter = 'none';

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          const bytes = dataURLtoBytes(dataUrl);
          const embedded = await pdf.embedJpg(bytes);

          const col = j % cols;
          const row = Math.floor(j / cols);
          const cellX = margin + col * cellW;
          const cellY = ph - margin - (row + 1) * cellH;

          const ratio = Math.min(cellW / img.width, cellH / img.height);
          const dw = img.width * ratio;
          const dh = img.height * ratio;
          const dx = cellX + (cellW - dw) / 2;
          const dy = cellY + (cellH - dh) / 2;

          page.drawImage(embedded, { x: dx, y: dy, width: dw, height: dh });
        }
      }

      const pdfBytes = await pdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logicking-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);

      showToast('PDF exported ✓');
      if (window.gsap) {
        gsap.fromTo(previewFrame, { scale: 1 }, { scale: 1.02, yoyo: true, repeat: 1, duration: 0.2, ease: 'power2.inOut' });
      }
    } catch (err) {
      console.error(err);
      showToast('Export failed. Try fewer or smaller images.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  });

  function dataURLtoBytes(dataUrl) {
    const base64 = dataUrl.split(',')[1];
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  /* ─── Keyboard: Escape closes workspace ─── */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !workspace.hidden) closeWorkspace();
  });

  /* ─── Prevent iOS overscroll bounce on workspace ─── */
  workspace.addEventListener('touchmove', (e) => {
    if (e.target === workspace) e.preventDefault();
  }, { passive: false });
})();