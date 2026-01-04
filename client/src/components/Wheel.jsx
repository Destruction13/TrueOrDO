import { useEffect, useState } from "react";

function Wheel({ title, items, spinIndex, spinTick, spinning, selectedIndex }) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (spinIndex == null || !items.length) {
      return;
    }
    const segment = 360 / items.length;
    const extraTurns = 3 + Math.floor(Math.random() * 2);
    const target = 360 * extraTurns + (360 - spinIndex * segment - segment / 2);
    setRotation((prev) => prev + target);
  }, [spinIndex, spinTick, items.length]);

  return (
    <div className={`wheel ${spinning ? "spinning" : ""}`}>
      <div className="wheel-title">{title}</div>
      <div className="wheel-body">
        <div
          className="wheel-disc"
          style={{
            "--segments": items.length || 1,
            "--rotation": `${rotation}deg`
          }}
        >
          {items.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className={`wheel-label ${selectedIndex === index ? "selected" : ""}`}
              style={{ "--i": index }}
            >
              {item}
            </div>
          ))}
        </div>
        <div className="wheel-center" />
        <div className="wheel-pointer" />
      </div>
    </div>
  );
}

export default Wheel;
