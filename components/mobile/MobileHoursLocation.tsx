const HOURS = [
  { day: "MON - FRI", time: "10:00 AM - 08:00 PM" },
  { day: "SAT", time: "10:00 AM - 09:00 PM" },
  { day: "SUN", time: "10:00 AM - 07:00 PM" }
] as const;

const BG_IMAGE =
  "https://sdaiokbvorwbomjasqzc.supabase.co/storage/v1/object/public/portfolio-media/hair.jpeg";

export function MobileHoursLocation() {
  return (
    <section id="location" className="relative isolate bg-hu-black" aria-labelledby="hours-heading">
      <div className="relative min-h-[420px] w-full">
        <img
          src={BG_IMAGE}
          alt="살롱 내부"
          className="absolute inset-0 h-full w-full object-cover"
          decoding="async"
        />
        <div className="relative mx-auto flex min-h-[420px] w-[390px] max-w-full items-center px-[20px] py-12">
          <div className="w-[350px] max-w-full bg-hu-white px-6 py-8">
            <h2
              id="hours-heading"
              className="font-serif text-[20px] font-medium tracking-[0.08em] text-[#a8968a]"
            >
              HOURS
            </h2>
            <dl className="mt-5 space-y-2.5">
              {HOURS.map((row) => (
                <div key={row.day} className="flex items-baseline justify-between gap-3">
                  <dt className="font-sans-kr text-[12px] tracking-[0.02em] text-hu-black">
                    {row.day}
                  </dt>
                  <dd className="font-sans-kr text-[12px] text-hu-body">{row.time}</dd>
                </div>
              ))}
            </dl>

            <div className="my-6 h-px w-full bg-hu-leader" />

            <h2 className="font-serif text-[20px] font-medium tracking-[0.08em] text-[#a8968a]">
              LOCATION
            </h2>
            <p className="mt-4 font-serif text-[18px] tracking-[0.04em] text-hu-black">
              T 02.1234.5678
            </p>
            <address className="mt-2 not-italic font-sans-kr text-[12px] leading-[1.7] text-hu-body">
              서울특별시 강남구 청담동 123-4, 2층
              <br />
              2F, 123-4, Cheongdam-dong, Gangnam-gu, Seoul
            </address>
          </div>
        </div>
      </div>
    </section>
  );
}
