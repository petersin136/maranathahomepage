import { HomeShell } from "@/components/HomeShell";
import { getArtists } from "@/lib/artists/get-artists";
import { getGalleryImages } from "@/lib/gallery/get-gallery-images";
import { getServices } from "@/lib/services/get-services";

/**
 * 데스크톱(≥1440) / 모바일(<1440, 시안 폭 390)은 HomeShell 에서 하나만 마운트.
 */
export default async function Home() {
  const [artists, galleryImages, services] = await Promise.all([
    getArtists(),
    getGalleryImages(),
    getServices()
  ]);

  return (
    <HomeShell
      artists={artists}
      galleryImages={galleryImages}
      services={services}
    />
  );
}
