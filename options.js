const VERSION = "2.7.36";
console.log("[YouTube Playlist Adder] Loaded v"+VERSION+" (options.js)");
const LOG = (...a) => console.log("[YouTube Playlist Adder]", ...a);
const ERR = (...a) => console.error("[YouTube Playlist Adder]", ...a);

const el = (id) => document.getElementById(id);
const acct = () => el("acct");
const reauth = () => el("reauth");
const playlistSelect = () => el("playlistSelect");
const refreshBtn = () => el("refresh");
const saveBtn = () => el("save");
const selStatus = () => el("selStatus");

// --- Background messaging helpers ---
async function getEmail() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "getUserEmail" }, (res) => {
      if (chrome.runtime.lastError) {
        ERR("getUserEmail error:", chrome.runtime.lastError);
        return resolve({ ok: false });
      }
      resolve(res || { ok: false });
    });
  });
}

async function getPlaylists() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "getPlaylists" }, (res) => {
      if (chrome.runtime.lastError) {
        ERR("getPlaylists error:", chrome.runtime.lastError);
        return resolve({ ok: false, playlists: [] });
      }
      resolve(res || { ok: false, playlists: [] });
    });
  });
}

function populateSelect(playlists, selectedId) {
  const sel = playlistSelect();
  sel.innerHTML = "";
  if (!Array.isArray(playlists) || playlists.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "(No playlists found)";
    sel.appendChild(opt);
    return;
  }
  for (const p of playlists) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.title || p.id;
    if (selectedId && selectedId === p.id) opt.selected = true;
    sel.appendChild(opt);
  }
}

async function loadAll() {
  LOG("Options load");
  acct().textContent = "Loading…";
  playlistSelect().innerHTML = "<option>Loading…</option>";

  const emailRes = await getEmail();
  if (emailRes.ok && (emailRes.email || emailRes.name)) {
    acct().innerHTML = `${emailRes.name || emailRes.email} <span class="muted">(${emailRes.email || ""})</span>`;
  } else {
    acct().innerHTML = '<span class="warn">Not signed in</span>';
  }

  const stored = await new Promise((r) => chrome.storage.sync.get(["selectedPlaylistId", "selectedPlaylistName"], r));
  const plRes = await getPlaylists();
  if (plRes.ok) {
    populateSelect(plRes.playlists, stored.selectedPlaylistId);
  } else {
    populateSelect([], stored.selectedPlaylistId);
  }

  selStatus().textContent = stored.selectedPlaylistId
    ? `Selected: ${stored.selectedPlaylistName || "(unnamed)"} (${stored.selectedPlaylistId})`
    : "No playlist selected yet.";
}

refreshBtn().addEventListener("click", async () => {
  LOG("Refresh playlists clicked");
  const plRes = await getPlaylists();
  if (plRes.ok) {
    const current = await new Promise((r) => chrome.storage.sync.get(["selectedPlaylistId"], r));
    populateSelect(plRes.playlists, current.selectedPlaylistId);
  } else {
    populateSelect([], null);
  }
});

saveBtn().addEventListener("click", async () => {
  const sel = playlistSelect().value;
  if (!sel) {
    selStatus().innerHTML = '<span class="err">Please choose a playlist.</span>';
    return;
  }
  const name = playlistSelect().selectedOptions[0]?.textContent || "";
  await new Promise((r) => chrome.storage.sync.set({ selectedPlaylistId: sel, selectedPlaylistName: name }, r));
  selStatus().innerHTML = `<span class="ok">Saved: ${name} (${sel})</span>`;
  LOG("Saved selection", sel, name);
});

reauth().addEventListener("click", async () => {
  LOG("Re-authenticate clicked");
  const res = await new Promise((resolve) => chrome.runtime.sendMessage({ type: "forceAuth" }, resolve));
  if (res?.ok) {
    selStatus().innerHTML = '<span class="ok">Re-authenticated.</span>';
    await loadAll();
  } else {
    selStatus().innerHTML = '<span class="err">Re-auth failed. See console.</span>';
  }
});

document.addEventListener("DOMContentLoaded", () => {
  loadAll();
  });
(function(){
  const setVer = () => {
    try {
      const el = document.getElementById("ypa-version-number");
      if (el) el.textContent = VERSION;
    } catch(e) { /* noop */ }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setVer, {once:true});
  else setVer();
})();

(function(){
  const setVer = () => { try { const el = document.getElementById("ypa-version-number"); if (el) el.textContent = "v" + VERSION; } catch(e){} };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setVer, {once:true});
  else setVer();
})();

;(function(){
  const w = () => { try { const el = document.getElementById("ypa-version-number"); if (el) el.textContent = VERSION; } catch(e){} };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", w, {once:true}); else w();
})();
