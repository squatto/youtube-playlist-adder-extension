# YouTube Playlist Adder

Click YouTube's native Add to queue to also add the video to your selected playlist. Simple and reliable.

---

## ✨ Features

- _TBD_
- 💾 Stores all data in **Chrome Sync Storage** — your settings persist across browsers signed into the same Google account

---

## 🧩 Installation (Developer Mode)

1. [Download the latest release zip file here](https://github.com/squatto/youtube-playlist-adder-extension/releases/latest) or clone this repository:
   ```bash
   git clone https://github.com/squatto/youtube-playlist-adder-extension.git
   ```
2. Open Chrome and go to:
   ```
   chrome://extensions
   ```
3. Toggle **Developer mode** (top right corner).
4. Click **Load unpacked** and select the folder containing this extension.
5. Authorize with YouTube and select a playlist in the extension options.
6. Visit [YouTube](https://www.youtube.com)
7. Click the "Add to queue" button on any video and the video will automatically be added to your selected playlist.

---

## 🔒 Storage & Privacy

- Data is saved using `chrome.storage.sync`.
- Data syncs with your Google account (same as bookmarks and extensions).
- Only accesses the official YouTube API.
- The extension runs only on:
  ```
  https://www.youtube.com/*
  ```

---

## 🧑‍💻 Development Notes

- Built with **Manifest V3**
- Uses **Chrome Storage Sync API**
- Uses OAuth to obtain access to the user's YouTube account
- Uses the official YouTube API
- Icons and design follow YouTube color themes (red + black)
- Compatible with all Chromium-based browsers supporting MV3

---

## 🏷️ Credits

**Author:** Scott Carpenter  
**Email:** scott@payforstay.com  
**License:** MIT  
**Version:** 2.7.36

