import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Section1 from "@/components/Section1";
import Section2 from "@/components/Section2";
import Section5 from "@/components/Section5";
import Section3 from "@/components/Section3";
import Footer from "@/components/Footer";
import Section4 from "@/components/Section4";
import PriceList from "@/components/PriceList";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Section1 />
        <Section2 />
        <Section5 />
        <Section3 />
        <Section4 />
        <PriceList />
      </main>
      <Footer />
    </>
  );
}
