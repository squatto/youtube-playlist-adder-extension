
// [YouTube Playlist Adder] v2.7.20 content.js
(function(){
  const VERSION = "2.7.36";
console.log("[YouTube Playlist Adder] Loaded v"+VERSION+" (content.js)");

// ---- Toast helpers (isolated in shadow root) ----
function ensureToastHost(){
  let host = document.getElementById('ypa-toast-host');
  if (!host){
    host = document.createElement('div');
    host.id = 'ypa-toast-host';
    host.style.position = 'fixed';
    host.style.top = '12px';
    host.style.right = '12px';
    host.style.zIndex = '2147483647';
    host.style.pointerEvents = 'none';
    document.documentElement.appendChild(host);
    host.attachShadow({mode:'open'});
    const style = document.createElement('style');
    style.textContent = `
      .toast {
        min-width: 240px;
        max-width: 420px;
        margin: 8px 0;
        background: #28a745;
        color: #fff;
        font: 500 13px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        border-radius: 10px;
        padding: 10px 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,.25);
        display: flex;
        align-items: center;
        gap: 8px;
        pointer-events: auto;
        transform: translateY(-8px);
        opacity: 0;
        transition: opacity .12s ease, transform .12s ease;
      }
      .toast.show { opacity: 1; transform: translateY(0); }
      .toast .dot { width: 8px; height: 8px; border-radius: 50%; background:#fff; flex: 0 0 auto; }
      .toast.error .dot { background: #fff; }
      .toast .text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    `;
    const wrap = document.createElement('div');
    wrap.id = 'wrap';
    host.shadowRoot.appendChild(style);
    host.shadowRoot.appendChild(wrap);
  }
  return host;
}

function showToast(text, type='success', ms=5000){
  try {
    const host = ensureToastHost();
    const wrap = host.shadowRoot.getElementById('wrap');
    const el = document.createElement('div');
    el.className = 'toast' + (type==='error' ? ' error' : '');
    el.setAttribute('role','status');
    el.innerHTML = `<span class="dot"></span><span class="text"></span>`;
    el.querySelector('.text').textContent = text;
    wrap.appendChild(el);
    // force layout then show
    void el.offsetHeight;
    el.classList.add('show');
    setTimeout(()=>{
      el.classList.remove('show');
      setTimeout(()=> el.remove(), 150);
    }, ms);
  } catch (e){
    console.warn('[YouTube Playlist Adder] Toast error:', e);
  }
}

  const PFX = "[YouTube Playlist Adder]";
  const TOAST_MS = 5000;

  console.log(`${PFX} Loaded v${VERSION}`);
  // Shorts overflow capture state (TTL to bind popup click to correct video)
  const SHORTS_TTL_MS = 5000; // 5s
  let lastShortsClick = { id: null, ts: 0 };

  const isShortsContext = () => location.pathname.startsWith("/shorts");


  let selectedPlaylistId = null;
  let selectedPlaylistName = null;

  const recent = new Map();
  const RECENT_MS = 1000;
  let lastMenuVideoId = null;

  const RENDERER_SEL = [
    "ytd-video-renderer",
    "ytd-rich-item-renderer",
    "ytd-compact-video-renderer",
    "ytd-grid-video-renderer"
  ].join(",");

  const log  = (...a)=>console.log(PFX, ...a);
  const warn = (...a)=>console.warn(PFX, ...a);
  const err  = (...a)=>console.error(PFX, ...a);

  // Prefs
  chrome.storage.sync.get(["selectedPlaylistId","selectedPlaylistName"], (o)=>{
    selectedPlaylistId   = o.selectedPlaylistId   || null;
    selectedPlaylistName = o.selectedPlaylistName || "Selected playlist";
    log("Prefs loaded:", {selectedPlaylistId, selectedPlaylistName});
  });
  chrome.storage.onChanged.addListener((changes, area)=>{
    if(area!=="sync") return;
    if(changes.selectedPlaylistId)   selectedPlaylistId   = changes.selectedPlaylistId.newValue;
    if(changes.selectedPlaylistName) selectedPlaylistName = changes.selectedPlaylistName.newValue;
    log("Prefs changed:", {selectedPlaylistId, selectedPlaylistName});
  });

  function withinRecent(id){
    const now = Date.now();
    const t = recent.get(id) || 0;
    if(now - t < RECENT_MS) return true;
    recent.set(id, now);
    return false;
  }

  function extractIdFromHref(href){
    if(!href) return null;
    const m = href.match(/(?:v=|\/shorts\/)([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : null;
  }

  function currentShortsId(){
    const p = location.pathname || "";
    const m = p.match(/\/shorts\/([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : null;
  }

  function closestAnchorId(el){
    let n = el;
    for (let i=0; i<8 && n; i++){
      if (n.tagName === "A"){
        let id = extractIdFromHref(n.getAttribute("href") || "");
        if (id) return id;
      }
      if (n.querySelector){
        const a = n.querySelector("a[href*='/watch?v='], a[href*='/shorts/']");
        if (a){
          id = extractIdFromHref(a.getAttribute("href") || "");
          if (id) return id;
        }
      }
      n = n.parentElement;
    }
    return null;
  }

  function closestTileId(el){
    let n = el;
    for (let i=0; i<10 && n; i++){
      if (n.matches && n.matches(RENDERER_SEL)){
        const a = n.querySelector("a[href*='/watch?v='], a[href*='/shorts/']");
        if (a){
          id = extractIdFromHref(a.getAttribute("href") || "");
          if (id) return id;
        }
      }
      n = n.parentElement;
    }
    return null;
  }

  function idFromUrl(){
    return extractIdFromHref(location.pathname + location.search);
  }

  function showToast(text, ms=TOAST_MS){
    try{
      const snackbar = document.querySelector("yt-notification-action-renderer, ytd-notification-text-renderer");
      if(snackbar && snackbar.__proto__ && typeof snackbar.__proto__.showToast === "function"){
        snackbar.__proto__.showToast.call(snackbar, text);
        return;
      }
    }catch(_){}
    const t = document.createElement("div");
    t.textContent = text;
    t.style.cssText = "position:fixed;left:24px;bottom:88px;padding:10px 14px;background:#28a745;color: #fff;border-radius:8px;z-index:2147483647;font:500 14px/18px Roboto,Arial,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.35);";
    document.documentElement.appendChild(t);
    setTimeout(()=> t.remove(), ms);
  }

  // Tighter intent check for "Add to queue"
  function isAddToQueueEl(el){
    if(!el || !(el instanceof HTMLElement)) return false;
    const title = (el.getAttribute("title") || "").toLowerCase();
    let aria = (el.getAttribute("aria-label") || "").toLowerCase();
    const dtip  = (el.getAttribute("data-tooltip") || "").toLowerCase();
    const text  = (el.textContent || "").trim().toLowerCase();
    const hasLabel = (
      title.includes("add to queue") ||
      aria.includes("add to queue") ||
      dtip.includes("add to queue") ||
      text === "add to queue" || text.includes("add to queue")
    );
    if(!hasLabel) return false;

    // Require plausible context: menu or overlay button (also Shorts overlay)
    const inMenu   = !!el.closest("ytd-popup-container,[role='menu'],ytd-menu-service-item-renderer,yt-list-item-view-model");
    const inButton = !!el.closest("ytd-button-renderer,button,yt-icon-button,.yt-spec-button-shape-next,ytd-reel-player-overlay-renderer");
    return inMenu || inButton;
  }

  // Capture three-dots menu context id

  function captureMenuContext(evt){
    let path = evt.composedPath ? evt.composedPath() : [evt.target];
    let btn = path[0];
    if(!btn) return;
    aria = (btn.getAttribute && (btn.getAttribute("aria-label")||"").toLowerCase()) || "";
    let isOverflow = aria.includes("more") || aria.includes("menu") || aria.includes("action");
    if(!isOverflow) return;

    // If in Shorts, remember the current Shorts id right at overflow click (strongest signal).
    if (isShortsContext()){
      const sid = currentShortsId();
      if (sid){
        lastShortsClick = { id: sid, ts: Date.now() };
        log("Shorts overflow clicked; stashed id:", sid);
      }
    }

    btn = path[0];
    if(!btn) return;
    aria = (btn.getAttribute && (btn.getAttribute("aria-label")||"").toLowerCase()) || "";
    isOverflow = aria.includes("more") || aria.includes("menu") || aria.includes("action");
    if(!isOverflow) return;

    id = closestTileId(btn) || closestAnchorId(btn) || idFromUrl();
    // On Shorts, anchor/tile resolution often fails; fall back to URL
    if(!id){
      id = currentShortsId();
    }
    if (id){
      lastMenuVideoId = id;
      log("Menu context videoId:", id);
    }
  }
  document.addEventListener("pointerdown", captureMenuContext, { capture:true, passive:true });

  // Bind popup “… → Add to queue”
  (function bindPopupObserver(){
    const attach = () => {
      const host = document.querySelector("ytd-popup-container, yt-popup-container") || document.body;
      if(!host){ setTimeout(attach, 300); return; }
      const obs = new MutationObserver((muts)=>{
        for(const m of muts){
          for(const n of m.addedNodes){
            if(!(n instanceof HTMLElement)) continue;

            // When popup appears while on a Shorts page, seed lastMenuVideoId from URL
            if(!lastMenuVideoId){
              const sid = currentShortsId();
              if(sid){ lastMenuVideoId = sid; log("Seeded Shorts videoId from URL:", sid); }
            }

            const items = n.querySelectorAll(
              "ytd-menu-service-item-renderer, ytd-menu-navigation-item-renderer, yt-list-item-view-model, [role='menuitem']"
            );
            items.forEach(el => {
              const txt = (el.getAttribute("title") || el.textContent || "").trim().toLowerCase();
              if(txt && (txt === "add to queue" || txt.includes("add to queue"))){
                if(el._ytpaBound) return;
                el._ytpaBound = true;
                el.addEventListener("click", (evt)=> onQueue(evt, "menu"), { capture:true });
                el.addEventListener("pointerdown", (evt)=> onQueue(evt, "menu-pointerdown"), { capture:true });
                log("Bound menu item:", txt);
              }
            });
          }
        }
      });
      obs.observe(host, { childList:true, subtree:true });
      log("Popup observer bound");
    };
    if(document.readyState === "loading"){
      document.addEventListener("DOMContentLoaded", attach, { once:true });
    }else{
      attach();
    }
  })();

  // Delegate overlay button (hover “Add to queue” and Shorts overlay)
  function delegateOverlay(){
    const handler = (evt)=>{ const path = (evt && evt.composedPath) ? evt.composedPath() : []; const hit = path.find(isAddToQueueEl);
      if(!hit) return;
      onQueue(evt, "overlay");
    };
    document.addEventListener("pointerdown", handler, { capture:true });
    log("Overlay delegation bound (pointerdown only)");
  }
  delegateOverlay();

  function resolveId(evt, source){
  const path = (evt && typeof evt.composedPath === 'function') ? evt.composedPath() : [];
  let id = null;
  for (const n of path){
    if (n && n.tagName === "A"){
      id = extractIdFromHref(n.getAttribute("href") || "");
      if (id) break;
    }
  }
  if (!id) id = closestTileId(evt && evt.target);
  if (!id && source && source.startsWith("menu")) id = lastMenuVideoId;
  if (!id) id = currentShortsId();
  if (!id) id = idFromUrl();
  return id;
}

function onQueue(evt, source){
    id = null;

    // Prefer the stashed Shorts id if we're in Shorts and within TTL
    if (isShortsContext() && lastShortsClick.id && (Date.now() - lastShortsClick.ts) <= SHORTS_TTL_MS){
      id = lastShortsClick.id;
      log("Using stashed Shorts id:", id);
    }

    if(!id){
      id = resolveId(evt, source);
    }

    id = resolveId(evt, source);
    if(!id){
      log("Queue intent detected but no videoId (ignored). source:", source);
      return;
    }

    if (withinRecent(id)){ log("Debounced duplicate:", id); return; }
    if (source !== "menu" && source !== "menu-pointerdown") lastMenuVideoId = null;

    if(!selectedPlaylistId){
      log("No playlist selected; skipping playlist add.");
      return;
    }

    chrome.runtime.sendMessage({ type:"addToPlaylist", videoId:id, playlistId:selectedPlaylistId }, (resp)=>{
      if(chrome.runtime.lastError){ err("Add failed:", chrome.runtime.lastError); return; }

      if(resp && (resp.ok || resp.success)){
        // Clear Shorts stash if we used it recently to avoid leaking to next action
        if (isShortsContext() && lastShortsClick.id && (Date.now() - lastShortsClick.ts) <= SHORTS_TTL_MS){
          lastShortsClick = { id:null, ts:0 };
        }

        if(resp.duplicate){
          log(`Already in playlist: ${selectedPlaylistName} (video ${id})`);
          showToast(`Already in ${selectedPlaylistName}`, TOAST_MS);
        }else{
          log(`Added to playlist: ${selectedPlaylistName} (video ${id})`);
          showToast(`Added to ${selectedPlaylistName}`, TOAST_MS);
        }
      }else{
        err("Add failed:", resp);
      }
    });
  }
})();
// Set header version badge
(function(){
  const setVer=()=>{let el =document.getElementById("ypa-version-number"); if(el) el.textContent=VERSION;};
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", setVer, {once:true}); else setVer();
})();
