import { useEffect, useRef } from "react";

const cx = (...classes) => classes.filter(Boolean).join(" ");

function GooeyText({
  texts,
  morphTime = 1,
  cooldownTime = 0.25,
  className = "",
  textClassName = "",
  filterId = "gooey-threshold",
}) {
  const text1Ref = useRef(null);
  const text2Ref = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!Array.isArray(texts) || texts.length === 0) {
      return;
    }

    const text1 = text1Ref.current;
    const text2 = text2Ref.current;

    if (!text1 || !text2) {
      return;
    }

    if (texts.length === 1) {
      text1.textContent = texts[0];
      text2.textContent = texts[0];
      return;
    }

    let textIndex = texts.length - 1;
    let time = performance.now();
    let morph = 0;
    let cooldown = cooldownTime;

    text1.textContent = texts[textIndex % texts.length];
    text2.textContent = texts[(textIndex + 1) % texts.length];

    const setMorph = (fraction) => {
      const safe = Math.max(fraction, 0.001);
      const inv = Math.max(1 - fraction, 0.001);

      text2.style.filter = `blur(${Math.min(8 / safe - 8, 100)}px)`;
      text2.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;

      text1.style.filter = `blur(${Math.min(8 / inv - 8, 100)}px)`;
      text1.style.opacity = `${Math.pow(1 - fraction, 0.4) * 100}%`;
    };

    const doCooldown = () => {
      morph = 0;
      text2.style.filter = "";
      text2.style.opacity = "100%";
      text1.style.filter = "";
      text1.style.opacity = "0%";
    };

    const doMorph = () => {
      morph -= cooldown;
      cooldown = 0;
      let fraction = morph / morphTime;

      if (fraction > 1) {
        cooldown = cooldownTime;
        fraction = 1;
      }

      setMorph(fraction);
    };

    let active = true;

    const animate = () => {
      if (!active) {
        return;
      }

      const newTime = performance.now();
      const shouldIncrementIndex = cooldown > 0;
      const dt = (newTime - time) / 1000;
      time = newTime;
      cooldown -= dt;

      if (cooldown <= 0) {
        if (shouldIncrementIndex) {
          textIndex = (textIndex + 1) % texts.length;
          text1.textContent = texts[textIndex % texts.length];
          text2.textContent = texts[(textIndex + 1) % texts.length];
        }
        doMorph();
      } else {
        doCooldown();
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      active = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [texts, morphTime, cooldownTime]);

  if (!Array.isArray(texts) || texts.length === 0) {
    return null;
  }

  return (
    <div className={cx("gooey-text", className)}>
      <svg className="gooey-text__defs" aria-hidden="true" focusable="false">
        <defs>
          <filter id={filterId}>
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>

      <div className="gooey-text__stage" style={{ filter: `url(#${filterId})` }}>
        <span
          ref={text1Ref}
          className={cx("gooey-text__layer gooey-text__layer--base", textClassName)}
        />
        <span ref={text2Ref} className={cx("gooey-text__layer", textClassName)} />
      </div>
    </div>
  );
}

export default GooeyText;
