const REVIEWS = [
  {
    id: "r1",
    stars: 5,
    artist: "재이",
    masked: "sh***** / 26-07-01",
    body: [
      "처음 방문했는데 인생 디자인 컷을 만났습니다.",
      "디자이너 선생님이 모질과 두상에 맞춰 세심하게 카운셀링해 주시는 과정부터 감동을 받았습니다.",
      "공간이 주는 우아함만큼이나 시술 결과물의 텍스처도 너무 만족스럽습니다.",
      "조만간 펌 예약으로 다시 방문하겠습니다."
    ]
  },
  {
    id: "r2",
    stars: 5,
    artist: "서아",
    masked: "pp***** / 26-06-28",
    body: [
      "처음 방문했는데 인생 디자인 컷을 만났습니다.",
      "디자이너 선생님이 모질과 두상에 맞춰 세심하게 카운셀링해 주시는 과정부터 감동을 받았습니다.",
      "공간이 주는 우아함만큼이나 시술 결과물의 텍스처도 너무 만족스럽습니다.",
      "조만간 펌 예약으로 다시 방문하겠습니다."
    ]
  }
] as const;

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-1 text-[15px] text-[#b8a99f]" aria-label={`별점 ${count}점`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} aria-hidden>
          {i < count ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}

export default function Review() {
  return (
    <section className="bg-hu-beige px-side py-[90px]" aria-labelledby="review-heading">
      <div className="mx-auto grid max-w-content grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.5fr)_minmax(0,1.5fr)] lg:gap-16">
        <h2
          id="review-heading"
          className="font-serif text-[42px] font-medium tracking-[0.06em] text-hu-black lg:text-[48px]"
        >
          REVIEW
        </h2>

        <div className="flex flex-col">
          {REVIEWS.map((review, index) => (
            <article
              key={review.id}
              className={`grid grid-cols-1 gap-4 py-8 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:gap-10 ${
                index > 0 ? "border-t border-hu-black/10" : ""
              }`}
            >
              <div>
                <Stars count={review.stars} />
                <p className="mt-4 font-serif text-[14px] tracking-[0.06em] text-hu-black">
                  ARTIST. {review.artist}
                </p>
                <p className="mt-2 font-sans-kr text-[12px] text-hu-muted">{review.masked}</p>
              </div>

              <div className="font-sans-kr text-[14px] leading-[1.75] text-hu-black">
                {review.body.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
