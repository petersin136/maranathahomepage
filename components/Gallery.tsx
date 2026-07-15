import Image from "next/image";
import type { GalleryImage, GallerySlot } from "@/lib/gallery/types";

/**
 * Designer gallery (1024 mock measurements → % of content box)
 *
 * Title sits BETWEEN the two top side images (same row).
 * Center image starts under the title band.
 * Bottom sides are staggered; center is tallest.
 *
 * Supabase: slot keys unchanged (top-left | top-right | center | bottom-left | bottom-right)
 */
function SlotMedia({ image }: { image?: GalleryImage }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#191919]">
      {image?.src ? (
        <Image
          src={image.src}
          alt={image.alt || "Gallery look"}
          fill
          className="object-cover transition-transform duration-500 hover:scale-[1.03]"
          sizes="(max-width: 1024px) 50vw, 40vw"
        />
      ) : null}
    </div>
  );
}

function TitleBlock() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-2 text-center">
      <p className="font-serif text-[18px] font-normal tracking-[0.02em] text-[#8e7e78] md:text-[20px]">
        Visual Archive
      </p>
      <h2
        id="gallery-heading"
        className="mt-4 font-serif text-[36px] font-medium leading-[1.28] tracking-[0.04em] text-hu-white md:text-[42px] lg:text-[46px]"
      >
        <span className="block">SELECTED</span>
        <span className="block">LOOKS FOR YOU</span>
      </h2>
    </div>
  );
}

export default function Gallery({ images }: { images: GalleryImage[] }) {
  const bySlot = Object.fromEntries(images.map((img) => [img.slot, img])) as Partial<
    Record<GallerySlot, GalleryImage>
  >;

  return (
    <section
      id="gallery"
      className="bg-hu-black px-side pb-[140px] pt-[60px] text-hu-white"
      aria-labelledby="gallery-heading"
    >
      <div className="mx-auto max-w-content">
        {/* Desktop / large: % positions from designer mock */}
        <div
          className="relative mx-auto hidden w-full lg:block"
          style={{ aspectRatio: "846 / 572" }}
        >
          {/* top-left — square, aligns with title */}
          <div className="absolute left-0 top-0 h-[34.44%] w-[23.29%]">
            <SlotMedia image={bySlot["top-left"]} />
          </div>

          {/* title band — same vertical span as side tops */}
          <div className="absolute left-[31.44%] top-0 h-[36.54%] w-[37.23%]">
            <TitleBlock />
          </div>

          {/* top-right */}
          <div className="absolute right-0 top-0 h-[34.44%] w-[23.05%]">
            <SlotMedia image={bySlot["top-right"]} />
          </div>

          {/* center */}
          <div className="absolute bottom-0 left-[31.44%] h-[63.64%] w-[37.23%]">
            <SlotMedia image={bySlot.center} />
          </div>

          {/* bottom-left */}
          <div className="absolute left-0 top-[49.83%] h-[42.13%] w-[23.29%]">
            <SlotMedia image={bySlot["bottom-left"]} />
          </div>

          {/* bottom-right — starts slightly higher than left */}
          <div className="absolute right-0 top-[45.45%] h-[42.13%] w-[23.05%]">
            <SlotMedia image={bySlot["bottom-right"]} />
          </div>
        </div>

        {/* Mobile fallback */}
        <div className="grid grid-cols-2 gap-4 lg:hidden">
          <div className="col-span-2 py-8">
            <TitleBlock />
          </div>
          <div className="aspect-square">
            <SlotMedia image={bySlot["top-left"]} />
          </div>
          <div className="aspect-square">
            <SlotMedia image={bySlot["top-right"]} />
          </div>
          <div className="col-span-2 mx-auto aspect-[315/364] w-[75%]">
            <SlotMedia image={bySlot.center} />
          </div>
          <div className="aspect-[197/241]">
            <SlotMedia image={bySlot["bottom-left"]} />
          </div>
          <div className="aspect-[195/241]">
            <SlotMedia image={bySlot["bottom-right"]} />
          </div>
        </div>
      </div>
    </section>
  );
}
