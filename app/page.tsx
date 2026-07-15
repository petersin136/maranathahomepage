import Header from "@/components/Header";
import Hero from "@/components/Hero";
import WhyChooseUs from "@/components/WhyChooseUs";
import VisualBreak from "@/components/VisualBreak";
import PricingMenu from "@/components/PricingMenu";
import Artists from "@/components/Artists";
import Gallery from "@/components/Gallery";
import Booking from "@/components/Booking";
import HoursLocation from "@/components/HoursLocation";
import Marquee from "@/components/Marquee";
import Review from "@/components/Review";
import Instagram from "@/components/Instagram";
import Footer from "@/components/Footer";
import { getArtists } from "@/lib/artists/get-artists";
import { getGalleryImages } from "@/lib/gallery/get-gallery-images";
import { getServices } from "@/lib/services/get-services";

export default async function Home() {
  const [artists, galleryImages, services] = await Promise.all([
    getArtists(),
    getGalleryImages(),
    getServices()
  ]);

  return (
    <>
      <Header />
      <main>
        <Hero />
        <WhyChooseUs />
        <VisualBreak />
        <PricingMenu />
        <Artists artists={artists} />
        <Gallery images={galleryImages} />
        <Booking artists={artists} services={services} />
        <HoursLocation />
        <Marquee />
        <Review />
        <Instagram />
      </main>
      <Footer />
    </>
  );
}
