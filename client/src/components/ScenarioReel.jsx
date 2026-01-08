import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Spline from "@splinetool/react-spline";
const VISIBLE_COUNT = 7;
const MIN_TRACK_ITEMS = 42;
const SPIN_MIN_DURATION = 3000;
const SPIN_MAX_DURATION = 7000;
const SPIN_ACCEL_MIN = 300;
const SPIN_ACCEL_MAX = 520;
const SPIN_CRUISE_MIN = 600;
const SPIN_CRUISE_MAX = 1200;
const SPIN_DECEL_MIN = 1800; // минимум времени замедления
const OVERLAY_DELAY = 180;
const MIN_FILL = VISIBLE_COUNT + 4;
const DECEL_DISTANCE_MIN = 0.36;
const TILT_MAX = 18; // максимум наклона карточки
const TILT_LERP = 0.18;
const SPLINE_ZOOM = 1.25;
const SPLINE_START_BUTTON_NAMES = new Set([
  "Rectangle2",
  "UI_StartBtn",
  "ULStartBtn",
  "StartButtonHitbox"
]);
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function lerp(min, max, t) {
  return min + (max - min) * t;
}
function createSeededRng(seed) {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }
  return () => {
    value = (value * 16807) % 2147483647;
    return value / 2147483647;
  };
}
function easeInQuad(t) {
  return t * t;
}
function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5);
}
function isStartButtonName(name) {
  if (!name) {
    return false;
  }
  if (SPLINE_START_BUTTON_NAMES.has(name)) {
    return true;
  }
  const normalized = name.toLowerCase();
  return normalized.includes("start") && (normalized.includes("btn") || normalized.includes("button"));
}
function ScenarioReel({
  items = [],
  targetId,
  targetIndex,
  spinTick = 0,
  spinning,
  onStart,
  onStop,
  onReveal,
  onStartTask
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const splineRef = useRef(null);
  const splineFrameRef = useRef(null);
  const splineLogRef = useRef(false);
  const splineVarsLogRef = useRef(false);
  const splineSizeLogRef = useRef(false);
  const splineSizeRetryRef = useRef(0);
  const splineSizeWarnRef = useRef(false);
  const splineWarnRef = useRef({ text: false });
  const splineRuntimeCleanupRef = useRef(null);
  const splinePressCleanupRef = useRef(null);
  const splinePressTargetNameRef = useRef(null);
  const splinePressTargetIdRef = useRef(null);
  const splinePressActiveRef = useRef(false);
  const pendingTextRef = useRef({ title: "", desc: "" });
  const trackRef = useRef(null);
  const viewportRef = useRef(null);
  const rafRef = useRef(null);
  const overlayTimeoutRef = useRef(null);
  const spinIdRef = useRef(0);
  const translateXRef = useRef(0);
  const metricsRef = useRef({ cardWidth: 0, gap: 0, cell: 0, viewport: 0 });
  const isSpinningRef = useRef(false);
  const lastSpinTickRef = useRef(spinTick);
  const tiltRef = useRef({
    frame: null,
    element: null,
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0
  });
  const normalizedItems = useMemo(() => {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }
    const minLength = Math.max(items.length, MIN_FILL);
    return Array.from({ length: minLength }, (_, index) => items[index % items.length]);
  }, [items]);
  const loops = useMemo(() => {
    if (!normalizedItems.length) {
      return 0;
    }
    return Math.max(5, Math.ceil(MIN_TRACK_ITEMS / normalizedItems.length));
  }, [normalizedItems.length]);
  const trackItems = useMemo(() => {
    if (!normalizedItems.length || !loops) {
      return [];
    }
    const size = normalizedItems.length * loops;
    return Array.from({ length: size }, (_, index) => normalizedItems[index % normalizedItems.length]);
  }, [normalizedItems, loops]);
  const baseIndex = useMemo(() => {
    if (!normalizedItems.length) {
      return null;
    }
    if (targetId) {
      const idx = normalizedItems.findIndex((item) => item.id === targetId);
      return idx >= 0 ? idx : null;
    }
    if (targetIndex != null && Number.isFinite(targetIndex)) {
      const normalized = ((targetIndex % normalizedItems.length) + normalizedItems.length) % normalizedItems.length;
      return normalized;
    }
    return null;
  }, [normalizedItems, targetId, targetIndex]);
  const targetTrackIndex =
    baseIndex != null && loops
      ? (loops - 1) * normalizedItems.length + baseIndex
      : null;
  const selectedItem = useMemo(() => {
    if (!items.length) {
      return null;
    }
    if (targetId) {
      return items.find((item) => item.id === targetId) || null;
    }
    if (targetIndex != null && items[targetIndex]) {
      return items[targetIndex];
    }
    return null;
  }, [items, targetId, targetIndex]);
  const selectedItemRef = useRef(selectedItem);
  const overlayVisibleRef = useRef(overlayVisible);
  const onStartTaskRef = useRef(onStartTask);
  useEffect(() => {
    selectedItemRef.current = selectedItem;
  }, [selectedItem]);
  useEffect(() => {
    overlayVisibleRef.current = overlayVisible;
  }, [overlayVisible]);
  useEffect(() => {
    onStartTaskRef.current = onStartTask;
  }, [onStartTask]);
  const applySplineText = useCallback((titleText, descText) => {
    const spline = splineRef.current;
    if (!spline) {
      return;
    }
    // Spline scene must define string variables vTitle/vDesc bound to ULTitle/ULDesc.
    const canBatch = typeof spline.setVariables === "function";
    const canSingle = typeof spline.setVariable === "function";
    if (canBatch) {
      spline.setVariables({ vTitle: titleText, vDesc: descText });
    } else if (canSingle) {
      spline.setVariable("vTitle", titleText);
      spline.setVariable("vDesc", descText);
    } else if (import.meta.env.DEV && !splineWarnRef.current.text) {
      splineWarnRef.current.text = true;
      console.warn(
        "[Spline] setVariables/setVariable is unavailable. Create vTitle/vDesc variables in Spline."
      );
      return;
    }
    if (import.meta.env.DEV && !splineVarsLogRef.current) {
      splineVarsLogRef.current = true;
      console.info("[Spline] Variables updated (vTitle/vDesc).");
    }
  }, []);
  const clearSplinePressState = useCallback(() => {
    splinePressTargetNameRef.current = null;
    splinePressTargetIdRef.current = null;
    splinePressActiveRef.current = false;
    if (splinePressCleanupRef.current) {
      splinePressCleanupRef.current();
      splinePressCleanupRef.current = null;
    }
  }, []);
  const triggerSplineStart = useCallback(() => {
    if (!overlayVisibleRef.current) {
      return;
    }
    overlayVisibleRef.current = false;
    if (import.meta.env.DEV) {
      console.info("[Spline] closing overlay");
    }
    setOverlayVisible(false);
    const startHandler = onStartTaskRef.current;
    if (typeof startHandler === "function") {
      startHandler(selectedItemRef.current);
    }
  }, []);
  const finalizeSplinePress = useCallback(
    (source) => {
      if (!splinePressActiveRef.current) {
        return;
      }
      const targetName = splinePressTargetNameRef.current;
      const targetId = splinePressTargetIdRef.current;
      if (import.meta.env.DEV) {
        console.info(
          `[Spline] runtime press released (${source}): ${targetName || "unknown"}${
            targetId ? ` (id: ${targetId})` : ""
          }`
        );
      }
      clearSplinePressState();
      if (isStartButtonName(targetName)) {
        triggerSplineStart();
      }
    },
    [clearSplinePressState, triggerSplineStart]
  );
  const cancelSplinePress = useCallback(
    (source) => {
      if (!splinePressActiveRef.current) {
        return;
      }
      if (import.meta.env.DEV) {
        console.info(`[Spline] runtime press cancelled (${source}).`);
      }
      clearSplinePressState();
    },
    [clearSplinePressState]
  );
  const attachGlobalSplinePressListeners = useCallback(() => {
    if (splinePressCleanupRef.current) {
      return;
    }
    const handlePointerUp = () => finalizeSplinePress("pointerup");
    const handlePointerCancel = () => cancelSplinePress("pointercancel");
    const handleBlur = () => cancelSplinePress("blur");
    const handleVisibility = () => {
      if (document.hidden) {
        cancelSplinePress("visibilitychange");
      }
    };
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchend", handlePointerUp);
    window.addEventListener("touchcancel", handlePointerCancel);
    splinePressCleanupRef.current = () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchend", handlePointerUp);
      window.removeEventListener("touchcancel", handlePointerCancel);
    };
  }, [cancelSplinePress, finalizeSplinePress]);
  const handleSplineRuntimeMouseDown = useCallback(
    (event) => {
      const targetName = event?.target?.name;
      const targetId = event?.target?.id;
      if (import.meta.env.DEV) {
        console.info(
          `[Spline] runtime mouseDown target: ${targetName || "unknown"}${targetId ? ` (id: ${targetId})` : ""}`
        );
      }
      if (!overlayVisibleRef.current) {
        return;
      }
      if (!isStartButtonName(targetName)) {
        return;
      }
      splinePressTargetNameRef.current = targetName || null;
      splinePressTargetIdRef.current = targetId ?? null;
      splinePressActiveRef.current = true;
      attachGlobalSplinePressListeners();
    },
    [attachGlobalSplinePressListeners]
  );
  const handleSplineRuntimeMouseUp = useCallback(
    (event) => {
      const targetName = event?.target?.name;
      const targetId = event?.target?.id;
      if (import.meta.env.DEV) {
        console.info(
          `[Spline] runtime mouseUp target: ${targetName || "unknown"}${targetId ? ` (id: ${targetId})` : ""}`
        );
      }
      finalizeSplinePress("mouseUp");
    },
    [finalizeSplinePress]
  );
  const attachSplineRuntimeListeners = useCallback(
    (splineApp) => {
      if (!splineApp || typeof splineApp.addEventListener !== "function") {
        return null;
      }
      splineApp.addEventListener("mouseDown", handleSplineRuntimeMouseDown);
      splineApp.addEventListener("mouseUp", handleSplineRuntimeMouseUp);
      if (import.meta.env.DEV) {
        console.info("[Spline] runtime listener attached (mouseDown/mouseUp).");
      }
      return () => {
        splineApp.removeEventListener("mouseDown", handleSplineRuntimeMouseDown);
        splineApp.removeEventListener("mouseUp", handleSplineRuntimeMouseUp);
        if (import.meta.env.DEV) {
          console.info("[Spline] runtime listener removed (mouseDown/mouseUp).");
        }
      };
    },
    [handleSplineRuntimeMouseDown, handleSplineRuntimeMouseUp]
  );
  const handleSplineLoad = useCallback(
    (spline) => {
      splineRef.current = spline;
      if (typeof spline.setGlobalEvents === "function") {
        // Ensure pointer events fire even if Spline object events are not local.
        spline.setGlobalEvents(true);
      }
      if (typeof spline.setZoom === "function") {
        spline.setZoom(SPLINE_ZOOM);
      }
      if (import.meta.env.DEV && !splineLogRef.current) {
        splineLogRef.current = true;
        const missing = [];
        if (missing.length) {
          console.warn(
            `[Spline] Missing objects: ${missing.join(", ")}. Check Spline object names.`
          );
        } else {
          console.info("[Spline] Objects ready: ULTitle, ULDesc.");
        }
      }
      const pending = pendingTextRef.current;
      applySplineText(pending.title, pending.desc);
      if (splineRuntimeCleanupRef.current) {
        splineRuntimeCleanupRef.current();
      }
      splineRuntimeCleanupRef.current = attachSplineRuntimeListeners(spline);
      if (import.meta.env.DEV && !splineSizeLogRef.current) {
        splineSizeRetryRef.current = 0;
        splineSizeWarnRef.current = false;
        const logSplineSize = () => {
          const frame = splineFrameRef.current;
          const frameRect = frame ? frame.getBoundingClientRect() : null;
          const canvas = frame ? frame.querySelector("canvas") : null;
          const canvasRect = canvas ? canvas.getBoundingClientRect() : null;
          const frameReady =
            frameRect && frameRect.width > 0 && frameRect.height > 0;
          const canvasReady =
            canvasRect && canvasRect.width > 0 && canvasRect.height > 0;
          if (!frameReady || !canvasReady) {
            splineSizeRetryRef.current += 1;
            if (splineSizeRetryRef.current <= 6 && overlayVisibleRef.current) {
              requestAnimationFrame(logSplineSize);
              return;
            }
            if (!splineSizeWarnRef.current) {
              splineSizeWarnRef.current = true;
              console.info("[Spline] Frame/canvas size not ready; skipping size log.");
            }
            return;
          }
          splineSizeLogRef.current = true;
          const frameLabel = `${Math.round(frameRect.width)}x${Math.round(frameRect.height)}`;
          const canvasLabel = `${Math.round(canvasRect.width)}x${Math.round(canvasRect.height)}`;
          const bufferLabel = canvas ? `${canvas.width}x${canvas.height}` : "n/a";
          console.info(
            `[Spline] Frame ${frameLabel}; Canvas rect ${canvasLabel}; Canvas buffer ${bufferLabel}.`
          );
        };
        requestAnimationFrame(logSplineSize);
      }
    },
    [applySplineText, attachSplineRuntimeListeners]
  );
  const setTranslateX = useCallback((x, snap = false) => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    if (snap) {
      track.style.transition = "none";
    }
    track.style.transform = `translate3d(${x}px, 0, 0)`;
    translateXRef.current = x;
  }, []);
  const setTrackWillChange = useCallback((value) => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    track.style.willChange = value;
  }, []);
  const stepTilt = useCallback(() => {
    const state = tiltRef.current;
    if (!state.element) {
      state.frame = null;
      return;
    }
    state.currentX += (state.targetX - state.currentX) * TILT_LERP;
    state.currentY += (state.targetY - state.currentY) * TILT_LERP;
    state.element.style.setProperty("--tilt-x", `${state.currentX.toFixed(2)}deg`);
    state.element.style.setProperty("--tilt-y", `${state.currentY.toFixed(2)}deg`);
    if (
      Math.abs(state.targetX - state.currentX) < 0.05 &&
      Math.abs(state.targetY - state.currentY) < 0.05
    ) {
      state.frame = null;
      return;
    }
    state.frame = requestAnimationFrame(stepTilt);
  }, []);
  const scheduleTilt = useCallback(
    (element, targetX, targetY) => {
      const state = tiltRef.current;
      state.element = element;
      state.targetX = targetX;
      state.targetY = targetY;
      if (state.frame == null) {
        state.frame = requestAnimationFrame(stepTilt);
      }
    },
    [stepTilt]
  );
  const handlePointerMove = useCallback(
    (event) => {
      if (event.pointerType && event.pointerType !== "mouse") {
        return;
      }
      const card = event.currentTarget;
      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const nx = x / rect.width - 0.5;
      const ny = y / rect.height - 0.5;
      const tiltX = clamp(-ny * TILT_MAX, -TILT_MAX, TILT_MAX);
      const tiltY = clamp(nx * TILT_MAX, -TILT_MAX, TILT_MAX);
      scheduleTilt(card, tiltX, tiltY);
    },
    [scheduleTilt]
  );
  const handlePointerLeave = useCallback((event) => {
    if (event.pointerType && event.pointerType !== "mouse") {
      return;
    }
    const card = event.currentTarget;
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
    const state = tiltRef.current;
    if (state.element === card) {
      if (state.frame != null) {
        cancelAnimationFrame(state.frame);
      }
      state.frame = null;
      state.element = null;
      state.targetX = 0;
      state.targetY = 0;
      state.currentX = 0;
      state.currentY = 0;
    }
  }, []);
  const measure = useCallback(() => {
    const track = trackRef.current;
    const viewport = viewportRef.current;
    if (!track || !viewport) {
      return null;
    }
    const card = track.querySelector(".reel-card");
    if (!card) {
      return null;
    }
    const cardWidth = card.getBoundingClientRect().width;
    const styles = window.getComputedStyle(track);
    const gapValue = parseFloat(styles.columnGap || styles.gap || "0");
    const gap = Number.isFinite(gapValue) ? gapValue : 0;
    const viewportWidth = viewport.getBoundingClientRect().width;
    metricsRef.current = {
      cardWidth,
      gap,
      cell: cardWidth + gap,
      viewport: viewportWidth
    };
    return metricsRef.current;
  }, []);
  const snapToIndex = useCallback(
    (index) => {
      if (index == null) {
        return;
      }
      const metrics = metricsRef.current;
      if (!metrics.cell || !metrics.viewport) {
        return;
      }
      const targetCenter = index * metrics.cell + metrics.cardWidth / 2;
      const x = Math.round(metrics.viewport / 2 - targetCenter);
      setTranslateX(x, true);
    },
    [setTranslateX]
  );
  useLayoutEffect(() => {
    if (trackItems.length) {
      measure();
    }
  }, [trackItems.length, measure]);
  useEffect(() => {
    const handleResize = () => {
      if (isSpinningRef.current) {
        return;
      }
      if (!measure()) {
        return;
      }
      if (targetTrackIndex != null) {
        snapToIndex(targetTrackIndex);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [measure, snapToIndex, targetTrackIndex]);
  useEffect(() => {
    if (!trackItems.length || isAnimating) {
      return;
    }
    if (targetTrackIndex != null) {
      snapToIndex(targetTrackIndex);
      return;
    }
    if (!measure()) {
      return;
    }
    setTranslateX(0, true);
  }, [trackItems.length, targetTrackIndex, isAnimating, measure, snapToIndex, setTranslateX]);
  useEffect(() => {
    if (!spinning) {
      return;
    }
    setOverlayVisible(false);
  }, [spinning]);
  useEffect(() => {
    if (!overlayVisible) {
      if (splineRuntimeCleanupRef.current) {
        splineRuntimeCleanupRef.current();
        splineRuntimeCleanupRef.current = null;
      }
      clearSplinePressState();
      splineRef.current = null;
      splineSizeRetryRef.current = 0;
      splineSizeWarnRef.current = false;
      splineSizeLogRef.current = false;
    }
  }, [clearSplinePressState, overlayVisible]);
  const beginSpin = useCallback(() => {
    if (!trackItems.length || targetTrackIndex == null) {
      return;
    }
    if (overlayTimeoutRef.current) {
      window.clearTimeout(overlayTimeoutRef.current);
      overlayTimeoutRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const metrics = measure();
    if (!metrics || !metrics.cell || !metrics.viewport) {
      return;
    }
    spinIdRef.current += 1;
    const spinId = spinIdRef.current;
    setOverlayVisible(false);
    setIsAnimating(true);
    isSpinningRef.current = true;
    setTrackWillChange("transform");
    if (typeof onStart === "function") {
      onStart();
    }
    const seed =
      (spinTick + 1) * 97 +
      (targetTrackIndex + 1) * 31 +
      normalizedItems.length * 13;
    const rng = createSeededRng(seed);
    const startIndex = Math.floor(rng() * Math.min(normalizedItems.length, 5));
    const startCenter = startIndex * metrics.cell + metrics.cardWidth / 2;
    const startX = Math.round(metrics.viewport / 2 - startCenter);
    setTranslateX(startX, true);
    const targetCenter = targetTrackIndex * metrics.cell + metrics.cardWidth / 2;
    const finalX = Math.round(metrics.viewport / 2 - targetCenter);
    const duration = Math.round(lerp(SPIN_MIN_DURATION, SPIN_MAX_DURATION, rng()));
    let accelMs = lerp(SPIN_ACCEL_MIN, SPIN_ACCEL_MAX, rng());
    let cruiseMs = lerp(SPIN_CRUISE_MIN, SPIN_CRUISE_MAX, rng());
    let decelMs = duration - accelMs - cruiseMs;
    if (decelMs < SPIN_DECEL_MIN) {
      const deficit = SPIN_DECEL_MIN - decelMs;
      cruiseMs = Math.max(SPIN_CRUISE_MIN, cruiseMs - deficit);
      decelMs = duration - accelMs - cruiseMs;
    }
    const tA = accelMs / duration;
    const tB = (accelMs + cruiseMs) / duration;
    let distA = lerp(0.1, 0.14, rng());
    let distB = lerp(0.38, 0.48, rng());
    let distC = 1 - distA - distB;
    if (distC < DECEL_DISTANCE_MIN) {
      distB = Math.max(distB - (DECEL_DISTANCE_MIN - distC), 0.3);
      distC = 1 - distA - distB;
    }
    const progressAt = (t) => {
      if (t <= tA) {
        const local = tA > 0 ? t / tA : 1;
        return easeInQuad(local) * distA;
      }
      if (t <= tB) {
        const local = (t - tA) / Math.max(tB - tA, 0.0001);
        return distA + local * distB;
      }
      const local = (t - tB) / Math.max(1 - tB, 0.0001);
      return distA + distB + easeOutQuint(local) * distC;
    };
    const finishSpin = () => {
      if (spinIdRef.current !== spinId) {
        return;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setTranslateX(finalX, true);
      setTrackWillChange("auto");
      setIsAnimating(false);
      isSpinningRef.current = false;
      const item = selectedItemRef.current;
      if (typeof onStop === "function") {
        onStop(item);
      }
      overlayTimeoutRef.current = window.setTimeout(() => {
        if (spinIdRef.current !== spinId) {
          return;
        }
        setOverlayVisible(true);
        if (typeof onReveal === "function") {
          onReveal(item);
        }
      }, OVERLAY_DELAY);
    };
    const startTime = performance.now();
    const tick = (now) => {
      if (spinIdRef.current !== spinId) {
        return;
      }
      const t = clamp((now - startTime) / duration, 0, 1);
      const progress = progressAt(t);
      const x = startX + (finalX - startX) * progress;
      setTranslateX(x);
      if (t >= 1) {
        finishSpin();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [
    measure,
    normalizedItems.length,
    onReveal,
    onStart,
    onStop,
    setTrackWillChange,
    setTranslateX,
    spinTick,
    targetTrackIndex,
    trackItems.length
  ]);
  useEffect(() => {
    if (targetTrackIndex == null || !trackItems.length) {
      return;
    }
    if (lastSpinTickRef.current === spinTick) {
      return;
    }
    lastSpinTickRef.current = spinTick;
    beginSpin();
  }, [beginSpin, spinTick, targetTrackIndex, trackItems.length]);
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (overlayTimeoutRef.current) {
        window.clearTimeout(overlayTimeoutRef.current);
        overlayTimeoutRef.current = null;
      }
      if (tiltRef.current.frame != null) {
        cancelAnimationFrame(tiltRef.current.frame);
        tiltRef.current.frame = null;
      }
      if (splineRuntimeCleanupRef.current) {
        splineRuntimeCleanupRef.current();
        splineRuntimeCleanupRef.current = null;
      }
      isSpinningRef.current = false;
      setTrackWillChange("auto");
    };
  }, [setTrackWillChange]);
  const isBusy = spinning || isAnimating;
  const statusText = (() => {
    if (!items.length) {
      return "Нет сценариев";
    }
    if (isBusy && targetTrackIndex == null) {
      return "Получаем результат...";
    }
    if (isBusy) {
      return "Лента в движении...";
    }
    if (targetTrackIndex != null) {
      return "Остановились на результате";
    }
    return "Ожидание запуска";
  })();
  const titleText =
    selectedItem?.shortTitle ||
    selectedItem?.label ||
    selectedItem?.title ||
    "Задание";
  // Текст задания/сценария для отображения на Spline-карточке
  const descText =
    selectedItem?.text ||
    selectedItem?.description ||
    selectedItem?.finalText ||
    "";
  useEffect(() => {
    pendingTextRef.current = { title: titleText, desc: descText };
    if (!overlayVisible) {
      return;
    }
    if (splineRef.current) {
      applySplineText(titleText, descText);
    }
  }, [applySplineText, descText, overlayVisible, titleText]);
  if (!trackItems.length) {
    return null;
  }

  return (
    <div className={`scenario-reel${isBusy ? " is-spinning" : ""}`}>
      <div className="scenario-reel__header">
        <div className="scenario-reel__title">Лента сценариев</div>
        <div className="scenario-reel__status">{statusText}</div>
      </div>
      <div className="reel-viewport" ref={viewportRef}>
        <div className="reel-centerline" aria-hidden="true" />
        <div className="reel-track" ref={trackRef}>
          {trackItems.map((item, index) => {
            const isSelected =
              targetTrackIndex != null &&
              index === targetTrackIndex &&
              !isBusy;
            return (
              <div
                key={`${item.id}-${index}`}
                className={`reel-card${isSelected ? " is-selected" : ""}`}
                style={{ "--card-hue": (index * 34) % 360 }}
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
              >
                <div className="reel-card__glow" aria-hidden="true" />
                <div className="reel-card__title">
                  {item.shortTitle || item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {overlayVisible && selectedItem
        ? createPortal(
            <div className="reel-overlay">
              <div className="reel-overlay__backdrop" aria-hidden="true" />
                <div
                  className="reel-overlay__stage"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="reel-overlay__anim" aria-hidden="true" />
                  <div className="reel-overlay__spline-frame" ref={splineFrameRef}>
                    <div className="reel-overlay__spline-wrap">
                      <Spline
                        className="reel-overlay__spline"
                      scene="https://prod.spline.design/G4ffd9GW5IJbuhml/scene.splinecode"
                      onLoad={handleSplineLoad}
                    />
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
export default ScenarioReel;
