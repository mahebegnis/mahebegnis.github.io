/* Mahé Begnis, portfolio : mouvement (GSAP 3.15 + ScrollTrigger + Lenis 1.3.26, hébergés sur le site).
   Sans ces bibliothèques ou en « moins d'animations », la page reste complète et statique :
   les états cachés ne sont posés que par ce script ou sous la classe .anim (avec repli CSS). */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fin = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const pret = Boolean(window.gsap && window.ScrollTrigger) && !reduit;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  let lenis = null;
  let allerA = null;          // vitrine épinglée : index de projet → défilement
  const DIAPOS = $$('.diapo');
  const SAUTS = { production: 0, recherche: 4 };

  /* ---------- barre : masquée en descendant, rappelée en remontant ---------- */
  const barre = $('.barre');
  let dernierY = scrollY, image = 0;
  function majBarre() {
    image = 0;
    const y = scrollY, d = y - dernierY;
    if (Math.abs(d) < 8) return;
    barre.classList.toggle('cachee', d > 0 && y > 160 && !barre.contains(document.activeElement));
    dernierY = y;
  }
  addEventListener('scroll', () => { if (!image) image = requestAnimationFrame(majBarre); }, { passive: true });
  barre.addEventListener('focusin', () => barre.classList.remove('cachee'));

  /* ---------- ancres : Lenis et vitrine épinglée ; le focus suit, comme une ancre native ---------- */
  function indexDe(id) {
    if (id in SAUTS) return SAUTS[id];
    const i = DIAPOS.findIndex((d) => d.id === id);
    return i < 0 ? null : i;
  }
  function focaliser(el) {
    if (!el.matches('a, button, summary, input, [tabindex]')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }
  // le focus est déplacé à la FIN du défilement (avant, la diapositive visée est encore inerte) ;
  // pas au chargement d'un lien direct, comme une ancre native
  function rejoindre(id, immediat = false, avecFocus = true) {
    const cible = document.getElementById(id);
    if (!cible) return false;
    const i = indexDe(id);
    const fini = () => { if (avecFocus) focaliser(i !== null && DIAPOS[i] ? DIAPOS[i] : cible); };
    if (allerA && i !== null) allerA(i, immediat, fini);
    // position calculée ici en pixels : passé en élément, Lenis se trompe pendant l'épinglage (mesuré : 860 px de trop)
    else if (lenis) lenis.scrollTo(id === 'haut' ? 0 : cible.getBoundingClientRect().top + scrollY, { duration: immediat ? 0 : 1.4, immediate: immediat, onComplete: fini });
    else return false;
    return true;
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    if (rejoindre(id)) { e.preventDefault(); history.replaceState(null, '', '#' + id); }
  });

  /* ---------- panneau de détail (vitrine épinglée) ---------- */
  const panneau = $('#panneau');
  function ouvrirPanneau(diapo) {
    $('#panneau-titre').textContent = $('h3', diapo).textContent.trim();
    $('.panneau-corps', panneau).replaceChildren($('.detail-corps', diapo).cloneNode(true));
    panneau.showModal();
    lenis?.stop();
  }
  panneau.addEventListener('close', () => lenis?.start());
  panneau.addEventListener('click', (e) => { if (e.target === panneau || e.target.closest('.fermer')) panneau.close(); });
  addEventListener('beforeprint', () => $$('details').forEach((d) => { d.open = true; }));

  if (!pret) { root.classList.add('statique'); return; }
  root.classList.add('motion');

  /* ==========================================================================
     Mouvement
     ========================================================================== */
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const mm = gsap.matchMedia();

  /* ---------- compteurs : le texte final est dans le HTML, le script compte jusqu'à lui ---------- */
  const NOMBRE = /^(\d+)(?:,(\d+))?(\D*)$/;
  const comptes = new WeakSet();
  function compter(el) {
    if (comptes.has(el)) return;
    const fin_ = el.textContent.trim(), m = fin_.match(NOMBRE);
    comptes.add(el);
    if (!m) return;
    const dec = m[2] ? m[2].length : 0, cible = parseFloat(m[1] + '.' + (m[2] || '0')), suf = m[3];
    const o = { v: 0 };
    gsap.to(o, { v: cible, duration: 1.3, ease: 'power3.out',
      onUpdate: () => { el.textContent = o.v.toFixed(dec).replace('.', ',') + suf; },
      onComplete: () => { el.textContent = fin_; } });
  }

  /* ---------- décor : chaque forme dérive à sa profondeur ; celle du projet affiché s'intensifie ---------- */
  const formes = $$('.decor-el');
  formes.forEach((el) => {
    const prof = parseFloat(el.dataset.prof) || 0.5;
    gsap.fromTo(el, { y: () => innerHeight * 0.12 * prof, rotation: 0 }, {
      y: () => -innerHeight * 0.6 * prof, rotation: parseFloat(el.dataset.rot) || 0, ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.8, invalidateOnRefresh: true } });
  });
  function eclairer(projet) {
    formes.forEach((el) => gsap.to(el, { opacity: !projet ? 0.07 : el.dataset.projet === projet ? 0.2 : 0.035,
      duration: 0.9, ease: 'power2.out', overwrite: 'auto' }));
  }
  if (fin) {
    const suivis = formes.map((el) => ({ p: parseFloat(el.dataset.prof) || 0.5,
      x: gsap.quickTo(el.firstElementChild, 'x', { duration: 1.6, ease: 'power3' }),
      y: gsap.quickTo(el.firstElementChild, 'y', { duration: 1.6, ease: 'power3' }) }));
    addEventListener('pointermove', (e) => {
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      suivis.forEach((s) => { s.x(nx * -46 * s.p); s.y(ny * -32 * s.p); });
    }, { passive: true });
  }

  /* ---------- hero : le nom se lève, les cartes se posent, puis tout s'écarte au défilement ---------- */
  const hero = $('.hero'), cartes = $$('.carte');
  gsap.timeline({ delay: 0.15 })
    .fromTo('.hero .ligne-in', { y: 0, yPercent: 112 }, { yPercent: 0, duration: 1.25, ease: 'expo.out', stagger: 0.12 })
    .fromTo(cartes, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 1.2, ease: 'expo.out', stagger: { each: 0.09, from: 'center' } }, 0.35)
    .fromTo('.hero [data-fondu]', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.08 }, 0.5)
    .add(() => $$('.carte .chiffre').forEach(compter), 0.55);
  mm.add('(min-width: 1200px)', () => {
    const sortie = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true } })
      .to('.nom .ligne-in', { xPercent: -6, ease: 'none' }, 0)
      .to('.sous .ligne-in', { xPercent: 5, ease: 'none' }, 0)
      .to('.hero-pied, .lieu', { y: -50, opacity: 0, ease: 'none' }, 0);
    cartes.forEach((c) => {
      const p = parseFloat(c.dataset.prof) || 1, d = parseFloat(c.dataset.dir) || 1;
      sortie.to(c, { x: () => d * innerWidth * 0.06 * p, y: () => -innerHeight * 0.2 * p, rotation: d * 7 * p, ease: 'none' }, 0);
    });
    if (!fin) return;
    const suivis = cartes.map((c) => ({ p: parseFloat(c.dataset.prof) || 1,
      x: gsap.quickTo($('.carte-in', c), 'x', { duration: 1.2, ease: 'power3' }),
      y: gsap.quickTo($('.carte-in', c), 'y', { duration: 1.2, ease: 'power3' }) }));
    const nomX = gsap.quickTo('.nom', 'x', { duration: 1.4, ease: 'power3' });
    const nomY = gsap.quickTo('.nom', 'y', { duration: 1.4, ease: 'power3' });
    const bouger = (nx, ny) => { suivis.forEach((s) => { s.x(nx * 36 * s.p); s.y(ny * 24 * s.p); }); nomX(nx * -10); nomY(ny * -6); };
    const surMouvement = (e) => bouger(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5);
    const surSortie = () => bouger(0, 0);
    hero.addEventListener('pointermove', surMouvement);
    hero.addEventListener('pointerleave', surSortie);
    return () => { hero.removeEventListener('pointermove', surMouvement); hero.removeEventListener('pointerleave', surSortie); };
  });

  /* ---------- bandeau : défile en continu, accélère et s'inverse avec le défilement ---------- */
  {
    const piste = $('.piste'), groupe = $('.groupe', piste), poser = gsap.quickSetter(piste, 'x', 'px');
    let largeur = groupe.offsetWidth, x = 0, sens = 1, actif = false;
    ScrollTrigger.create({ trigger: '.bandeau', start: 'top bottom', end: 'bottom top',
      onToggle: (s) => { actif = s.isActive; }, onRefresh: () => { largeur = groupe.offsetWidth; } });
    gsap.ticker.add((t, dt) => {
      if (!actif || !largeur) return;
      const v = lenis ? lenis.velocity : 0;
      if (Math.abs(v) > 0.5) sens = Math.sign(v);
      x = gsap.utils.wrap(-largeur, 0, x - (60 + Math.min(Math.abs(v) * 20, 1200)) * sens * (dt / 1000));
      poser(x);
    });
  }

  /* ---------- vitrine : épinglée sur grand écran, empilée ailleurs ---------- */
  {
    const section = $('.projets'), vitrine = $('.vitrine'), liens = $$('.vitrine-nav a');
    const compte = $('.compte b'), progres = $('.progres i'), ambs = $$('.amb'), dernier = DIAPOS.length - 1;
    const q = (d, s) => d.querySelectorAll(s);
    let actif = -1, epingleActif = false;

    function activer(i, epingle) {
      if (i === actif) return;
      actif = i;
      DIAPOS.forEach((d, k) => { d.classList.toggle('est-active', k === i); if (epingle) d.inert = k !== i; });
      liens.forEach((a, k) => a.setAttribute('aria-current', String(k === i)));
      compte.textContent = String(i + 1);
      if (epingleActif) eclairer(DIAPOS[i].dataset.projet);
      q(DIAPOS[i], '.met .chiffre').forEach(compter);
    }

    gsap.fromTo('.amb-projets', { opacity: 0 }, { opacity: 1, ease: 'none',
      scrollTrigger: { trigger: section, start: 'top 75%', end: 'top 10%', scrub: true } });

    // ouvrir le détail : panneau en mode épinglé, dépliage natif sinon
    section.addEventListener('click', (e) => {
      const declencheur = e.target.closest('.detail summary, .visuel');
      if (!declencheur) return;
      const diapo = declencheur.closest('.diapo');
      if (section.classList.contains('est-epinglee')) { e.preventDefault(); ouvrirPanneau(diapo); }
      else if (declencheur.matches('.visuel')) { $('.detail', diapo).open = true; }
    });

    function epingler() {
      section.classList.add('est-epinglee');
      const DEBUT = 0.14, TRANS = 0.72, total = dernier + 0.4;
      const tl = gsap.timeline({ defaults: { ease: 'none' } });
      DIAPOS.forEach((d, i) => {
        gsap.set(d, { zIndex: i + 1 });
        if (!i) return;
        gsap.set(q(d, '.masque-in'), { yPercent: 120 });
        gsap.set(q(d, '[data-diapo]'), { autoAlpha: 0, y: 30 });
        gsap.set(q(d, '.masque-vis'), { yPercent: 101 });
        gsap.set(q(d, '.visuel'), { yPercent: -101, scale: 1.15 });
        gsap.set(q(d, '.flot'), { autoAlpha: 0 });
      });
      gsap.set(ambs, { opacity: (i) => (i === 0 ? 1 : 0) });
      for (let i = 0; i < dernier; i++) {
        const de = DIAPOS[i], vers = DIAPOS[i + 1], t = i + DEBUT;
        tl.to(q(de, '.masque-in'), { yPercent: -120, duration: TRANS * 0.5, ease: 'power2.in' }, t)
          .to(q(de, '[data-diapo]'), { autoAlpha: 0, y: -24, duration: TRANS * 0.42, ease: 'power2.in', stagger: 0.02 }, t)
          .to(q(de, '.flot'), { autoAlpha: 0, duration: TRANS * 0.5 }, t)
          .to(q(de, '.cadre-vis'), { scale: 0.9, duration: TRANS, ease: 'power2.inOut' }, t)
          .to(q(de, '.cadre-vis'), { autoAlpha: 0, duration: TRANS * 0.25 }, t + TRANS * 0.75)
          .to(q(vers, '.masque-vis'), { yPercent: 0, duration: TRANS, ease: 'power3.inOut' }, t)
          .to(q(vers, '.visuel'), { yPercent: 0, scale: 1, duration: TRANS, ease: 'power3.inOut' }, t)
          .to(q(vers, '.flot'), { autoAlpha: 1, duration: TRANS * 0.5 }, t + TRANS * 0.4)
          .to(q(vers, '.masque-in'), { yPercent: 0, duration: TRANS * 0.55, ease: 'power3.out' }, t + TRANS * 0.42)
          .to(q(vers, '[data-diapo]'), { autoAlpha: 1, y: 0, duration: TRANS * 0.5, ease: 'power3.out', stagger: 0.03 }, t + TRANS * 0.5)
          .to(ambs[i], { opacity: 0, duration: TRANS }, t)
          .to(ambs[i + 1], { opacity: 1, duration: TRANS }, t);
      }
      // parallaxe : chaque couche traverse la scène à sa vitesse, de l'entrée à la sortie de sa diapositive
      const couche = (cibles, i, ampleur) => {
        const a = i - 1 + DEBUT, b = i + DEBUT + TRANS, s = Math.max(0, a), e = Math.min(total, b);
        const a_ = (t) => ampleur * (1 - (2 * (t - a)) / (b - a));
        tl.fromTo(cibles, { y: a_(s) }, { y: a_(e), duration: e - s, ease: 'none' }, s);
      };
      DIAPOS.forEach((d, i) => {
        couche(q(d, '.diapo-visuel'), i, 24);
        q(d, '.flot').forEach((f) => couche(f, i, 16 * (parseFloat(f.dataset.vitesse) || 1)));
      });
      tl.set({}, {}, total);

      const st = ScrollTrigger.create({
        trigger: vitrine, start: 'top top', end: () => `+=${Math.round(innerHeight * 0.9 * total)}`,
        pin: true, scrub: 0.6, animation: tl, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 1,
        snap: { snapTo: DIAPOS.map((_, i) => i / total).concat(1), directional: true, inertia: false,
                duration: { min: 0.35, max: 0.9 }, delay: 0.12, ease: 'power2.inOut' },
        onUpdate: (s) => { progres.style.transform = `scaleX(${s.progress.toFixed(4)})`; activer(Math.min(dernier, Math.round(s.progress * total)), true); },
        onToggle: (s) => { epingleActif = s.isActive; eclairer(s.isActive ? DIAPOS[Math.max(actif, 0)].dataset.projet : null); },
      });
      activer(0, true);
      allerA = (i, immediat, fini) => {
        const y = st.start + (st.end - st.start) * (i / total);
        if (lenis) lenis.scrollTo(y, { duration: immediat ? 0 : 1.2, immediate: immediat, onComplete: fini });
        else { scrollTo(0, y); fini?.(); }
      };
      return () => {
        section.classList.remove('est-epinglee');
        DIAPOS.forEach((d) => { d.inert = false; d.classList.remove('est-active'); });
        allerA = null; actif = -1; epingleActif = false; eclairer(null);
      };
    }

    function empiler() {
      gsap.set(ambs, { opacity: (i) => (i === 0 ? 1 : 0) });
      DIAPOS.forEach((d, i) => {
        const texte = $('.diapo-texte', d);
        gsap.fromTo(q(d, '.visuel'), { yPercent: -4, scale: 1.06 }, { yPercent: 4, scale: 1.06, ease: 'none',
          scrollTrigger: { trigger: $('.cadre-vis', d), start: 'top bottom', end: 'bottom top', scrub: true } });
        gsap.from(q(d, '.masque-in'), { yPercent: 120, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: texte, start: 'top 88%', once: true } });
        gsap.from(q(d, '[data-diapo]'), { autoAlpha: 0, y: 26, duration: 1, ease: 'power3.out', stagger: 0.06,
          scrollTrigger: { trigger: texte, start: 'top 86%', once: true } });
        ScrollTrigger.create({ trigger: d, start: 'top 55%', end: 'bottom 45%', onToggle: (s) => {
          if (!s.isActive) return;
          activer(i, false);
          gsap.to(ambs, { opacity: (j) => (j === i ? 1 : 0), duration: 0.9, overwrite: true });
        } });
      });
      return () => { actif = -1; DIAPOS.forEach((d) => d.classList.remove('est-active')); };
    }

    mm.add({ epingle: '(min-width: 1000px) and (min-height: 720px)', empile: '(max-width: 999px), (max-height: 719px)' },
      (ctx) => (ctx.conditions.epingle ? epingler() : empiler()));

    gsap.fromTo('.amb-projets', { opacity: 1 }, { immediateRender: false, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '#realisations', start: 'top 95%', end: 'top 35%', scrub: true } });
  }

  /* ---------- autres réalisations : aperçu dessiné qui suit le curseur ---------- */
  if (fin) {
    const liste = $('.index-liste'), apercu = $('.apercu'), piste = $('.apercu-piste', apercu), lignes = $$('.index-ligne');
    gsap.set(apercu, { xPercent: -50, yPercent: -50, scale: 0.6 });
    const xA = gsap.quickTo(apercu, 'x', { duration: 0.65, ease: 'power3' });
    const yA = gsap.quickTo(apercu, 'y', { duration: 0.65, ease: 'power3' });
    const rA = gsap.quickTo(apercu, 'rotation', { duration: 0.9, ease: 'power3' });
    const poser = gsap.delayedCall(0.12, () => rA(0)).pause();
    let dernierX = 0;
    liste.addEventListener('pointerenter', (e) => {
      gsap.set(apercu, { x: e.clientX, y: e.clientY }); dernierX = e.clientX;
      gsap.to(apercu, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
    });
    liste.addEventListener('pointerleave', () => gsap.to(apercu, { autoAlpha: 0, scale: 0.6, duration: 0.4, ease: 'power3.in', overwrite: 'auto' }));
    liste.addEventListener('pointermove', (e) => {
      xA(e.clientX); yA(e.clientY);
      rA(gsap.utils.clamp(-8, 8, (e.clientX - dernierX) * 0.5)); dernierX = e.clientX; poser.restart(true);
    });
    lignes.forEach((l, i) => l.addEventListener('pointerenter', () =>
      gsap.to(piste, { yPercent: -(100 / lignes.length) * i, duration: 0.75, ease: 'expo.out', overwrite: true })));
  }

  /* ---------- manifeste : les mots s'allument au fil du défilement ---------- */
  $$('[data-mots]').forEach((p) => {
    const mots = p.textContent.replace(/\s+/g, ' ').trim().split(' ');
    const frag = document.createDocumentFragment();
    mots.forEach((m, i) => { if (i) frag.append(' '); const s = document.createElement('span'); s.className = 'mot'; s.textContent = m; frag.append(s); });
    p.replaceChildren(frag);
    gsap.fromTo(q2(p), { opacity: 0.16 }, { opacity: 1, ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: p, start: 'top 82%', end: 'bottom 55%', scrub: true } });
  });
  function q2(p) { return p.querySelectorAll('.mot'); }

  /* ---------- révélations ---------- */
  $$('[data-revele]').forEach((el) => gsap.from(el, { autoAlpha: 0, y: 36, duration: 1.1, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));
  // seuls les blocs encore sous l'écran sont cachés ; un saut par ancre qui les dépasse les révèle aussi
  const aReveler = $$('.reg > div, .par li, .index-ligne, .cl li').filter((el) => el.getBoundingClientRect().top > innerHeight);
  gsap.set(aReveler, { autoAlpha: 0, y: 26 });
  const reveler = (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.06, overwrite: true });
  ScrollTrigger.batch(aReveler, { start: 'top 92%', onEnter: reveler, onLeave: reveler, onEnterBack: reveler });
  $$('[data-lignes]').forEach((b) => gsap.from(b.querySelectorAll('.ligne-in'), { yPercent: 112, duration: 1.25, ease: 'expo.out', stagger: 0.1,
    scrollTrigger: { trigger: b, start: 'top 85%', once: true } }));

  /* ---------- boutons magnétiques ---------- */
  if (fin) $$('[data-aimant]').forEach((el) => {
    const force = parseFloat(el.dataset.aimant) || 0.3, dedans = $('[data-aimant-in]', el);
    const e_ = { duration: 0.9, ease: 'elastic.out(1, .45)' };
    const xT = gsap.quickTo(el, 'x', e_), yT = gsap.quickTo(el, 'y', e_);
    const xI = dedans && gsap.quickTo(dedans, 'x', e_), yI = dedans && gsap.quickTo(dedans, 'y', e_);
    let r = null;
    el.addEventListener('pointerenter', () => { r = el.getBoundingClientRect(); });
    el.addEventListener('pointermove', (e) => {
      if (!r) return;
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      xT(dx * force); yT(dy * force); xI?.(dx * force * 0.45); yI?.(dy * force * 0.45);
    });
    el.addEventListener('pointerleave', () => { r = null; xT(0); yT(0); xI?.(0); yI?.(0); });
  });

  /* ---------- pastille qui suit le pointeur sur les éléments cliquables illustrés ---------- */
  if (fin) {
    const pastille = $('.pastille'), libelle = $('span', pastille);
    gsap.set(pastille, { xPercent: -50, yPercent: -50, scale: 0 });
    const xP = gsap.quickTo(pastille, 'x', { duration: 0.45, ease: 'power3' }), yP = gsap.quickTo(pastille, 'y', { duration: 0.45, ease: 'power3' });
    $$('[data-pastille]').forEach((z) => {
      z.addEventListener('pointerenter', (e) => {
        libelle.textContent = z.dataset.pastille;
        gsap.set(pastille, { x: e.clientX, y: e.clientY });
        gsap.to(pastille, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(1.7)', overwrite: 'auto' });
      });
      z.addEventListener('pointermove', (e) => { xP(e.clientX); yP(e.clientY); });
      z.addEventListener('pointerleave', () => gsap.to(pastille, { autoAlpha: 0, scale: 0, duration: 0.3, ease: 'power2.in', overwrite: 'auto' }));
    });
  }

  /* ---------- démarrage ---------- */
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => {
    ScrollTrigger.refresh();
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) requestAnimationFrame(() => rejoindre(id, true, false));
  });
})();
