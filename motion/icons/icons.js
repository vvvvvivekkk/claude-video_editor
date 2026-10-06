/* motion/icons/icons.js — animated line-icon library for HyperFrames overlays.
 *
 * One consistent style: rounded line-art, 100x100 viewBox, stroke = currentColor.
 * Icons DRAW themselves in (stroke animation) and their dots/nodes pop in one
 * by one — so "connections" builds a network, "clients" brings people in, etc.
 *
 * Usage inside a HyperFrames composition (index.html):
 *   <script src="icons/icons.js"></script>
 *   <div class="clip" data-start="14.2" data-duration="2">
 *     <div id="ic-conn" class="icon-wrap"></div>
 *   </div>
 *   ...
 *   Icons.mount('#ic-conn', 'connections', { size: 220, color: '#FFB000', label: 'CONNECTIONS' });
 *   Icons.in(tl, '#ic-conn', 14.2);          // draw-in on the word
 *   Icons.out(tl, '#ic-conn', 15.9);         // optional exit
 *
 * Pick an icon by meaning with Icons.forWord('clients') -> 'clients'.
 * Run `Icons.list()` for every name. Add new icons to ICONS below in the same style.
 */
(function () {
  const S = 'fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"';
  // class="d" = stroked path that draws in; class="n" = node/dot that pops in.
  const ICONS = {
    connections: `
      <path class="d" d="M50 22 L22 50 M50 22 L78 50 M22 50 L50 78 M78 50 L50 78 M22 50 L78 50"/>
      <circle class="n" cx="50" cy="22" r="8" fill="currentColor"/>
      <circle class="n" cx="22" cy="50" r="8" fill="currentColor"/>
      <circle class="n" cx="78" cy="50" r="8" fill="currentColor"/>
      <circle class="n" cx="50" cy="78" r="8" fill="currentColor"/>`,
    clients: `
      <circle class="d" cx="50" cy="36" r="11"/>
      <path class="d" d="M30 74 C30 60 39 53 50 53 C61 53 70 60 70 74"/>
      <circle class="d" cx="22" cy="44" r="8"/>
      <path class="d" d="M8 74 C8 64 14 59 22 59 C26 59 29 60 31 62"/>
      <circle class="d" cx="78" cy="44" r="8"/>
      <path class="d" d="M92 74 C92 64 86 59 78 59 C74 59 71 60 69 62"/>`,
    opportunities: `
      <path class="d" d="M30 84 L30 20 L64 14 L64 90 L30 84"/>
      <path class="d" d="M30 84 L18 84 M64 90 L82 90"/>
      <circle class="n" cx="56" cy="54" r="3.5" fill="currentColor"/>
      <path class="d" d="M74 30 L90 22 M76 46 L94 46 M74 62 L90 70"/>`,
    growth: `
      <path class="d" d="M14 86 L90 86"/>
      <path class="d" d="M24 86 L24 66 M42 86 L42 54 M60 86 L60 42 M78 86 L78 30"/>
      <path class="d" d="M18 56 L40 38 L56 46 L84 16"/>
      <path class="d" d="M70 16 L84 16 L84 30"/>`,
    portfolio: `
      <rect class="d" x="14" y="14" width="32" height="32" rx="6"/>
      <rect class="d" x="54" y="14" width="32" height="32" rx="6"/>
      <rect class="d" x="14" y="54" width="32" height="32" rx="6"/>
      <rect class="d" x="54" y="54" width="32" height="32" rx="6"/>`,
    work: `
      <rect class="d" x="12" y="32" width="76" height="50" rx="8"/>
      <path class="d" d="M38 32 L38 22 Q38 18 42 18 L58 18 Q62 18 62 22 L62 32"/>
      <path class="d" d="M12 54 L88 54"/>
      <rect class="n" x="44" y="49" width="12" height="10" rx="2" fill="currentColor"/>`,
    dm: `
      <path class="d" d="M18 22 L74 22 Q84 22 84 32 L84 58 Q84 68 74 68 L42 68 L26 82 L28 68 L18 68 Q8 68 8 58 L8 32 Q8 22 18 22"/>
      <circle class="n" cx="30" cy="45" r="4.5" fill="currentColor"/>
      <circle class="n" cx="46" cy="45" r="4.5" fill="currentColor"/>
      <circle class="n" cx="62" cy="45" r="4.5" fill="currentColor"/>
      <circle class="n badge" cx="84" cy="22" r="10" fill="#FF4D4D" stroke="none"/>`,
    resume: `
      <path class="d" d="M24 10 L62 10 L80 28 L80 90 L24 90 Z"/>
      <path class="d" d="M62 10 L62 28 L80 28"/>
      <path class="d" d="M36 46 L68 46 M36 58 L68 58 M36 70 L56 70"/>
      <circle class="n" cx="40" cy="30" r="6" fill="currentColor"/>`,
    check: `
      <circle class="d" cx="50" cy="50" r="38"/>
      <path class="d" d="M32 51 L45 64 L70 37"/>`,
    money: `
      <circle class="d" cx="50" cy="50" r="38"/>
      <path class="d" d="M36 32 L66 32 M36 44 L66 44 M44 32 Q62 32 62 44 Q62 56 44 56 L38 56 L62 74"/>`,
    code: `
      <path class="d" d="M34 28 L12 50 L34 72"/>
      <path class="d" d="M66 28 L88 50 L66 72"/>
      <path class="d" d="M56 18 L44 82"/>`,
    ai: `
      <path class="d" d="M50 10 C53 34 66 47 90 50 C66 53 53 66 50 90 C47 66 34 53 10 50 C34 47 47 34 50 10 Z"/>
      <path class="d" d="M80 14 C81 20 84 23 90 24 C84 25 81 28 80 34 C79 28 76 25 70 24 C76 23 79 20 80 14 Z"/>`,
    rocket: `
      <path class="d" d="M50 10 C66 22 72 40 66 66 L34 66 C28 40 34 22 50 10 Z"/>
      <circle class="d" cx="50" cy="38" r="8"/>
      <path class="d" d="M34 56 L20 70 L34 70 M66 56 L80 70 L66 70"/>
      <path class="d" d="M42 76 L42 88 M50 76 L50 94 M58 76 L58 88"/>`,
    idea: `
      <path class="d" d="M36 66 C24 58 20 46 22 36 C26 20 38 12 50 12 C62 12 74 20 78 36 C80 46 76 58 64 66 L64 74 L36 74 Z"/>
      <path class="d" d="M38 84 L62 84 M42 92 L58 92"/>
      <path class="d" d="M50 74 L50 50 L42 42 M50 50 L58 42"/>`,
    time: `
      <circle class="d" cx="50" cy="54" r="34"/>
      <path class="d" d="M50 54 L50 34 M50 54 L64 62"/>
      <path class="d" d="M42 12 L58 12 M50 12 L50 20"/>`,
    target: `
      <circle class="d" cx="46" cy="54" r="34"/>
      <circle class="d" cx="46" cy="54" r="20"/>
      <circle class="n" cx="46" cy="54" r="6" fill="currentColor"/>
      <path class="d" d="M46 54 L84 16 M72 16 L84 16 L84 28"/>`,
    link: `
      <path class="d" d="M44 56 C38 50 38 42 44 36 L58 22 C64 16 74 16 80 22 C86 28 86 38 80 44 L72 52"/>
      <path class="d" d="M56 44 C62 50 62 58 56 64 L42 78 C36 84 26 84 20 78 C14 72 14 62 20 56 L28 48"/>`,
    mail: `
      <rect class="d" x="10" y="22" width="80" height="56" rx="8"/>
      <path class="d" d="M12 26 L50 54 L88 26"/>`,
    star: `
      <path class="d" d="M50 10 L61 37 L90 39 L67 58 L75 87 L50 71 L25 87 L33 58 L10 39 L39 37 Z"/>`,
    video: `
      <rect class="d" x="8" y="26" width="60" height="48" rx="8"/>
      <path class="d" d="M68 44 L92 30 L92 70 L68 56"/>
      <circle class="n" cx="22" cy="38" r="4" fill="currentColor"/>`,
    chat: `
      <path class="d" d="M14 20 L66 20 Q76 20 76 30 L76 50 Q76 60 66 60 L36 60 L22 72 L24 60 L14 60 Q4 60 4 50 L4 30 Q4 20 14 20"/>
      <path class="d" d="M84 36 Q96 36 96 46 L96 62 Q96 72 86 72 L84 72 L86 84 L72 72 L54 72"/>`,
    learn: `
      <path class="d" d="M50 20 L94 38 L50 56 L6 38 Z"/>
      <path class="d" d="M24 46 L24 66 C24 74 76 74 76 66 L76 46"/>
      <path class="d" d="M90 40 L90 64"/>`,
    search: `
      <circle class="d" cx="42" cy="42" r="26"/>
      <path class="d" d="M62 62 L88 88"/>`,
    phone: `
      <rect class="d" x="28" y="8" width="44" height="84" rx="10"/>
      <path class="d" d="M44 80 L56 80"/>`,
    heart: `
      <path class="d" d="M50 84 C20 64 8 48 12 32 C16 18 34 14 50 30 C66 14 84 18 88 32 C92 48 80 64 50 84 Z"/>`,
    fire: `
      <path class="d" d="M50 92 C28 92 18 76 22 60 C26 46 38 40 36 22 C50 30 60 40 58 54 C64 50 66 44 66 38 C78 50 82 64 78 74 C74 86 64 92 50 92 Z"/>`,
    arrow: `
      <path class="d" d="M12 50 L84 50"/>
      <path class="d" d="M64 30 L86 50 L64 70"/>`,
  };

  // Words a speaker might say -> icon. Lowercase, singular or plural both listed.
  const WORDS = {
    connections: 'connections', connection: 'connections', network: 'connections', networking: 'connections', community: 'connections', linkedin: 'connections',
    clients: 'clients', client: 'clients', customers: 'clients', customer: 'clients', people: 'clients', users: 'clients', audience: 'clients', team: 'clients',
    opportunities: 'opportunities', opportunity: 'opportunities', doors: 'opportunities', door: 'opportunities', chance: 'opportunities', offers: 'opportunities', offer: 'opportunities', jobs: 'work', job: 'work', internship: 'work', internships: 'work',
    growth: 'growth', grow: 'growth', results: 'growth', revenue: 'growth', views: 'growth', followers: 'growth', scale: 'growth',
    portfolio: 'portfolio', projects: 'portfolio', project: 'portfolio', website: 'portfolio', work: 'work', career: 'work', business: 'work', agency: 'work',
    dm: 'dm', dms: 'dm', message: 'dm', inbox: 'dm', comment: 'chat', comments: 'chat', chat: 'chat', talk: 'chat',
    resume: 'resume', cv: 'resume', document: 'resume', docs: 'resume',
    real: 'check', proof: 'check', done: 'check', verified: 'check', yes: 'check',
    money: 'money', earn: 'money', earning: 'money', paid: 'money', income: 'money', rupees: 'money', salary: 'money', price: 'money',
    code: 'code', coding: 'code', developer: 'code', build: 'code', built: 'code', programming: 'code',
    ai: 'ai', claude: 'ai', chatgpt: 'ai', automation: 'ai', magic: 'ai',
    launch: 'rocket', ship: 'rocket', shipped: 'rocket', start: 'rocket', startup: 'rocket',
    idea: 'idea', ideas: 'idea', think: 'idea', tip: 'idea',
    time: 'time', fast: 'time', minutes: 'time', hours: 'time', days: 'time',
    goal: 'target', goals: 'target', target: 'target', focus: 'target',
    link: 'link', bio: 'link', url: 'link',
    email: 'mail', mail: 'mail',
    best: 'star', premium: 'star', quality: 'star', skill: 'star', skills: 'star',
    video: 'video', reel: 'video', reels: 'video', youtube: 'video', content: 'video',
    learn: 'learn', learning: 'learn', college: 'learn', students: 'learn', student: 'learn', course: 'learn',
    find: 'search', search: 'search', discover: 'search',
    phone: 'phone', app: 'phone', mobile: 'phone',
    love: 'heart', like: 'heart', likes: 'heart',
    viral: 'fire', trending: 'fire', hot: 'fire',
    next: 'arrow', follow: 'arrow',
  };

  function svg(name, size, color) {
    const body = ICONS[name];
    if (!body) throw new Error(`Icons: unknown icon "${name}". Available: ${Object.keys(ICONS).join(', ')}`);
    return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" style="color:${color};overflow:visible" ${S}>${body}</svg>`;
  }

  const Icons = {
    list: () => Object.keys(ICONS),
    forWord: (w) => WORDS[String(w).toLowerCase().replace(/[^a-z]/g, '')] || null,

    // Build the icon (and optional label) inside a container element.
    mount(sel, name, opts = {}) {
      const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
      const size = opts.size ?? 200;
      const color = opts.color ?? '#FFB000';
      el.innerHTML = svg(name, size, color) + (opts.label
        ? `<div class="icon-label" style="margin-top:${Math.round(size * 0.1)}px;font-family:${opts.font ?? 'Inter, sans-serif'};font-weight:${opts.weight ?? 800};font-size:${opts.labelSize ?? Math.round(size * 0.22)}px;letter-spacing:${opts.tracking ?? '0.04em'};color:${opts.labelColor ?? '#F5F5F5'};text-align:center">${opts.label}</div>`
        : '');
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.alignItems = 'center';
      if (opts.glow !== false) el.querySelector('svg').style.filter = `drop-shadow(0 6px 18px rgba(0,0,0,0.45))`;
      // prepare stroke-draw
      el.querySelectorAll('.d').forEach((p) => {
        const len = Math.ceil(p.getTotalLength ? p.getTotalLength() : 400) + 2;
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
      });
      // Nodes pop by growing their radius (no SVG transforms — those fight GSAP's SVG origin math).
      el.querySelectorAll('.n').forEach((n) => {
        if (n.tagName.toLowerCase() === 'circle') { n.dataset.r = n.getAttribute('r'); n.setAttribute('r', 0); }
        else n.style.opacity = 0;
      });
      el.style.opacity = 0;
      return el;
    },

    // Draw-in on the beat. ~0.7s total; strokes stagger, then nodes pop.
    in(tl, sel, t, opts = {}) {
      const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
      const dur = opts.duration ?? 0.55;
      const paths = el.querySelectorAll('.d');
      const nodes = el.querySelectorAll('.n');
      const label = el.querySelector('.icon-label');
      tl.fromTo(el, { opacity: 0, scale: 0.85, y: 14 }, { opacity: 1, scale: 1, y: 0, duration: 0.18, ease: 'power2.out' }, t);
      tl.to(paths, { strokeDashoffset: 0, duration: dur, ease: 'power2.inOut', stagger: Math.min(0.08, 0.4 / Math.max(paths.length, 1)) }, t);
      const dots = [...nodes].filter((n) => n.tagName.toLowerCase() === 'circle');
      const blocks = [...nodes].filter((n) => n.tagName.toLowerCase() !== 'circle');
      if (dots.length) tl.to(dots, { attr: { r: (i, n) => n.dataset.r }, duration: 0.22, ease: 'back.out(3)', stagger: 0.07 }, t + dur * 0.55);
      if (blocks.length) tl.to(blocks, { opacity: 1, duration: 0.15, stagger: 0.07 }, t + dur * 0.55);
      if (label) tl.fromTo(label, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }, t + 0.15);
      return t + dur + 0.07 * nodes.length;
    },

    // Subtle idle motion while on screen (optional): a gentle 4% breathe.
    hold(tl, sel, from, to) {
      tl.to(sel, { scale: 1.04, duration: Math.max(0.2, (to - from) / 2), yoyo: true, repeat: 1, ease: 'sine.inOut' }, from);
    },

    out(tl, sel, t) {
      tl.to(sel, { opacity: 0, scale: 0.92, y: -10, duration: 0.2, ease: 'power1.in' }, t);
    },
  };

  window.Icons = Icons;
})();
