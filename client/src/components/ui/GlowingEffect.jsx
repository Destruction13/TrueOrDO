import { memo, useCallback, useEffect, useRef, useState } from "react";
import "./GlowingEffect.css";

const GlowingEffect = memo(function GlowingEffect({
  borderWidth = 4,
  glowSize = 200,
  proximity = 100,
  glowColors = ["#dd7bbb", "#d79f1e", "#5a922c"],
  disabled = false,
}) {
  const containerRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const animationFrameRef = useRef(0);

  const handleMove = useCallback(
    (e) => {
      if (!containerRef.current || disabled) return;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        const element = containerRef.current;
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Check if mouse is within proximity of the card
        const isNearCard =
          mouseX > rect.left - proximity &&
          mouseX < rect.right + proximity &&
          mouseY > rect.top - proximity &&
          mouseY < rect.bottom + proximity;

        setIsActive(isNearCard);

        if (!isNearCard) return;

        // Calculate mouse position relative to the element (as percentage)
        const relativeX = ((mouseX - rect.left) / rect.width) * 100;
        const relativeY = ((mouseY - rect.top) / rect.height) * 100;

        // Update CSS variables for gradient position
        element.style.setProperty("--mouse-x", `${relativeX}%`);
        element.style.setProperty("--mouse-y", `${relativeY}%`);
      });
    },
    [proximity, disabled]
  );

  useEffect(() => {
    if (disabled) return;

    const handlePointerMove = (e) => handleMove(e);
    const handlePointerLeave = () => setIsActive(false);

    document.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [handleMove, disabled]);

  const cssVars = {
    "--border-width": `${borderWidth}px`,
    "--glow-size": `${glowSize}px`,
    "--glow-color-1": glowColors[0],
    "--glow-color-2": glowColors[1],
    "--glow-color-3": glowColors[2],
    "--mouse-x": "50%",
    "--mouse-y": "50%",
  };

  return (
    <div ref={containerRef} style={cssVars} className="glowing-effect-glow-container">
      {/* Glass border - always visible */}
      <div className="glowing-effect-glass-border" />
      
      {/* Outer glow - blurred, behind the border */}
      <div className={`glowing-effect-outer-glow ${isActive ? "glowing-effect-outer-glow--active" : ""}`} />
      
      {/* Main glow on the border */}
      <div className={`glowing-effect-glow ${isActive ? "glowing-effect-glow--active" : ""}`} />
    </div>
  );
});

export { GlowingEffect };
