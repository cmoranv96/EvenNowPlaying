import "./styles.css";
import {
  CreateStartUpPageContainer,
  ListContainerProperty,
  ListItemContainerProperty,
  TextContainerProperty,
  TextContainerUpgrade,
  waitForEvenAppBridge,
  type EvenAppBridge,
} from "@evenrealities/even_hub_sdk";

type TrackState = {
  title: string;
  artist: string;
  album?: string;
  isPlaying: boolean;
  updatedAt: number;
  durationMs?: number;
  positionMs?: number;
  positionUpdatedAtMs?: number;
};

type BridgeResponse = {
  ok: boolean;
  connected: boolean;
  packageName: string;
  track?: {
    title: string;
    artist: string;
    album?: string;
    isPlaying: boolean;
    durationMs?: number;
    positionMs?: number;
    positionUpdatedAtMs?: number;
  };
};

type BridgeCommand = "next" | "previous" | "play-pause" | "play" | "pause";
type ControlAction = "previous" | "play-pause" | "next";

type PlayerControl = {
  action: ControlAction;
  label: string;
};

const ANDROID_BRIDGE_URL = "http://127.0.0.1:8765";
const controls: PlayerControl[] = [
  { action: "previous", label: "<<" },
  { action: "play-pause", label: "||" },
  { action: "next", label: ">>" },
];

const demoTracks: TrackState[] = [
  {
    title: "Listo para conectar",
    artist: "YouTube Music bridge",
    album: "Even Now Playing",
    isPlaying: false,
    updatedAt: Date.now(),
  },
  {
    title: "Midnight City",
    artist: "M83",
    album: "Hurry Up, We're Dreaming",
    isPlaying: true,
    updatedAt: Date.now(),
  },
  {
    title: "Sweet Disposition",
    artist: "The Temper Trap",
    album: "Conditions",
    isPlaying: true,
    updatedAt: Date.now(),
  },
];

let trackIndex = 0;
let track = demoTracks[trackIndex];
let androidBridgeConnected = false;
let youtubeMusicConnected = false;
let evenBridge: EvenAppBridge | null = null;
let evenPageCreated = false;
let selectedControlIndex = 0;
let glassesRenderInFlight = false;
let glassesRenderQueued = false;
let lastActivationAt = 0;
let lastCommandAt = 0;
let lastCommand: BridgeCommand | null = null;
let lastEvenEventSummary = "event: none";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app root");
}

function render() {
  const stateLabel = androidBridgeConnected
    ? track.isPlaying
      ? "Playing"
      : "Paused"
    : "No bridge";
  const controlLabel = track.isPlaying ? "Pause" : "Play";
  const playPauseIcon = track.isPlaying ? "pause" : "play";
  const progress = estimateProgressPercent();
  const hint = androidBridgeConnected
    ? youtubeMusicConnected
      ? "Conectado a YouTube Music"
      : "Abre YouTube Music y reproduce algo"
    : "Abre la companion app Android";

  app.innerHTML = `
    <section class="surface">
      <div class="progress" aria-label="Playback progress">
        <span class="progress-fill" style="width: ${progress}%"></span>
        <span class="progress-thumb" style="left: ${progress}%"></span>
      </div>

      <div class="track">
        <span class="pill">${stateLabel}</span>
        <h1>${escapeHtml(track.title)}</h1>
        <p>${escapeHtml(track.artist)}</p>
      </div>

      <div class="controls three-controls" aria-label="Playback controls">
        <button class="icon-button secondary ${selectedClass("previous")}" data-action="previous" aria-label="Previous track">
          <span class="previous-icon" aria-hidden="true"></span>
        </button>
        <button class="icon-button primary ${playPauseIcon} ${selectedClass("play-pause")}" data-action="play-pause" aria-label="${controlLabel}">
          <span aria-hidden="true"></span>
        </button>
        <button class="icon-button secondary ${selectedClass("next")}" data-action="next" aria-label="Next track">
          <span class="next-icon" aria-hidden="true"></span>
        </button>
      </div>

      <p class="hint">${escapeHtml(hint)}</p>
      <p class="debug">${escapeHtml(lastEvenEventSummary)}</p>
    </section>
  `;
}

async function renderGlasses() {
  if (!evenBridge) return;
  if (glassesRenderInFlight) {
    glassesRenderQueued = true;
    return;
  }

  glassesRenderInFlight = true;

  try {
    const { textObject, listObject } = glassesPageObjects();
    const containerTotalNum = textObject.length + listObject.length;

    if (!evenPageCreated) {
      const result = await evenBridge.createStartUpPageContainer(
        new CreateStartUpPageContainer({
          containerTotalNum,
          textObject,
          listObject,
        }),
      );
      evenPageCreated = result === 0;
    } else {
      await updateGlassesText();
    }
  } catch (error) {
    evenPageCreated = false;
    console.warn("[Even Now Playing] Failed to update glasses UI", error);
  } finally {
    glassesRenderInFlight = false;
    if (glassesRenderQueued) {
      glassesRenderQueued = false;
      void renderGlasses();
    }
  }
}

async function updateGlassesText() {
  if (!evenBridge) return;

  await Promise.all([
    updateText(1, "title", displayTrackTitle()),
    updateText(2, "artist", displayTrackArtist()),
    updateText(3, "progress", progressWithTimeText()),
    updateText(5, "divider", "|\n|\n|\n|\n|"),
  ]);
}

function glassesPageObjects() {
  return {
    textObject: [
      textContainer(1, "title", 44, 38, 344, 34, displayTrackTitle()),
      textContainer(2, "artist", 64, 84, 324, 30, displayTrackArtist()),
      textContainer(3, "progress", 46, 132, 342, 34, progressWithTimeText()),
      textContainer(5, "divider", 410, 40, 18, 166, "|\n|\n|\n|\n|"),
    ],
    listObject: [controlsListContainer(4, "controls")],
  };
}

function textContainer(
  containerID: number,
  containerName: string,
  xPosition: number,
  yPosition: number,
  width: number,
  height: number,
  content: string,
) {
  return new TextContainerProperty({
    containerID,
    containerName,
    xPosition,
    yPosition,
    width,
    height,
    content,
    isEventCapture: 0,
  });
}

function controlsListContainer(
  containerID: number,
  containerName: string,
) {
  return new ListContainerProperty({
    containerID,
    containerName,
    xPosition: 438,
    yPosition: 40,
    width: 86,
    height: 142,
    borderWidth: 0,
    borderColor: 0,
    borderRadius: 8,
    paddingLength: 2,
    isEventCapture: 1,
    itemContainer: new ListItemContainerProperty({
      itemCount: controls.length,
      itemWidth: 0,
      isItemSelectBorderEn: 1,
      itemName: controls.map(displayListLabel),
    }),
  });
}

async function updateText(containerID: number, containerName: string, content: string) {
  if (!evenBridge) return;

  await evenBridge.textContainerUpgrade(
    new TextContainerUpgrade({
      containerID,
      containerName,
      content,
      contentOffset: 0,
      contentLength: content.length,
    }),
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayTrackTitle() {
  return truncateForHud(track.title, 24);
}

function displayTrackArtist() {
  return truncateForHud(track.artist, 22);
}

function truncateForHud(value: string, maxLength: number) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLength - 1))}…`;
}

function estimateProgressPercent() {
  const durationMs = track.durationMs ?? 0;
  const basePositionMs = track.positionMs ?? 0;
  if (durationMs <= 0) return 0;

  const elapsedMs =
    track.isPlaying && track.positionUpdatedAtMs
      ? Math.max(0, Date.now() - track.positionUpdatedAtMs)
      : 0;
  const positionMs = Math.min(durationMs, basePositionMs + elapsedMs);
  return Math.max(0, Math.min(100, Math.round((positionMs / durationMs) * 100)));
}

function progressBarText(percent: number) {
  const slots = 8;
  const thumb = Math.max(1, Math.min(slots - 2, Math.round((percent / 100) * slots)));
  return Array.from({ length: slots }, (_, index) => (index === thumb ? "●" : "━")).join("");
}

function currentPositionMs() {
  const durationMs = track.durationMs ?? 0;
  const basePositionMs = track.positionMs ?? 0;
  const elapsedMs =
    track.isPlaying && track.positionUpdatedAtMs
      ? Math.max(0, Date.now() - track.positionUpdatedAtMs)
      : 0;

  if (durationMs <= 0) return basePositionMs;
  return Math.min(durationMs, basePositionMs + elapsedMs);
}

function progressWithTimeText() {
  const durationMs = track.durationMs ?? 0;
  const positionMs = currentPositionMs();
  return `${formatTime(positionMs)} ${progressBarText(estimateProgressPercent())} ${formatTime(durationMs)}`;
}

function formatTime(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "0:00";

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function selectedControl() {
  return controls[selectedControlIndex];
}

function selectedClass(action: ControlAction) {
  return selectedControl().action === action ? "selected" : "";
}

function displayLabel(control: PlayerControl) {
  return control.label;
}

function displayListLabel(control: PlayerControl) {
  return `  ${control.label}  `;
}

function normalizedControlLabel(value: string | undefined) {
  return value
    ?.replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .trim();
}

function moveSelection(direction: -1 | 1) {
  lastActivationAt = 0;
  selectedControlIndex = (selectedControlIndex + direction + controls.length) % controls.length;
  render();
  void renderGlasses();
}

function activateSelectedControl() {
  const now = Date.now();
  if (now - lastActivationAt < 650) return;

  lastActivationAt = now;
  runControlAction(selectedControl().action);
}

function activateEventControl(event: {
  listEvent?: { currentSelectItemIndex?: number; currentSelectItemName?: string };
}) {
  const eventControlIndex = controlIndexFromListEvent(event);
  if (eventControlIndex !== undefined) {
    updateSelectedControlIndex(eventControlIndex);
    activateControlIndex(eventControlIndex);
    return;
  }

  activateSelectedControl();
}

function activateControlIndex(controlIndex: number) {
  const now = Date.now();
  if (now - lastActivationAt < 650) return;

  lastActivationAt = now;
  runControlAction(controls[controlIndex]?.action ?? selectedControl().action);
}

function runControlAction(action: ControlAction | string) {
  if (action === "next") nextTrack();
  if (action === "previous") previousTrack();
  if (action === "play-pause") playPause();
}

function nextTrack() {
  void runCommand("next");
}

function previousTrack() {
  void runCommand("previous");
}

function playPause() {
  void runCommand("play-pause");
}

async function runCommand(command: BridgeCommand) {
  const now = Date.now();
  const duplicateCommandThrottleMs = command === "previous" ? 600 : 900;
  if (command === lastCommand && now - lastCommandAt < duplicateCommandThrottleMs) return;

  lastCommand = command;
  lastCommandAt = now;

  if (!androidBridgeConnected) {
    runDemoCommand(command);
    return;
  }

  try {
    await fetch(`${ANDROID_BRIDGE_URL}/command/${command}`, { method: "POST" });
    await refreshNowPlaying();
    scheduleFollowUpRefreshes();
  } catch {
    androidBridgeConnected = false;
    youtubeMusicConnected = false;
    render();
    void renderGlasses();
  }

  sendBridgeCommand(command);
}

function scheduleFollowUpRefreshes() {
  [300, 900, 1800].forEach((delayMs) => {
    window.setTimeout(() => {
      void refreshNowPlaying();
    }, delayMs);
  });
}

function runDemoCommand(command: BridgeCommand) {
  if (command === "next") {
    trackIndex = (trackIndex + 1) % demoTracks.length;
    track = { ...demoTracks[trackIndex], updatedAt: Date.now(), isPlaying: true };
  } else if (command === "previous") {
    trackIndex = (trackIndex + demoTracks.length - 1) % demoTracks.length;
    track = { ...demoTracks[trackIndex], updatedAt: Date.now(), isPlaying: true };
  } else {
    track = { ...track, isPlaying: !track.isPlaying, updatedAt: Date.now() };
  }

  render();
  void renderGlasses();
  sendBridgeCommand(command);
}

function sendBridgeCommand(command: BridgeCommand) {
  window.dispatchEvent(new CustomEvent("even-now-playing-command", { detail: { command } }));
  console.log("[Even Now Playing]", command);
}

async function refreshNowPlaying() {
  try {
    let response = await fetch(`${ANDROID_BRIDGE_URL}/now-playing?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      response = await fetch(`${ANDROID_BRIDGE_URL}/now-playing`, {
        cache: "no-store",
      });
    }
    const data = (await response.json()) as BridgeResponse;

    androidBridgeConnected = data.ok;
    youtubeMusicConnected = data.connected && Boolean(data.track);

    if (data.track) {
      track = {
        title: data.track.title || "Unknown title",
        artist: data.track.artist || "Unknown artist",
        album: data.track.album || undefined,
        isPlaying: data.track.isPlaying,
        durationMs: data.track.durationMs,
        positionMs: data.track.positionMs,
        positionUpdatedAtMs: data.track.positionUpdatedAtMs,
        updatedAt: Date.now(),
      };
    } else if (data.connected) {
      track = {
        title: "Esperando metadata",
        artist: "YouTube Music",
        album: undefined,
        isPlaying: false,
        updatedAt: Date.now(),
      };
    } else {
      track = {
        title: "Abre YouTube Music",
        artist: "Reproduce una cancion para conectar",
        album: undefined,
        isPlaying: false,
        updatedAt: Date.now(),
      };
    }
  } catch {
    androidBridgeConnected = false;
    youtubeMusicConnected = false;
    track = {
      title: "Companion app no detectada",
      artist: "Abre Even Now Playing en Android",
      album: undefined,
      isPlaying: false,
      updatedAt: Date.now(),
    };
  }

  render();
  void renderGlasses();
}

app.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const nextIndex = controls.findIndex((control) => control.action === action);
  if (nextIndex >= 0) selectedControlIndex = nextIndex;
  runControlAction(action ?? "");
});

app.addEventListener("pointerover", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-action]");
  if (!button) return;

  const nextIndex = controls.findIndex((control) => control.action === button.dataset.action);
  if (nextIndex < 0 || nextIndex === selectedControlIndex) return;

  selectedControlIndex = nextIndex;
  render();
  void renderGlasses();
});

render();

void initializeEvenBridge();
void refreshNowPlaying();
window.setInterval(() => {
  void refreshNowPlaying();
}, 2000);

async function initializeEvenBridge() {
  try {
    evenBridge = await withTimeout(waitForEvenAppBridge(), 1500);
    evenBridge.onEvenHubEvent((event) => {
      const normalizedEventType = normalizeEvenEvent(event);

      console.log("[Even Now Playing] EvenHub event", event);
      lastEvenEventSummary = summarizeEvenEvent(event, normalizedEventType);
      render();

      if (normalizedEventType === "click") {
        activateEventControl(event);
      } else if (normalizedEventType === "previous") {
        moveSelection(-1);
      } else if (normalizedEventType === "next") {
        moveSelection(1);
      } else {
        activateEventControl(event);
      }
    });
    await renderGlasses();
  } catch {
    console.info("[Even Now Playing] Running without Even Hub bridge.");
  }
}

function syncSelectionFromListEvent(event: {
  listEvent?: { currentSelectItemIndex?: number; currentSelectItemName?: string };
}) {
  const controlIndex = controlIndexFromListEvent(event);
  if (controlIndex !== undefined) {
    updateSelectedControlIndex(controlIndex);
    return true;
  }

  return false;
}

function controlIndexFromListEvent(event: {
  listEvent?: { currentSelectItemIndex?: number; currentSelectItemName?: string };
}) {
  const itemIndex = event.listEvent?.currentSelectItemIndex;
  const itemName = normalizedControlLabel(event.listEvent?.currentSelectItemName);

  const nameIndex = controls.findIndex((control) => {
    return normalizedControlLabel(displayLabel(control)) === itemName
      || normalizedControlLabel(displayListLabel(control)) === itemName;
  });
  if (nameIndex >= 0) {
    return nameIndex;
  }

  if (typeof itemIndex === "number" && itemIndex >= 0 && itemIndex < controls.length) {
    return itemIndex;
  }

  if (event.listEvent) {
    return 0;
  }

  return undefined;
}

function summarizeEvenEvent(
  event: {
    listEvent?: { eventType?: unknown; currentSelectItemIndex?: number; currentSelectItemName?: string };
    textEvent?: { eventType?: unknown };
    sysEvent?: { eventType?: unknown };
  },
  normalizedEventType: string,
) {
  const listEvent = event.listEvent;
  const rawEventType = listEvent?.eventType ?? event.textEvent?.eventType ?? event.sysEvent?.eventType;
  const itemName = normalizedControlLabel(listEvent?.currentSelectItemName) ?? "-";
  const itemIndex = listEvent?.currentSelectItemIndex ?? "-";
  return `event:${normalizedEventType} raw:${String(rawEventType ?? "-")} idx:${itemIndex} name:${itemName} sel:${selectedControl().action}`;
}

function updateSelectedControlIndex(nextIndex: number) {
  if (nextIndex === selectedControlIndex) return;

  lastActivationAt = 0;
  selectedControlIndex = nextIndex;
  render();
  void renderGlasses();
}

function normalizeEvenEvent(event: {
  listEvent?: { eventType?: unknown };
  textEvent?: { eventType?: unknown };
  sysEvent?: { eventType?: unknown };
}): "click" | "previous" | "next" | "other" {
  const eventType = event.listEvent?.eventType ?? event.textEvent?.eventType ?? event.sysEvent?.eventType;
  const normalized = normalizeEvenEventType(eventType);
  if (normalized !== "other") return normalized;

  if (event.textEvent) return "click";
  return "other";
}

function normalizeEvenEventType(eventType: unknown): "click" | "previous" | "next" | "other" {
  if (eventType === 0 || eventType === "0") return "click";
  if (eventType === 1 || eventType === "1") return "previous";
  if (eventType === 2 || eventType === "2") return "next";

  const value = String(eventType ?? "").toUpperCase();
  if (value.includes("CLICK")) return "click";
  if (value.includes("SCROLL_TOP") || value.includes("LEFT") || value.includes("PREVIOUS")) {
    return "previous";
  }
  if (value.includes("SCROLL_BOTTOM") || value.includes("RIGHT") || value.includes("NEXT")) {
    return "next";
  }
  return "other";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("Timed out")), timeoutMs);
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeout));
  });
}
