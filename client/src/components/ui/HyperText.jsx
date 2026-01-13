import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import "./HyperText.css";

const alphabets = "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ".split("");
const alphabetsLatin = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const getRandomInt = (max) => Math.floor(Math.random() * max);

/**
 * HyperText — текст с эффектом "матричной" расшифровки
 * При наведении или загрузке текст "дешифруется" из случайных символов
 */
export function HyperText({
  text,
  duration = 800,
  framerProps = {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 3 },
  },
  className = "",
  animateOnLoad = true,
  useCyrillic = true,
}) {
  const chars = useCyrillic ? alphabets : alphabetsLatin;
  const [displayText, setDisplayText] = useState(text.split(""));
  const [trigger, setTrigger] = useState(false);
  const iterations = useRef(0);
  const isFirstRender = useRef(true);

  const triggerAnimation = () => {
    iterations.current = 0;
    setTrigger(true);
  };

  useEffect(() => {
    const interval = setInterval(
      () => {
        if (!animateOnLoad && isFirstRender.current) {
          clearInterval(interval);
          isFirstRender.current = false;
          return;
        }
        if (iterations.current < text.length) {
          setDisplayText((t) =>
            t.map((l, i) =>
              l === " "
                ? l
                : i <= iterations.current
                  ? text[i]
                  : chars[getRandomInt(chars.length)]
            )
          );
          iterations.current = iterations.current + 0.1;
        } else {
          setTrigger(false);
          clearInterval(interval);
        }
      },
      duration / (text.length * 10)
    );
    return () => clearInterval(interval);
  }, [text, duration, trigger, animateOnLoad, chars]);

  // Reset when text changes
  useEffect(() => {
    iterations.current = 0;
    setDisplayText(text.split(""));
    setTrigger(true);
  }, [text]);

  return (
    <div
      className={`hyper-text ${className}`}
      onMouseEnter={triggerAnimation}
    >
      <AnimatePresence mode="wait">
        {displayText.map((letter, i) => (
          <motion.span
            key={i}
            className={`hyper-text__char ${letter === " " ? "hyper-text__char--space" : ""}`}
            {...framerProps}
          >
            {letter}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default HyperText;
