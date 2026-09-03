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
    <div className="flex gap-1 text-[13px] text-[#b8a99f]" aria-label={`별점 ${count}점`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} aria-hidden>
          {i < count ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}

export function MobileReview() {
  return (
    <section className="bg-hu-beige px-[20px] py-[64px]" aria-labelledby="review-heading">
      <div className="mx-auto w-[350px] max-w-full">
        <h2
          id="review-heading"
          className="font-serif text-[32px] font-medium tracking-[0.06em] text-hu-black"
        >
          REVIEW
        </h2>

        <div className="mt-8 flex flex-col">
          {REVIEWS.map((review, index) => (
            <article
              key={review.id}
              className={`flex flex-col gap-4 py-7 ${index > 0 ? "border-t border-hu-black/10" : ""}`}
            >
              <div>
                <Stars count={review.stars} />
                <p className="mt-3 font-serif text-[13px] tracking-[0.06em] text-hu-black">
                  ARTIST. {review.artist}
                </p>
                <p className="mt-1.5 font-sans-kr text-[11px] text-hu-muted">{review.masked}</p>
              </div>
              <div className="font-sans-kr text-[13px] leading-[1.75] text-hu-black">
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
