import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

const GALLERY_ITEMS = [
  { src: "/gallery/1.jpg", caption: "Skapa och hantera dina träningspass" },
  { src: "/gallery/2.jpg", caption: "Lägg till övningar med set, reps och vikt" },
  { src: "/gallery/3.jpg", caption: "Logga set – konfetti när du slår rekord" },
  { src: "/gallery/4.jpg", caption: "Summering av passet när du är klar" },
  { src: "/gallery/5.jpg", caption: "Se alla dina genomförda träningspass" },
];

const CARD_RATIO = 0.78; // card width relative to container
const GAP = 16; // px between cards

function Lightbox({
  startIndex,
  onClose,
}: {
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [visible, setVisible] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const cardWidth = containerWidth * CARD_RATIO;
  // offset to center the active card inside the container
  const baseOffset = containerWidth / 2 - cardWidth / 2 - index * (cardWidth + GAP);
  const trackOffset = baseOffset + dragX;

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
    const threshold = cardWidth * 0.25;
    if (dragX < -threshold && index < GALLERY_ITEMS.length - 1) setIndex((i) => i + 1);
    else if (dragX > threshold && index > 0) setIndex((i) => i - 1);
    setDragX(0);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end"
      style={{
        background: visible ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0)",
        transition: "background 0.35s ease",
      }}
      onClick={onClose}
    >
      {/* Bottom-sheet modal */}
      <div
        className="relative w-full bg-[#1a1a1a] rounded-t-3xl pt-3 pb-12 overflow-hidden"
        style={{
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.42s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />

        {/* Carousel container — overflow hidden clips the peeking cards */}
        <div ref={containerRef} className="overflow-hidden">
          <div
            className="flex items-end cursor-grab active:cursor-grabbing"
            style={{
              transform: `translateX(${trackOffset}px)`,
              transition: dragging ? "none" : "transform 0.38s cubic-bezier(0.16, 1, 0.3, 1)",
              gap: GAP,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {GALLERY_ITEMS.map((item, i) => (
              <div
                key={i}
                className="flex-shrink-0 flex flex-col items-center"
                style={{ width: cardWidth }}
              >
                <img
                  src={item.src}
                  className="w-full rounded-2xl object-contain select-none border border-white/10"
                  style={{ height: "58vh" }}
                  draggable={false}
                />
                <p
                  className="mt-3 text-center text-sm text-white/70 px-2 transition-opacity duration-300"
                  style={{ opacity: i === index ? 1 : 0 }}
                >
                  {item.caption}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mt-5">
          {GALLERY_ITEMS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === index ? 20 : 6,
                height: 6,
                background: i === index ? "white" : "rgba(255,255,255,0.3)",
              }}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ScrollingGallery() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const doubled = [...GALLERY_ITEMS, ...GALLERY_ITEMS];

  return (
    <>
      <div className="w-full overflow-hidden">
        <div
          className="flex gap-4"
          style={{
            width: "max-content",
            animation: `gallery-scroll ${GALLERY_ITEMS.length * 6}s linear infinite`,
          }}
        >
          {doubled.map((item, i) => (
            <img
              key={i}
              src={item.src}
              onClick={() => setLightboxIndex(i % GALLERY_ITEMS.length)}
              className="h-[360px] w-auto rounded-xl cursor-pointer flex-shrink-0 object-cover border border-black/10 dark:border-white/15"
              draggable={false}
            />
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
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
