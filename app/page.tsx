import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Section1 from "@/components/Section1";
import Section2 from "@/components/Section2";
import Section3 from "@/components/Section3";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Section1 />
        <Section2 />
        <Section3 />
      </main>
      <Footer />
    </>
  );
}
