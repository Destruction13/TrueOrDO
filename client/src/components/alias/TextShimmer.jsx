import { useMemo } from "react";
import { motion } from "framer-motion";

export default function TextShimmer({
  children,
  as: Component = "p",
  className = "",
  duration = 2,
  spread = 2,
}) {
  const MotionComponent = motion(Component);

  const dynamicSpread = useMemo(() => {
    return children.length * spread;
  }, [children, spread]);

  return (
    <MotionComponent
      className={`text-shimmer ${className}`}
      initial={{ backgroundPosition: "100% center" }}
      animate={{ backgroundPosition: "0% center" }}
      transition={{
        repeat: Infinity,
        duration,
        ease: "linear",
      }}
      style={{
        "--spread": `${dynamicSpread}px`,
        backgroundImage: `linear-gradient(90deg, transparent calc(50% - ${dynamicSpread}px), #ffffff, transparent calc(50% + ${dynamicSpread}px)), linear-gradient(#71717a, #71717a)`,
        backgroundSize: "250% 100%, auto",
        backgroundRepeat: "no-repeat, padding-box",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        display: "inline-block",
      }}
    >
      {children}
    </MotionComponent>
  );
}
