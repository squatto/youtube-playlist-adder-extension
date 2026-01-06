# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YouTube Playlist Adder is a Chrome extension (Manifest V3) that intercepts YouTube's "Add to queue" button clicks and automatically adds the video to a user-selected playlist via the YouTube Data API.

## Architecture

**Extension Components:**
- `background.js` - Service worker handling OAuth tokens and YouTube API calls (listPlaylists, addToPlaylist)
- `content.js` - Content script injected into youtube.com that detects "Add to queue" clicks and extracts video IDs
- `popup.js/html` - Browser action popup for enable/disable toggle and showing current playlist
- `options.js/html` - Options page for account management and playlist selection

**Communication Flow:**
1. `content.js` detects queue button clicks via DOM event delegation and MutationObserver
2. Video ID extracted from href patterns (`/watch?v=` or `/shorts/`)
3. Message sent to `background.js` via `chrome.runtime.sendMessage`
4. `background.js` uses `chrome.identity.getAuthToken` for OAuth, then calls YouTube API
5. Settings stored in `chrome.storage.sync` for cross-device persistence

**Key Implementation Details:**
- Shorts videos require special handling with TTL-based ID stashing (5s window) due to overlay menu timing
- Debouncing via `withinRecent()` prevents duplicate adds (1s window)
- Toast notifications rendered in Shadow DOM to avoid YouTube style conflicts
- OAuth flow falls back to interactive mode if silent auth fails

## Development

No build step required. Load unpacked extension directly in Chrome:
1. Go to `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked" and select this directory

**Version Updates:** When changing version, update in these locations:
- `manifest.json` (`version` field)
- `VERSION` constant at top of: `background.js`, `content.js`, `popup.js`, `options.js`
- "Version:" line at the bottom of `README.md`

