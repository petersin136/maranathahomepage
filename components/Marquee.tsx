const PHRASES = [
  "HAIR UP SALON",
  "WE DEFINE YOUR TEXTURE",
  "ORDINARY BUT EXTRAORDINARY",
  "BOOK YOUR ARTIST"
];

export default function Marquee() {
  const sequence = [...PHRASES, ...PHRASES];

  return (
    <div className="overflow-hidden bg-hu-black py-4" aria-hidden>
      <div className="hu-marquee-track">
        {sequence.map((phrase, i) => (
          <span key={i} className="flex items-center">
            <span className="font-serif text-[13px] tracking-[0.16em] text-hu-white/90">
              {phrase}
            </span>
            <span className="mx-8 text-hu-white/40">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}
