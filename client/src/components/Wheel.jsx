import { useEffect, useMemo, useRef, useState } from "react";

const SEGMENT_COLORS = [
  "#0e7687",
  "#b43145",
  "#c9a13b",
  "#1f8b67",
  "#2d5aa8",
  "#c86a2a"
];
const MAX_LABEL_WORDS = 2;
const MAX_LABEL_CHARS = 18;
const SPIN_MIN_DURATION = 5200;
const SPIN_MAX_DURATION = 7600;
const SPIN_MIN_TURNS = 5;
const SPIN_MAX_TURNS = 8;
const SPIN_REVEAL_MIN_DELAY = 160;
const SPIN_REVEAL_MAX_DELAY = 280;
// Enable with ?wheelDebug=1.
const WHEEL_DEBUG =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("wheelDebug");

const dlog = (...args) => {
  if (WHEEL_DEBUG) {
    console.log(...args);
  }
};

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

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5);
}

function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360;
}

function finalAngleForIndex(index, segmentAngle) {
  return normalizeAngle(360 - index * segmentAngle - segmentAngle / 2);
}

function indexFromAngle(angle, segmentAngle, total) {
  if (!total) {
    return null;
  }
  const normalized = normalizeAngle(-angle);
  return Math.floor(normalized / segmentAngle) % total;
}

function makeShortLabel(text) {
  const normalized = String(text ?? "").trim();
  if (!normalized) {
    return "";
  }
  const words = normalized.split(/\s+/).slice(0, MAX_LABEL_WORDS);
  let short = words.join(" ");
  if (short.length > MAX_LABEL_CHARS) {
    short = `${short.slice(0, Math.max(MAX_LABEL_CHARS - 3, 1))}...`;
  }
  return short;
}

function buildSegmentGradient(total) {
  if (!total) {
    return "none";
  }
  const segment = 360 / total;
  const stops = [];
  for (let i = 0; i < total; i += 1) {
    const start = segment * i;
    const end = start + segment;
    const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
    stops.push(`${color} ${start.toFixed(3)}deg ${end.toFixed(3)}deg`);
  }
  return `conic-gradient(${stops.join(", ")})`;
}

function buildHighlightGradient(index, total) {
  if (index == null || !total) {
    return "none";
  }
  const segment = 360 / total;
  const start = segment * index;
  const end = start + segment;
  return (
    `conic-gradient(` +
    `transparent 0deg ${start.toFixed(3)}deg, ` +
    `rgba(255, 214, 122, 0.55) ${start.toFixed(3)}deg ${end.toFixed(3)}deg, ` +
    `transparent ${end.toFixed(3)}deg 360deg)`
  );
}

function readAngleFromElement(element) {
  if (!element) {
    return 0;
  }
  const transform = getComputedStyle(element).transform;
  if (!transform || transform === "none") {
    return 0;
  }
  try {
    const MatrixCtor =
      typeof DOMMatrixReadOnly !== "undefined"
        ? DOMMatrixReadOnly
        : typeof DOMMatrix !== "undefined"
        ? DOMMatrix
        : null;
    if (MatrixCtor) {
      const matrix = new MatrixCtor(transform);
      return normalizeAngle((Math.atan2(matrix.b, matrix.a) * 180) / Math.PI);
    }
  } catch {
    // Fall through to manual parse.
  }
  const match = transform.match(/^matrix\((.+)\)$/);
  if (!match) {
    return 0;
  }
  const parts = match[1].split(",");
  const a = parseFloat(parts[0]);
  const b = parseFloat(parts[1]);
  return normalizeAngle((Math.atan2(b, a) * 180) / Math.PI);
}

function Wheel({
  title,
  items,
  spinIndex,
  spinTick,
  spinning,
  selectedIndex,
  resultLabel,
  resultText,
  onReveal
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const rotorRef = useRef(null);
  const pointerRef = useRef(null);
  const rafIdRef = useRef(null);
  const spinIdRef = useRef(0);
  const angleRef = useRef(0);
  const phaseRef = useRef("idle");
  const revealTimeoutRef = useRef(null);
  const pointerKickTimeoutRef = useRef(null);
  const lastTickAtRef = useRef(0);
  const lastDetentRef = useRef(0);
  const lastLogRef = useRef(0);
  const lastFrameAtRef = useRef(0);
  const lastAngleRef = useRef(0);
  const onRevealRef = useRef(onReveal);

  const safeSelectedIndex =
    selectedIndex != null && selectedIndex >= 0 && selectedIndex < items.length
      ? selectedIndex
      : null;
  const safeSpinIndex =
    spinIndex != null && spinIndex >= 0 && spinIndex < items.length ? spinIndex : null;
  const highlightIndex =
    isRevealed && (safeSelectedIndex != null || safeSpinIndex != null)
      ? safeSelectedIndex ?? safeSpinIndex
      : null;

  const segmentAngle = items.length ? 360 / items.length : 0;
  const shortLabels = useMemo(() => items.map(makeShortLabel), [items]);
  const segmentGradient = useMemo(
    () => buildSegmentGradient(items.length),
    [items.length]
  );
  const surfaceStyle = useMemo(
    () => ({
      backgroundImage:
        `radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.08), transparent 45%), ` +
        segmentGradient
    }),
    [segmentGradient]
  );
  const highlightGradient = useMemo(
    () => buildHighlightGradient(highlightIndex, items.length),
    [highlightIndex, items.length]
  );

  useEffect(() => {
    onRevealRef.current = onReveal;
  }, [onReveal]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
        revealTimeoutRef.current = null;
      }
      if (pointerKickTimeoutRef.current) {
        clearTimeout(pointerKickTimeoutRef.current);
        pointerKickTimeoutRef.current = null;
      }
      phaseRef.current = "idle";
      spinIdRef.current += 1;
    };
  }, []);

  const applyAngle = (angle, force = false) => {
    const rotor = rotorRef.current;
    if (!rotor) {
      return;
    }
    if (phaseRef.current === "stopped" && !force) {
      return;
    }
    angleRef.current = angle;
    rotor.style.transform = `rotate(${angle}deg)`;
  };

  useEffect(() => {
    if (safeSpinIndex != null || spinning) {
      return;
    }
    if (!items.length) {
      applyAngle(0, true);
      return;
    }
    if (safeSelectedIndex == null) {
      return;
    }
    const target = finalAngleForIndex(safeSelectedIndex, segmentAngle);
    applyAngle(target, true);
  }, [items.length, safeSelectedIndex, safeSpinIndex, segmentAngle, spinning]);

  useEffect(() => {
    if (!spinning) {
      return;
    }
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
    setIsRevealed(false);
  }, [spinning]);

  useEffect(() => {
    if (safeSpinIndex == null || !items.length) {
      return;
    }
    const rotor = rotorRef.current;
    if (!rotor) {
      return;
    }

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
    if (pointerKickTimeoutRef.current) {
      clearTimeout(pointerKickTimeoutRef.current);
      pointerKickTimeoutRef.current = null;
    }

    spinIdRef.current += 1;
    const spinId = spinIdRef.current;
    phaseRef.current = "spinning";
    setIsRevealed(false);
    setIsAnimating(true);
    lastTickAtRef.current = 0;
    lastLogRef.current = 0;
    lastFrameAtRef.current = 0;
    lastAngleRef.current = angleRef.current;

    const seed =
      (spinTick + 1) * 131 + (safeSpinIndex + 1) * 17 + items.length * 29;
    const rng = createSeededRng(seed);
    const extraTurns = Math.floor(lerp(SPIN_MIN_TURNS, SPIN_MAX_TURNS + 1, rng()));
    const targetAngle = finalAngleForIndex(safeSpinIndex, segmentAngle);
    const normalizedStart = normalizeAngle(angleRef.current);
    const deltaToTarget = normalizeAngle(targetAngle - normalizedStart);
    const startAngle = angleRef.current;
    const finalAngle = startAngle + 360 * extraTurns + deltaToTarget;
    const totalAngle = finalAngle - startAngle;

    if (WHEEL_DEBUG) {
      dlog(
        `[SPIN_START sid=${spinId}] index=${safeSpinIndex} ` +
          `startAngle=${normalizeAngle(startAngle).toFixed(3)} ` +
          `finalAngle=${normalizeAngle(finalAngle).toFixed(3)} ` +
          `segmentAngle=${segmentAngle.toFixed(3)} direction=cw`
      );
    }

    const duration = Math.round(lerp(SPIN_MIN_DURATION, SPIN_MAX_DURATION, rng()));
    let accelMs = lerp(350, 650, rng());
    let plateauMs = lerp(900, 1400, rng());
    let finalMs = lerp(900, 1400, rng());
    let decelMs = duration - accelMs - plateauMs - finalMs;
    if (decelMs < 2400) {
      const shortfall = 2400 - decelMs;
      const plateauRoom = Math.max(plateauMs - 650, 0);
      const reducePlateau = Math.min(plateauRoom, shortfall * 0.6);
      plateauMs -= reducePlateau;
      const remaining = shortfall - reducePlateau;
      finalMs = Math.max(700, finalMs - remaining);
      decelMs = duration - accelMs - plateauMs - finalMs;
    }

    const tA = accelMs / duration;
    const tB = (accelMs + plateauMs) / duration;
    const tC = (accelMs + plateauMs + decelMs) / duration;

    let distA = lerp(0.08, 0.12, rng());
    let distB = lerp(0.26, 0.34, rng());
    let distD = lerp(0.12, 0.18, rng());
    let distC = 1 - distA - distB - distD;
    if (distC < 0.32) {
      const deficit = 0.32 - distC;
      const adjust = Math.min(deficit, Math.max(distB - 0.18, 0));
      distB -= adjust;
      distC = 1 - distA - distB - distD;
    }

    const revealDelay = Math.round(
      lerp(SPIN_REVEAL_MIN_DELAY, SPIN_REVEAL_MAX_DELAY, rng())
    );

    lastDetentRef.current = Math.floor(startAngle / segmentAngle);

    if (pointerRef.current) {
      pointerRef.current.style.setProperty("--pointer-kick", "0deg");
      pointerRef.current.style.setProperty("--pointer-lift", "0px");
    }

    const startTime = performance.now();
    lastFrameAtRef.current = startTime;
    lastAngleRef.current = startAngle;

    const progressAt = (t) => {
      if (t <= tA) {
        const local = tA > 0 ? t / tA : 1;
        return easeInQuad(local) * distA;
      }
      if (t <= tB) {
        const local = (t - tA) / Math.max(tB - tA, 0.0001);
        return distA + local * distB;
      }
      if (t <= tC) {
        const local = (t - tB) / Math.max(tC - tB, 0.0001);
        return distA + distB + easeOutCubic(local) * distC;
      }
      const local = (t - tC) / Math.max(1 - tC, 0.0001);
      return distA + distB + distC + easeOutQuint(local) * distD;
    };

    const triggerPointerTick = (strength, now) => {
      const pointer = pointerRef.current;
      if (!pointer) {
        return;
      }
      if (now - lastTickAtRef.current < 32) {
        return;
      }
      lastTickAtRef.current = now;
      if (pointerKickTimeoutRef.current) {
        clearTimeout(pointerKickTimeoutRef.current);
      }
      const kick = -(3 + 8 * strength);
      const lift = -(1 + 4 * strength);
      pointer.style.setProperty("--pointer-kick", `${kick}deg`);
      pointer.style.setProperty("--pointer-lift", `${lift}px`);
      pointerKickTimeoutRef.current = window.setTimeout(() => {
        if (!pointerRef.current) {
          return;
        }
        pointerRef.current.style.setProperty("--pointer-kick", "0deg");
        pointerRef.current.style.setProperty("--pointer-lift", "0px");
      }, 110);
    };

    const finishSpin = () => {
      if (phaseRef.current !== "spinning") {
        return;
      }
      phaseRef.current = "stopped";
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      applyAngle(finalAngle, true);
      if (WHEEL_DEBUG) {
        const normalizedFinal = normalizeAngle(finalAngle);
        const computedIndex = indexFromAngle(normalizedFinal, segmentAngle, items.length);
        dlog(
          `[STOP sid=${spinId}] finalAngle=${normalizedFinal.toFixed(3)} ` +
            `computedIndex=${computedIndex} spinIndex=${safeSpinIndex}`
        );
        const assertionOk = computedIndex === safeSpinIndex;
        dlog(
          `[ASSERT sid=${spinId}] ${assertionOk ? "OK" : "FAIL"} ` +
            `computedIndex=${computedIndex} spinIndex=${safeSpinIndex}`
        );
        if (!assertionOk) {
          dlog("[ASSERT_FAIL] spinIndex mismatch", {
            spinIndex: safeSpinIndex,
            computedIndex,
            segmentAngle: Number(segmentAngle.toFixed(3)),
            normalizedAngle: Number(normalizedFinal.toFixed(3)),
            pointerBase: Number(normalizeAngle(-normalizedFinal).toFixed(3))
          });
        }
        [0, 50, 150].forEach((delay) => {
          window.setTimeout(() => {
            if (spinIdRef.current !== spinId) {
              return;
            }
            const currentAngle = readAngleFromElement(rotor);
            const delta = normalizeAngle(currentAngle - normalizedFinal);
            dlog(
              `[POST_CHECK sid=${spinId}] after ${delay}ms angle=${currentAngle.toFixed(3)} ` +
                `expected=${normalizedFinal.toFixed(3)} delta=${delta.toFixed(3)}`
            );
          }, delay);
        });
      }
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
      }
      const revealSpinId = spinId;
      revealTimeoutRef.current = window.setTimeout(() => {
        if (spinIdRef.current !== revealSpinId) {
          return;
        }
        setIsAnimating(false);
        setIsRevealed(true);
        if (typeof onRevealRef.current === "function") {
          onRevealRef.current();
        }
      }, revealDelay);
    };

    const tick = (now) => {
      if (spinIdRef.current !== spinId || phaseRef.current !== "spinning") {
        return;
      }
      const raw = (now - startTime) / duration;
      const t = clamp(raw, 0, 1);
      const progress = clamp(progressAt(t), 0, 1);
      const angle = startAngle + totalAngle * progress;
      applyAngle(angle);

      const detentIndex = Math.floor(angle / segmentAngle);
      if (detentIndex > lastDetentRef.current) {
        lastDetentRef.current = detentIndex;
        const tickStrength = tB < 1 ? 0.2 + 0.8 * clamp((t - tB) / (1 - tB), 0, 1) : 1;
        triggerPointerTick(tickStrength, now);
      }

      const dt = Math.max(now - lastFrameAtRef.current, 1);
      const velocity = (angle - lastAngleRef.current) / dt;
      lastFrameAtRef.current = now;
      lastAngleRef.current = angle;

      if (WHEEL_DEBUG && now - lastLogRef.current >= 80) {
        lastLogRef.current = now;
        dlog(
          `[FRAME sid=${spinId}] t=${t.toFixed(4)} angle=${angle.toFixed(3)} ` +
            `vel=${velocity.toFixed(4)} phase=${phaseRef.current}`
        );
      }

      if (t >= 1) {
        finishSpin();
        return;
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      phaseRef.current = "idle";
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
        revealTimeoutRef.current = null;
      }
      if (pointerKickTimeoutRef.current) {
        clearTimeout(pointerKickTimeoutRef.current);
        pointerKickTimeoutRef.current = null;
      }
    };
  }, [items.length, safeSpinIndex, segmentAngle, spinTick]);

  useEffect(() => {
    if (safeSpinIndex != null || spinning) {
      return;
    }
    setIsAnimating(false);
  }, [safeSpinIndex, spinning]);

  const fallbackResult =
    safeSelectedIndex != null && items[safeSelectedIndex] ? items[safeSelectedIndex] : "";
  const resultValue = resultText || fallbackResult;
  const isSpinning = spinning || isAnimating;
  const revealedValue = isRevealed ? resultValue : "";
  const displayValue = revealedValue || (isSpinning ? "..." : "");
  const displayLabel = displayValue ? resultLabel || "Result" : "";

  return (
    <div className={`casino-wheel${isSpinning ? " is-spinning" : ""}`}>
      <div className="casino-wheel__title">{title}</div>
      <div className="casino-wheel__frame">
          <div className="casino-wheel__rotor" ref={rotorRef}>
            <div
              className="casino-wheel__surface"
              style={surfaceStyle}
            />
          {highlightIndex != null ? (
            <div
              className="casino-wheel__highlight"
              style={{ backgroundImage: highlightGradient }}
            />
          ) : null}
          <div className="casino-wheel__labels">
            {shortLabels.map((label, index) => (
              <div
                key={`${label}-${index}`}
                className="casino-wheel__label"
                style={{ "--label-angle": `${index * segmentAngle + segmentAngle / 2}deg` }}
                title={items[index]}
              >
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="casino-wheel__hub" />
        </div>
        <div className="casino-wheel__pointer" ref={pointerRef} />
      </div>
      {displayValue ? (
        <div className="casino-wheel__result">
          <div className="casino-wheel__result-label">{displayLabel}</div>
          <div className="casino-wheel__result-value">{displayValue}</div>
        </div>
      ) : null}
    </div>
  );
}

export default Wheel;
