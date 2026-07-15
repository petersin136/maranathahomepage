import Header from "@/components/Header";
import Hero from "@/components/Hero";
import WhyChooseUs from "@/components/WhyChooseUs";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <WhyChooseUs />
        {/* 이후 섹션 시안 수신 후 이어서 추가 */}
        <div id="pricing" />
        <div id="artists" />
        <div id="gallery" />
        <div id="location" />
        <div id="booking" />
      </main>
      <Footer />
    </>
  );
}
