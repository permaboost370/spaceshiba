// Hand-drawn brutalist moon — same paper-and-ink language as the shiba.
// Sits low-opacity behind the graph so the grid stays readable.
export function Moon({
  size = "40vmin",
  className,
}: {
  size?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <defs>
        <radialGradient id="moonGrad" cx="38%" cy="36%" r="70%">
          <stop offset="0%" stopColor="#f4ecd8" stopOpacity="0.32" />
          <stop offset="60%" stopColor="#f4ecd8" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#f4ecd8" stopOpacity="0.05" />
        </radialGradient>
      </defs>
      <circle
        cx="100"
        cy="100"
        r="84"
        fill="url(#moonGrad)"
        stroke="#f4ecd8"
        strokeWidth="1.5"
        strokeOpacity="0.35"
      />
      {/* craters: filled dimples + hand-drawn outline on top */}
      <circle cx="72" cy="82" r="13" fill="#0a0a0a" fillOpacity="0.22" />
      <circle cx="72" cy="82" r="13" fill="none" stroke="#0a0a0a" strokeWidth="1.2" strokeOpacity="0.35" />
      <circle cx="118" cy="98" r="8" fill="#0a0a0a" fillOpacity="0.22" />
      <circle cx="118" cy="98" r="8" fill="none" stroke="#0a0a0a" strokeWidth="1.2" strokeOpacity="0.35" />
      <circle cx="85" cy="135" r="7" fill="#0a0a0a" fillOpacity="0.18" />
      <circle cx="85" cy="135" r="7" fill="none" stroke="#0a0a0a" strokeWidth="1" strokeOpacity="0.3" />
      <circle cx="145" cy="74" r="5" fill="#0a0a0a" fillOpacity="0.25" />
      <circle cx="145" cy="74" r="5" fill="none" stroke="#0a0a0a" strokeWidth="1" strokeOpacity="0.35" />
      <circle cx="62" cy="122" r="4" fill="#0a0a0a" fillOpacity="0.2" />
      <circle cx="138" cy="130" r="3.5" fill="#0a0a0a" fillOpacity="0.2" />
      <circle cx="105" cy="60" r="3" fill="#0a0a0a" fillOpacity="0.18" />
      <circle cx="55" cy="95" r="2.5" fill="#0a0a0a" fillOpacity="0.18" />
      <circle cx="130" cy="155" r="2.2" fill="#0a0a0a" fillOpacity="0.15" />
    </svg>
  );
}
