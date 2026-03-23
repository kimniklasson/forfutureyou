const LINES = ["For", "future", "you."];

export function ForFutureYou() {

  return (
    <div
      style={{
        fontSize: 96,
        lineHeight: "62%",
        letterSpacing: "-0.05em",
        textAlign: "center",
        color: "#FFD900",
        fontFamily: "var(--font-sans)",
      }}
    >
      {LINES.map((line, lineIdx) => (
        <div key={lineIdx}>
          {Array.from(line).map((char, charIdx) => {
            return (
              <span
                key={`${lineIdx}-${charIdx}`}
                className="letter-flex"
              >
                {char}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
