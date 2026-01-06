const VERSION = "2.7.32";
console.log("[YouTube Playlist Adder] Loaded v"+VERSION+" (background.js)");
// background.js
const LOG = (...a) => console.log("[YouTube Playlist Adder]", ...a);
const ERR = (...a) => console.error("[YouTube Playlist Adder]", ...a);

async function getAccessToken(interactive = false) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) {
        return reject(chrome.runtime.lastError || new Error("No token"));
      }
      resolve(token);
    });
  });
}

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${body}`);
  }
  return res.json();
}

// OAuth helpers
async function getUserInfo(interactive = false) {
  const token = await getAccessToken(interactive);
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: "Bearer " + token }
  });
  if (!res.ok) {
    throw new Error(`userinfo ${res.status}`);
  }
  return res.json();
}

// YouTube Data helpers
async function listPlaylists(interactive = false) {
  const token = await getAccessToken(interactive);
  let url = "https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&maxResults=50";
  const items = [];
  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: "Bearer " + token }
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`playlists ${res.status} ${t}`);
    }
    const data = await res.json();
    (data.items || []).forEach(p => items.push({
      id: p.id,
      title: p.snippet?.title || "(no title)"
    }));
    const tokenNext = data.nextPageToken;
    url = tokenNext
      ? `https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&maxResults=50&pageToken=${tokenNext}`
      : null;
  }
  return items;
}

async function addToPlaylist(playlistId, videoId, interactive = false) {
  const token = await getAccessToken(interactive);
  const res = await fetch("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      snippet: {
        playlistId,
        resourceId: { kind: "youtube#video", videoId }
      }
    })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`insert ${res.status} ${txt}`);
  }
  return true;
}

// Message router
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request?.type) {
        case "forceAuth": {
          // Try interactive flow
          await getAccessToken(true);
          sendResponse({ ok: true });
          break;
        }
        case "getUserEmail": {
          const info = await getUserInfo(false).catch(async () => getUserInfo(true));
          sendResponse({ ok: true, email: info?.email || null, name: info?.name || null });
          break;
        }
        case "getPlaylists": {
          const playlists = await listPlaylists(false).catch(async () => listPlaylists(true));
          sendResponse({ ok: true, playlists });
          break;
        }
        case "addToPlaylist": {
          await addToPlaylist(request.playlistId, request.videoId, false).catch(async () => addToPlaylist(request.playlistId, request.videoId, true));
          sendResponse({ ok: true });
          break;
        }
        default:
          sendResponse({ ok: false, error: "Unknown message type" });
      }
    } catch (e) {
      ERR("Message error:", e);
      sendResponse({ ok: false, error: String(e) });
    }
  })();
  return true;
});
