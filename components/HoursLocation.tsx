import Image from "next/image";

const HOURS = [
  { day: "MON - FRI", time: "10:00 AM - 08:00 PM" },
  { day: "SAT", time: "10:00 AM - 09:00 PM" },
  { day: "SUN", time: "10:00 AM - 07:00 PM" }
] as const;

const BG_IMAGE =
  "https://sdaiokbvorwbomjasqzc.supabase.co/storage/v1/object/public/portfolio-media/hair.jpeg";

export default function HoursLocation() {
  return (
    <section id="location" className="relative isolate bg-hu-black" aria-labelledby="hours-heading">
      <div className="relative min-h-[560px] w-full lg:min-h-[620px]">
        <Image
          src={BG_IMAGE}
          alt="살롱 내부"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />

        <div className="relative mx-auto flex h-full min-h-[560px] max-w-frame items-center px-6 lg:min-h-[620px] lg:px-side">
          <div className="w-full max-w-[360px] bg-hu-white px-10 py-12 lg:px-12 lg:py-14">
            <h2
              id="hours-heading"
              className="font-serif text-[26px] font-medium tracking-[0.08em] text-[#a8968a]"
            >
              HOURS
            </h2>
            <dl className="mt-6 space-y-3">
              {HOURS.map((row) => (
                <div key={row.day} className="flex items-baseline justify-between gap-4">
                  <dt className="font-sans-kr text-[13px] tracking-[0.02em] text-hu-black">
                    {row.day}
                  </dt>
                  <dd className="font-sans-kr text-[13px] text-hu-body">{row.time}</dd>
                </div>
              ))}
            </dl>

            <div className="my-8 h-px w-full bg-hu-leader" />

            <h2 className="font-serif text-[26px] font-medium tracking-[0.08em] text-[#a8968a]">
              LOCATION
            </h2>
            <p className="mt-5 font-serif text-[22px] tracking-[0.04em] text-hu-black">
              T 02.1234.5678
            </p>
            <address className="mt-3 not-italic font-sans-kr text-[13px] leading-[1.7] text-hu-body">
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
