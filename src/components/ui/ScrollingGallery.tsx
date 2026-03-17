import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

const IMAGES = [
  "/gallery/1.jpg",
  "/gallery/2.jpg",
  "/gallery/3.jpg",
  "/gallery/4.jpg",
  "/gallery/5.jpg",
];

function Lightbox({ images, startIndex, onClose }: {
  images: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [visible, setVisible] = useState(false);
  const startXRef = useRef(0);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    startXRef.current = e.clientX;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragX(e.clientX - startXRef.current);
  };

  const handlePointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (dragX < -60 && index < images.length - 1) setIndex(i => i + 1);
    else if (dragX > 60 && index > 0) setIndex(i => i - 1);
    setDragX(0);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-black/30 flex flex-col items-center justify-center"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.2s ease" }}
      onClick={onClose}
    >
      {/* Swipeable carousel — 80vh, stops click propagation */}
      <div
        className="w-full overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ height: "80vh" }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="flex h-full"
          style={{
            width: `${images.length * 100}vw`,
            transform: `translateX(calc(${-index * 100}vw + ${dragX}px))`,
            transition: dragging ? "none" : "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {images.map((src, i) => (
            <div
              key={i}
              className="h-full flex items-center justify-center flex-shrink-0"
              style={{ width: "100vw" }}
            >
              <img
                src={src}
                className="h-full w-auto object-contain select-none"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex gap-2 mt-5" onClick={(e) => e.stopPropagation()}>
        {images.map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full transition-all duration-200"
            style={{ background: i === index ? "white" : "rgba(255,255,255,0.4)", transform: i === index ? "scale(1.3)" : "scale(1)" }}
          />
        ))}
      </div>
    </div>,
    document.body
  );
}

export function ScrollingGallery() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const doubled = [...IMAGES, ...IMAGES];

  return (
    <>
      <div className="w-full overflow-hidden">
        <div
          className="flex gap-4"
          style={{
            width: "max-content",
            animation: `gallery-scroll ${IMAGES.length * 6}s linear infinite`,
          }}
        >
          {doubled.map((src, i) => (
            <img
              key={i}
              src={src}
              onClick={() => setLightboxIndex(i % IMAGES.length)}
              className="h-[360px] w-auto rounded-xl cursor-pointer flex-shrink-0 object-cover border border-black/10 dark:border-white/15"
              draggable={false}
            />
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={IMAGES}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <style>{`
        @keyframes gallery-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </>
  );
}
