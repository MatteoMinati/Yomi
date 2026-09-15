// app.js — router hash-based e viste di Yomi Web.

import * as api from "./api.js";
import * as store from "./store.js?v=3";
import * as sync from "./sync.js";
import { enter, press, stagger, success } from "./motion.js";

const app = document.getElementById("app");
const tabbar = document.getElementById("tabbar");

// --- Utility DOM ---------------------------------------------------------

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v !== null && v !== undefined) {
      node.setAttribute(k, v);
    }
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}

function clear(n) {
  n.replaceChildren();
}

function icon(name) {
  const paths = {
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    vertical: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4v16M16 4v16M5 7l3-3 3 3M13 17l3 3 3-3"/></svg>',
    horizontal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16M4 16h16M7 5 4 8l3 3M17 13l3 3-3 3"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>',
    library: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M8 4v13a3 3 0 0 0 3 3"/></svg>',
  };
  return paths[name] || "";
}

function brand(compact = false) {
  return el("h1", { class: `brand${compact ? " small" : ""}` }, [
    el("span", { class: "brand-mark", "aria-hidden": "true" }, "読"),
    el("span", { class: "brand-word" }, "Yomi"),
  ]);
}

function loadingPanel(label = "Caricamento…") {
  return el("div", { class: "loading-panel", role: "status", "aria-live": "polite" }, [
    el("div", { class: "skeleton-line" }),
    el("p", { class: "loading-label" }, label),
  ]);
}

function skeletonCard() {
  return el("div", { class: "skeleton-card", "aria-hidden": "true" }, [
    el("div", { class: "skeleton-cover" }),
    el("div", { class: "skeleton-text" }),
    el("div", { class: "skeleton-text short" }),
  ]);
}

function skeletonShelf(title) {
  return el("section", { class: "shelf skeleton-shelf", "aria-hidden": "true" }, [
    el("h2", {}, title),
    el("div", { class: "row" }, Array.from({ length: 5 }, skeletonCard)),
  ]);
}

function friendlyError(error) {
  const message = String(error?.message || error || "");
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "Connessione non disponibile. Controlla la rete e riprova.";
  }
  if (/404/.test(message)) return "Questo contenuto non è più disponibile.";
  if (/429/.test(message)) return "Troppe richieste in poco tempo. Riprova tra qualche secondo.";
  if (/5\d\d/.test(message)) return "Il servizio non risponde al momento. Riprova tra poco.";
  return message || "Qualcosa non ha funzionato. Riprova.";
}

function errorBox(message, onRetry) {
  return el("div", { class: "errorbox" }, [
    el("p", { class: "error-title" }, "Non riesco a caricare questo contenuto"),
    el("p", { class: "error-detail" }, friendlyError(message)),
    onRetry ? el("button", { class: "btn", onClick: onRetry }, "Riprova") : null,
  ]);
}

function statusLabel(s) {
  return (
    { ongoing: "In corso", completed: "Completo", hiatus: "In pausa", cancelled: "Cancellato" }[
      s
    ] || null
  );
}

// "Capitolo 091" -> "Cap. 91"; se non c'è un numero riconoscibile, titolo intero.
function chapterShort(title) {
  const m = /cap(?:itolo)?\.?\s*(\d+(?:[.,]\d+)?)/i.exec(title || "");
  return m ? `Cap. ${Number(m[1].replace(",", "."))}` : title;
}

// --- Card ----------------------------------------------------------------

function mangaCard(m) {
  const cover = el("div", { class: "cover" });
  if (m.coverURL) {
    cover.append(
      el("img", { src: m.coverURL, loading: "lazy", alt: m.title, onError: (e) => e.target.remove() })
    );
  } else {
    cover.append(el("div", { class: "cover-ph" }, "Y"));
  }
  const card = el("a", { class: "card", href: `#/manga/${m.id}` }, [
    cover,
    el("span", { class: "card-title" }, m.title),
  ]);
  return card;
}

function carousel(title, items) {
  return el("section", { class: "shelf" }, [
    el("h2", {}, title),
    el("div", { class: "row" }, items.map(mangaCard)),
  ]);
}

function continueShelf(items) {
  return el("section", { class: "shelf continue-shelf" }, [
    el("div", { class: "section-heading" }, [
      el("h2", {}, "Continua a leggere"),
      el("span", { class: "section-note" }, "Il tuo prossimo capitolo"),
    ]),
    el("div", { class: "row" }, items.map((m) => {
      const card = mangaCard(m);
      const last = store.getLastRead(m.id);
      if (last) card.append(el("span", { class: "resume" }, last.label));
      return card;
    })),
  ]);
}

function grid(items) {
  return el("div", { class: "grid" }, items.map(mangaCard));
}

// --- Vista: Home ---------------------------------------------------------

async function viewHome() {
  setActiveTab("home");
  clear(app);
  app.append(
    el("header", { class: "topbar spread" }, [
      brand(),
    ])
  );
  const body = el("div", { class: "page" }, [
    el("div", { class: "home-intro" }, [
      el("h2", {}, "Trova la tua prossima storia."),
    ]),
    skeletonShelf("Popolari"),
    skeletonShelf("Aggiornati di recente"),
  ]);
  app.append(body);
  enter(body, { y: 6, duration: 280 });

  try {
    const { popular, latest } = await api.fetchHome();
    clear(body);
    const inProgress = store.getLibrary().filter((m) => store.getLastRead(m.id));
    if (inProgress.length) body.append(continueShelf(inProgress.slice(0, 8)));
    body.append(
      carousel("Popolari", popular),
      carousel("Aggiornati di recente", latest)
    );
    stagger(body.querySelectorAll(".shelf"), { y: 14, duration: 420 });
  } catch (e) {
    clear(body);
    body.append(errorBox(e.message, viewHome));
  }
}

// --- Vista: Cerca --------------------------------------------------------

const searchState = { query: "" };
let searchTimer = null;

async function viewSearch() {
  setActiveTab("search");
  clear(app);

  const input = el("input", {
    class: "search-input",
    type: "search",
    placeholder: "Cerca un manga…",
    value: searchState.query,
    onInput: (e) => {
      searchState.query = e.target.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(runSearch, 350);
    },
  });

  app.append(
    el("header", { class: "topbar col" }, [
      el("h1", { class: "brand small" }, "Cerca"),
      input,
    ])
  );
  enter(app.querySelector(".topbar"), { y: -8, duration: 260 });

  const results = el("div", { class: "page" });
  app.append(results);

  async function runSearch() {
    const q = searchState.query.trim();
    if (!q) {
      clear(results);
      results.append(el("p", { class: "hint" }, "Digita per cercare tra migliaia di manga."));
      return;
    }
    clear(results);
    results.append(loadingPanel("Cerco manga…"));
    try {
      const { items } = await api.search(q);
      clear(results);
      if (!items.length) {
        results.append(el("div", { class: "empty compact" }, [
          el("div", { class: "empty-ico", html: icon("search") }),
          el("p", {}, "Nessun manga trovato."),
          el("p", { class: "muted" }, "Prova con un titolo più breve o controlla l’ortografia."),
        ]));
      } else {
        results.append(grid(items));
        stagger(results.querySelectorAll(".card"));
      }
    } catch (e) {
      clear(results);
      results.append(errorBox(e.message, runSearch));
    }
  }

  runSearch();
  input.focus();
}

// --- Vista: Dettaglio manga ---------------------------------------------

async function viewDetail(mangaId) {
  clearActiveTab();
  clear(app);
  app.append(backBar("#/home"));
  const body = el("div", { class: "page" }, loadingPanel("Carico il titolo…"));
  app.append(body);

  let manga;
  try {
    manga = await api.fetchManga(mangaId);
  } catch (e) {
    clear(body);
    body.append(errorBox(e.message, () => viewDetail(mangaId)));
    return;
  }

  const saved = store.isSaved(mangaId);
  const saveBtn = el(
    "button",
    { class: `btn save ${saved ? "on" : ""}` },
    saved ? "✓ In libreria" : "+ Aggiungi"
  );
  saveBtn.addEventListener("click", () => {
    const nowSaved = store.toggleSaved(manga);
    saveBtn.classList.toggle("on", nowSaved);
    saveBtn.textContent = nowSaved ? "✓ In libreria" : "+ Aggiungi";
    success(saveBtn);
  });

  // Riprende dal capitolo dopo il più avanzato già letto (compare quando
  // l'elenco capitoli è pronto).
  const continueBtn = el("button", { class: "btn continue", hidden: "" });

  function updateContinue(items) {
    // items: dal più vecchio al più recente
    const read = new Set(store.getReadChapters(mangaId));
    let furthest = -1;
    items.forEach((c, i) => { if (read.has(c.id)) furthest = i; });
    const target = items[furthest + 1];
    // Copia ora: il chiamante inverte `items` sul posto subito dopo.
    const newestFirst = [...items].reverse();
    const total = items.length;
    continueBtn.hidden = false;
    continueBtn.disabled = !target;
    continueBtn.textContent = !target
      ? "✓ Tutto letto"
      : furthest < 0
        ? "▶ Inizia a leggere"
        : `▶ Continua · ${chapterShort(target.displayTitle)}`;
    continueBtn.onclick = target
      ? () => {
          store.setLastRead(mangaId, target, total);
          store.markChaptersAsRead(mangaId, newestFirst, target.id);
          location.hash = `#/read/${target.id}?manga=${mangaId}`;
        }
      : null;
  }

  const meta = [statusLabel(manga.status), manga.year].filter(Boolean).join(" · ");

  clear(body);
  body.append(
    el("div", { class: "detail-head" }, [
      el("div", { class: "cover big" }, [
        manga.coverURLLarge
          ? el("img", { src: manga.coverURLLarge, alt: manga.title })
          : el("div", { class: "cover-ph" }, "Y"),
      ]),
      el("div", { class: "detail-info" }, [
        el("h1", {}, manga.title),
        meta ? el("p", { class: "muted" }, meta) : null,
        manga.tags.length ? el("div", { class: "tags" }, manga.tags.map((t) => el("span", { class: "tag" }, t))) : null,
        el("div", { class: "detail-actions" }, [saveBtn, continueBtn]),
      ]),
    ]),
    manga.description ? el("p", { class: "desc" }, manga.description) : null
  );

  // Sezione capitoli
  const chapWrap = el("div", { class: "chapters" });

  body.append(
    el("div", { class: "chapters-head" }, [el("h2", {}, "Capitoli")]),
    chapWrap
  );

  const lastRead = store.getLastRead(mangaId);

  async function loadChapters() {
    clear(chapWrap);
    chapWrap.append(loadingPanel("Carico i capitoli…"));
    try {
      const { items } = await api.fetchChapters(mangaId);
      clear(chapWrap);
      if (!items.length) {
        chapWrap.append(el("p", { class: "hint" }, "Nessun capitolo disponibile."));
        return;
      }
      updateContinue(items);
      const reversed = items.reverse();
      const totalChapters = items.length;
      for (const ch of reversed) {
        const isRead = store.isChapterRead(mangaId, ch.id);
        chapWrap.append(
          el(
            "a",
            {
              class: `chapter ${isRead ? "read" : ""}`,
              href: `#/read/${ch.id}?manga=${mangaId}`,
              onClick: () => {
                store.setLastRead(mangaId, ch, totalChapters);
                store.markChaptersAsRead(mangaId, reversed, ch.id);
              },
            },
            [
              el("div", { class: "ch-main" }, [
                el("span", { class: "ch-title" }, ch.displayTitle),
              ]),
              isRead ? el("span", { class: "badge" }, "✓ Letto") : el("span", { class: "chev" }, "›"),
            ]
          )
        );
      }
    } catch (e) {
      clear(chapWrap);
      chapWrap.append(errorBox(e.message, loadChapters));
    }
  }

  loadChapters();
}

// --- Vista: Reader -------------------------------------------------------

const readerPrefs = {
  mode: localStorage.getItem("yomi.reader.mode") || "vertical", // vertical | horizontal
};

async function viewReader(chapterId, mangaId) {
  clearActiveTab();
  clear(app);
  document.body.classList.add("reading-mode");

  const back = mangaId ? `#/manga/${mangaId}` : "#/home";
  const counter = el("span", { class: "counter" }, "…");
  // Contatore "Cap. 91 · 3 / 25": il capitolo arriva con l'elenco capitoli.
  let chapLabel = "";
  let pageText = "…";
  function setCounter(text) {
    pageText = text;
    counter.textContent = chapLabel ? `${chapLabel} · ${text}` : text;
  }

  const modeBtn = el("button", {
    class: "icon-btn",
    title: "Cambia modalità di lettura",
    "aria-label": "Cambia modalità di lettura",
  }, el("span", { html: icon(readerPrefs.mode === "vertical" ? "vertical" : "horizontal") }));
  modeBtn.addEventListener("click", () => {
    readerPrefs.mode = readerPrefs.mode === "vertical" ? "horizontal" : "vertical";
    localStorage.setItem("yomi.reader.mode", readerPrefs.mode);
    press(modeBtn);
    render();
  });

  const bar = el("header", { class: "reader-bar" }, [
    el("a", { class: "icon-btn", href: back, "aria-label": "Torna indietro", title: "Torna indietro", html: icon("back") }),
    counter,
    el("div", { class: "reader-actions" }, [modeBtn]),
  ]);
  const stage = el("div", { class: "reader-stage" });
  app.append(bar, stage);

  // Tap sulla pagina: mostra/nasconde le barre (reader-bar in alto + tabbar in
  // basso). In orizzontale i tap-zone laterali servono a navigare, li ignoriamo.
  stage.addEventListener("click", (e) => {
    if (e.target.closest(".tap-zone, .chapter-nav")) return;
    document.body.classList.toggle("chrome-hidden");
  });

  let pages = [];

  // Navigazione capitolo precedente/successivo, mostrata a fine capitolo.
  // L'elenco arriva in parallelo alle pagine; `nav` viene riempito quando pronto.
  const nav = el("div", { class: "chapter-nav" });
  if (mangaId) {
    api.fetchChapters(mangaId).then(({ items }) => {
      const idx = items.findIndex((c) => c.id === chapterId);
      if (idx < 0) return;
      chapLabel = chapterShort(items[idx].displayTitle);
      setCounter(pageText);
      const newestFirst = [...items].reverse();
      const go = (ch) => {
        store.setLastRead(mangaId, ch, items.length);
        store.markChaptersAsRead(mangaId, newestFirst, ch.id);
        location.hash = `#/read/${ch.id}?manga=${mangaId}`;
      };
      const navBtn = (ch, label, cls) =>
        el(
          "button",
          { class: `btn ${cls}`, disabled: ch ? null : "", onClick: () => ch && go(ch) },
          [el("span", { class: "nav-label" }, label), ch ? el("span", { class: "nav-title" }, ch.displayTitle) : null]
        );
      nav.append(
        navBtn(items[idx - 1], "‹ Capitolo precedente", "prev"),
        navBtn(items[idx + 1], "Capitolo successivo ›", "next save on")
      );
    }).catch(() => {});
  }

  async function load() {
    clear(stage);
    stage.append(loadingPanel("Carico le pagine…"));
    try {
      pages = await api.fetchPages(chapterId);
      if (!pages.length) {
        clear(stage);
        stage.append(errorBox("Nessuna pagina disponibile."));
        return;
      }
      render();
    } catch (e) {
      clear(stage);
      stage.append(errorBox(e.message, load));
    }
  }

  function render() {
    clear(stage);
    modeBtn.innerHTML = icon(readerPrefs.mode === "vertical" ? "vertical" : "horizontal");
    if (readerPrefs.mode === "vertical") renderVertical();
    else renderHorizontal();
  }

  function renderVertical() {
    stage.className = "reader-stage vertical";
    pages.forEach((src, i) => {
      const img = el("img", {
        class: "page",
        src,
        loading: "lazy",
        "data-i": i,
        alt: `Pagina ${i + 1}`,
        // Finché non è caricata riserva spazio, così il lazy-load e il
        // contatore restano affidabili (le img a 0px si accavallerebbero).
        onLoad: (e) => e.target.classList.add("loaded"),
      });
      stage.append(img);
    });
    stage.append(nav);
    setCounter(`1 / ${pages.length}`);
    // aggiorna contatore in base allo scroll
    const imgs = [...stage.querySelectorAll("img.page")];
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            const i = Number(en.target.dataset.i);
            setCounter(`${i + 1} / ${pages.length}`);
          }
        }
      },
      { threshold: 0.5 }
    );
    imgs.forEach((im) => io.observe(im));
  }

  function renderHorizontal() {
    stage.className = "reader-stage horizontal";
    let idx = 0;
    const img = el("img", { class: "page", alt: "Pagina" });
    const zoneL = el("button", { class: "tap-zone left", "aria-label": "Precedente" });
    const zoneR = el("button", { class: "tap-zone right", "aria-label": "Successiva" });
    stage.append(zoneL, img, zoneR);

    // idx === pages.length è la schermata di fine capitolo (con la navigazione).
    const last = mangaId ? pages.length : pages.length - 1;
    function show(i) {
      idx = Math.max(0, Math.min(last, i));
      if (idx === pages.length) {
        img.hidden = true;
        stage.append(nav);
        setCounter("Fine");
        return;
      }
      nav.remove();
      img.hidden = false;
      img.src = pages[idx];
      setCounter(`${idx + 1} / ${pages.length}`);
    }
    zoneL.addEventListener("click", () => show(idx - 1));
    zoneR.addEventListener("click", () => show(idx + 1));
    const onKey = (e) => {
      if (e.key === "ArrowRight") show(idx + 1);
      if (e.key === "ArrowLeft") show(idx - 1);
    };
    document.addEventListener("keydown", onKey);
    stage._cleanup = () => document.removeEventListener("keydown", onKey);
    show(0);
  }

  load();
}

// --- Vista: Libreria -----------------------------------------------------

function viewLibrary() {
  setActiveTab("library");
  clear(app);
  app.append(
    el("header", { class: "topbar spread" }, [
      el("h1", { class: "brand small" }, "Libreria"),
      el("a", {
        class: "icon-btn",
        href: "#/settings",
        "aria-label": "Backup e impostazioni",
        title: "Backup e impostazioni",
        html: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
      }),
    ])
  );
  const body = el("div", { class: "page" });
  app.append(body);

  const lib = store.getLibrary();
  if (!lib.length) {
    body.append(
      el("div", { class: "empty" }, [
        el("div", { class: "empty-ico", html: icon("library") }),
        el("p", {}, "La tua libreria è vuota."),
        el("p", { class: "muted" }, "Aggiungi manga dai loro dettagli."),
        el("a", { class: "btn primary-link", href: "#/search" }, "Cerca un manga"),
      ])
    );
    return;
  }

  // Barra di ordinamento
  const sortOptions = [
    ["recent", "Recenti"],
    ["oldest", "Meno recenti"],
    ["alpha", "A-Z"],
    ["new", "Nuovi capitoli"],
  ];
  const filterRow = el("div", { class: "filter-row" });
  const gridWrap = el("div", {});
  body.append(filterRow, gridWrap);

  // Cache dei risultati "ha nuovi capitoli?" (condivisa tra badge e ordinamento)
  const newInfo = new Map();

  async function computeNew() {
    await Promise.all(
      lib.map(async (m) => {
        if (newInfo.has(m.id)) return;
        if (!store.getLastRead(m.id)) return newInfo.set(m.id, false);
        try {
          const { items } = await api.fetchChapters(m.id);
          newInfo.set(m.id, store.hasNewChapters(m.id, items));
        } catch {
          newInfo.set(m.id, false);
        }
      })
    );
  }

  // Timestamp effettivo per l'ordine di aggiunta: le voci senza addedAt
  // (salvate prima di questa funzione) valgono come le più vecchie, ma
  // mantengono l'ordine relativo attuale (indice 0 = più recente).
  const ts = (m, i) => (typeof m.addedAt === "number" ? m.addedAt : -i);

  function sortList(key) {
    const arr = lib.map((m, i) => ({ m, i }));
    if (key === "oldest") arr.sort((a, b) => ts(a.m, a.i) - ts(b.m, b.i));
    else if (key === "alpha")
      arr.sort((a, b) => (a.m.title || "").localeCompare(b.m.title || "", "it"));
    else if (key === "new")
      arr.sort((a, b) => {
        const na = newInfo.get(a.m.id) ? 1 : 0;
        const nb = newInfo.get(b.m.id) ? 1 : 0;
        if (na !== nb) return nb - na; // con nuovi capitoli prima
        return ts(b.m, b.i) - ts(a.m, a.i);
      });
    else arr.sort((a, b) => ts(b.m, b.i) - ts(a.m, a.i)); // "recent"
    return arr.map((x) => x.m);
  }

  function renderGrid(list) {
    clear(gridWrap);
    const grid = el("div", { class: "grid" });
    gridWrap.append(grid);

    list.forEach((m) => {
      const last = store.getLastRead(m.id);
      const card = mangaCard(m);
      if (last) card.append(el("span", { class: "resume" }, last.label));

      const newBadge = el("span", { class: "new-chapters", style: "display: none;" }, "● Nuovo");
      card.querySelector(".cover").append(newBadge);
      grid.append(card);

      const showBadge = () => {
        if (newInfo.get(m.id)) newBadge.style.display = "";
      };
      if (newInfo.has(m.id)) {
        showBadge();
      } else if (last) {
        api.fetchChapters(m.id).then(({ items }) => {
          newInfo.set(m.id, store.hasNewChapters(m.id, items));
          showBadge();
        }).catch(() => {});
      }
    });
  }

  async function renderFor(key) {
    // L'ordine per "nuovi capitoli" richiede di conoscere lo stato di tutti
    // prima di disegnare: mostriamo lo spinner mentre li recuperiamo.
    if (key === "new") {
      clear(gridWrap);
      gridWrap.append(loadingPanel("Aggiorno la libreria…"));
      await computeNew();
    }
    renderGrid(sortList(key));
  }

  const activeSort = store.getLibrarySort();
  for (const [key, label] of sortOptions) {
    const chip = el(
      "button",
      {
        class: `chip ${key === activeSort ? "on" : ""}`,
        onClick: () => {
          store.setLibrarySort(key);
          for (const c of filterRow.children) c.classList.remove("on");
          chip.classList.add("on");
          press(chip);
          renderFor(key);
        },
      },
      label
    );
    filterRow.append(chip);
  }

  renderFor(activeSort);
}

// --- Vista: Impostazioni / Backup ---------------------------------------

function viewSettings() {
  setActiveTab("library");
  clear(app);
  app.append(backBar("#/library"));
  const body = el("div", { class: "page setup" });
  app.append(body);

  const status = el("p", { class: "muted sync-status" }, "");
  const last = sync.lastSync();
  const lastSyncText = last
    ? `Ultima sincronizzazione: ${last.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}`
    : "Nessuna sincronizzazione ancora effettuata.";
  function setStatus(msg, ok) {
    status.textContent = msg;
    status.style.color = ok === false ? "var(--accent)" : "var(--muted)";
  }

  const syncNowBtn = el("button", { class: "btn save" }, "Sincronizza ora");
  syncNowBtn.addEventListener("click", async () => {
    if (syncNowBtn.disabled) return;
    syncNowBtn.disabled = true;
    syncNowBtn.textContent = "Sincronizzazione…";
    setStatus("Sincronizzazione…");
    try {
      await sync.pull();
      await sync.push();
      setStatus("Sincronizzato ora. I tuoi dati sono aggiornati.");
      success(syncNowBtn);
    } catch (e) {
      setStatus(`Sincronizzazione non riuscita: ${friendlyError(e)}`, false);
    } finally {
      syncNowBtn.disabled = false;
      syncNowBtn.textContent = "Sincronizza ora";
    }
  });

  const exportBtn = el("button", { class: "btn" }, "Esporta backup (.json)");
  exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(sync.snapshot(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = el("a", {
      href: url,
      download: `yomi-backup-${new Date().toISOString().slice(0, 10)}.json`,
    });
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  const importInput = el("input", {
    type: "file",
    accept: "application/json",
    style: "display: none;",
  });
  const importBtn = el("button", { class: "btn" }, "Importa backup");
  importBtn.addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", async () => {
    const file = importInput.files[0];
    if (!file) return;
    const confirmed = window.confirm("Importare questo backup? I dati verranno uniti a quelli già presenti su questo dispositivo.");
    if (!confirmed) {
      importInput.value = "";
      return;
    }
    try {
      const obj = JSON.parse(await file.text());
      sync.applyMerged(obj);
      sync.schedulePush();
      setStatus("Backup importato e unito ai dati locali.");
      success(importBtn);
    } catch (e) {
      setStatus(`Import non riuscito: ${friendlyError(e)}`, false);
    }
    importInput.value = "";
  });

  body.append(
    el("h1", {}, "Backup e sincronizzazione"),
    el("p", { class: "muted" },
      "Salva libreria e progressi sul backup personale del server, così puoi recuperarli se pulisci la cache o cambi dispositivo."),
    el("p", { class: "sync-note" }, "Uso personale: questo backup è condiviso tra i tuoi dispositivi e non è un account privato."),
    syncNowBtn,
    el("div", { class: "settings-actions" }, [exportBtn, importBtn]),
    importInput,
    el("p", { class: "muted last-sync" }, lastSyncText),
    status
  );
}

// --- Componenti condivisi ------------------------------------------------

function backBar(fallback) {
  return el("header", { class: "topbar back" }, [
    el(
      "a",
      {
        class: "icon-btn",
        href: fallback,
        "aria-label": "Torna indietro",
        title: "Torna indietro",
        onClick: (e) => {
          if (history.length > 1) {
            e.preventDefault();
            history.back();
          }
        },
      },
      el("span", { html: icon("back") })
    ),
  ]);
}

function setActiveTab(tab) {
  document.body.classList.remove("reading-mode", "chrome-hidden");
  tabbar.style.display = "";
  for (const a of tabbar.querySelectorAll("a")) {
    a.classList.toggle("active", a.dataset.tab === tab);
  }
}

function clearActiveTab() {
  document.body.classList.remove("reading-mode", "chrome-hidden");
  tabbar.style.display = "";
  for (const a of tabbar.querySelectorAll("a")) a.classList.remove("active");
}


// --- Router --------------------------------------------------------------

function parseRoute() {
  const hash = location.hash.slice(1) || "/home";
  const [path, query] = hash.split("?");
  const params = new URLSearchParams(query || "");
  const parts = path.split("/").filter(Boolean); // es. ["manga", "id"]
  return { parts, params };
}

async function router() {
  // pulizia eventuali listener del reader precedente
  const oldStage = app.querySelector(".reader-stage");
  if (oldStage && oldStage._cleanup) oldStage._cleanup();

  const { parts, params } = parseRoute();
  const [root, arg] = parts;

  switch (root) {
    case "home":
    case undefined:
      return viewHome();
    case "search":
      return viewSearch();
    case "library":
      return viewLibrary();
    case "manga":
      return viewDetail(arg);
    case "read":
      return viewReader(arg, params.get("manga"));
    case "settings":
      return viewSettings();
    default:
      location.hash = "#/home";
  }
  document.body.scrollTo(0, 0);
}

window.addEventListener("hashchange", () => {
  router();
  document.body.scrollTo(0, 0);
});

function boot() {
  router();
  // Sincronizzazione iniziale in background: scarica il backup dal server, lo
  // fonde in locale e, se qualcosa è cambiato, ri-renderizza; poi ricarica sul
  // server lo stato unito.
  sync
    .pull()
    .then((changed) => {
      if (changed) router();
      sync.schedulePush();
    })
    .catch(() => {});
}

window.addEventListener("DOMContentLoaded", boot);
if (document.readyState !== "loading") boot();
