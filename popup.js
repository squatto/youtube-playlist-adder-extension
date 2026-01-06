const VERSION = "2.7.36";
console.log("[YouTube Playlist Adder] Loaded v"+VERSION+" (popup.js)");
const LOG = (...a) => console.log("[YouTube Playlist Adder]", ...a);

const toggle = document.getElementById("toggleEnabled");
const statusEl = document.getElementById("status");
const openOptionsBtn = document.getElementById("openOptions");

const currentPlaylistEl = document.getElementById("currentPlaylist");

function renderCurrentPlaylist(id, name) {
  if (id && name) {
    currentPlaylistEl.innerHTML = `<a href="https://www.youtube.com/playlist?list=${id}" target="_blank">${name}</a>`;
  } else {
    currentPlaylistEl.textContent = "(none selected)";
  }
}

chrome.storage.sync.get(
  { queueToPlaylistEnabled: true, selectedPlaylistId: null, selectedPlaylistName: null },
  (data) => {
    const enabled = !!data.queueToPlaylistEnabled;
    toggle.checked = enabled;
    setStatus(enabled);
    renderCurrentPlaylist(data.selectedPlaylistId, data.selectedPlaylistName);
  }
);

// Update playlist display live if options page changes it
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  const id = changes.selectedPlaylistId ? changes.selectedPlaylistId.newValue : null;
  const name = changes.selectedPlaylistName ? changes.selectedPlaylistName.newValue : null;
  if (changes.selectedPlaylistId || changes.selectedPlaylistName) {
    renderCurrentPlaylist(id, name);
  }
});


function setStatus(enabled) {
  statusEl.innerHTML = enabled
    ? '<span class="ok">Enabled: Queue clicks will add to your playlist.</span>'
    : '<span class="err">Disabled: Queue clicks are ignored.</span>';
}

chrome.storage.sync.get({ queueToPlaylistEnabled: true }, (data) => {
  const enabled = !!data.queueToPlaylistEnabled;
  toggle.checked = enabled;
  setStatus(enabled);
});

toggle.addEventListener("change", () => {
  const enabled = !!toggle.checked;
  chrome.storage.sync.set({ queueToPlaylistEnabled: enabled }, () => {
    setStatus(enabled);
    LOG("Toggled queueToPlaylistEnabled:", enabled);
  });
});

openOptionsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
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
