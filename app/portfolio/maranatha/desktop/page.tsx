"use client";

export default function MaranathaDesktopShowcase() {
  return (
    <div className="page">
      <header className="header">
        <div className="logo">
          <div className="logo-icon">M</div>
          <div>
            <div className="logo-text">MARANATHA</div>
            <div className="logo-subtitle">전문 세무 컨설팅</div>
          </div>
        </div>
        <nav>
          <a href="#about">회사소개</a>
          <a href="#services">서비스</a>
          <a href="#experts">전문가</a>
          <a href="#cases">성공사례</a>
          <a href="#contact">문의하기</a>
          <a href="#contact" className="cta-button">
            무료 상담
          </a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-bg" />
        <div className="light-effect light1" />
        <div className="light-effect light2" />

        <div className="hero-content">
          <div className="hero-subtitle">All The Answers About Taxes</div>
          <h1 className="hero-title">
            고객을 섬기는 <span className="highlight">MARANATHA</span>,
            <span className="line2">한 차원 높은 세무 서비스</span>
          </h1>
        </div>

        <div className="scroll-indicator">
          <div className="scroll-icon" />
          <span>SCROLL</span>
        </div>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          position: relative;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif;
          overflow: hidden;
        }

        .header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          padding: 25px 60px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          width: 40px;
          height: 40px;
          background: white;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 20px;
          color: #1e40af;
        }

        .logo-text {
          color: white;
          font-size: 20px;
          font-weight: 600;
          letter-spacing: -0.5px;
        }

        .logo-subtitle {
          color: rgba(255, 255, 255, 0.8);
          font-size: 11px;
          font-weight: 400;
          margin-top: -2px;
        }

        nav {
          display: flex;
          gap: 50px;
          align-items: center;
        }

        nav a {
          color: white;
          text-decoration: none;
          font-size: 15px;
          font-weight: 500;
          transition: opacity 0.3s;
          letter-spacing: -0.3px;
        }

        nav a:hover {
          opacity: 0.7;
        }

        .cta-button {
          background: #3b82f6;
          color: white;
          padding: 12px 28px;
          border-radius: 6px;
          font-weight: 600;
          transition: background 0.3s;
        }

        .cta-button:hover {
          background: #2563eb;
        }

        .hero {
          position: relative;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .hero-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)),
            url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80');
          background-size: cover;
          background-position: center bottom;
          filter: brightness(0.85);
        }

        .hero-content {
          position: relative;
          z-index: 10;
          text-align: center;
          max-width: 1200px;
          padding: 0 40px;
        }

        .hero-subtitle {
          color: rgba(255, 255, 255, 0.95);
          font-size: 18px;
          font-weight: 500;
          margin-bottom: 25px;
          letter-spacing: 3px;
          text-transform: uppercase;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        }

        .hero-title {
          color: white;
          font-size: 56px;
          font-weight: 700;
          line-height: 1.3;
          margin-bottom: 40px;
          text-shadow: 0 4px 30px rgba(0, 0, 0, 0.7), 0 2px 10px rgba(0, 0, 0, 0.5);
          letter-spacing: -1px;
        }

        .hero-title .highlight {
          color: #60a5fa;
          display: block;
        }

        .hero-title .line2 {
          display: block;
        }

        .scroll-indicator {
          position: absolute;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: white;
          font-size: 12px;
          letter-spacing: 2px;
          animation: bounce 2s infinite;
        }

        .scroll-icon {
          width: 30px;
          height: 50px;
          border: 2px solid rgba(255, 255, 255, 0.5);
          border-radius: 20px;
          position: relative;
        }

        .scroll-icon::before {
          content: "";
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 8px;
          background: white;
          border-radius: 2px;
          animation: scroll 2s infinite;
        }

        .light-effect {
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(96, 165, 250, 0.15) 0%, transparent 70%);
          border-radius: 50%;
          filter: blur(60px);
          animation: pulse 4s ease-in-out infinite;
        }

        .light1 {
          top: -200px;
          left: 10%;
        }

        .light2 {
          bottom: -200px;
          right: 10%;
          animation-delay: 2s;
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateX(-50%) translateY(0);
          }
          50% {
            transform: translateX(-50%) translateY(-10px);
          }
        }

        @keyframes scroll {
          0% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) translateY(15px);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.1);
          }
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 42px;
          }

          .hero-subtitle {
            font-size: 16px;
          }

          .header {
            padding: 20px 30px;
          }

          nav {
            gap: 25px;
          }

          nav a {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
