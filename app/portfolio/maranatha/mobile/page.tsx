'use client';

export default function MaranathaMobileShowcase() {
  return (
    <div className="wrapper">
      <div className="phone-frame">
        <div className="notch" />
        <div className="phone-screen">
          <div className="mobile-header">
            <div className="mobile-logo">
              <div className="mobile-logo-icon">M</div>
              <div className="mobile-logo-text">MARANATHA</div>
            </div>
            <div className="menu-icon">
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className="mobile-hero">
            <div className="mobile-hero-bg" />
            <div className="mobile-light mobile-light1" />
            <div className="mobile-light mobile-light2" />

            <div className="mobile-content">
              <div className="mobile-subtitle">All The Answers</div>
              <h1 className="mobile-title">
                고객을 섬기는
                <span className="highlight">MARANATHA</span>
                한 차원 높은
                <br />세무 서비스
              </h1>
              <a href="#consult" className="mobile-cta">
                무료 상담
              </a>
            </div>

            <div className="mobile-scroll">
              <div className="mobile-scroll-icon" />
              <span>SCROLL</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          background: #f5f5f7;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif;
        }

        .phone-frame {
          position: relative;
          width: 375px;
          height: 812px;
          background: #1a1a1a;
          border-radius: 50px;
          padding: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.1);
        }

        .notch {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          width: 180px;
          height: 28px;
          background: #1a1a1a;
          border-radius: 0 0 20px 20px;
          z-index: 10;
        }

        .phone-screen {
          width: 100%;
          height: 100%;
          background: #000;
          border-radius: 40px;
          overflow: hidden;
          position: relative;
        }

        .mobile-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 20;
          padding: 50px 20px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0) 100%);
        }

        .mobile-logo {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mobile-logo-icon {
          width: 32px;
          height: 32px;
          background: white;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 16px;
          color: #1e40af;
        }

        .mobile-logo-text {
          color: white;
          font-size: 15px;
          font-weight: 600;
        }

        .menu-icon {
          width: 28px;
          height: 28px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 5px;
        }

        .menu-icon span {
          width: 100%;
          height: 2px;
          background: white;
          border-radius: 2px;
        }

        .mobile-hero {
          position: relative;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .mobile-hero-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)),
            url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80');
          background-size: cover;
          background-position: center;
        }

        .mobile-content {
          position: relative;
          z-index: 10;
          text-align: center;
          padding: 0 30px;
        }

        .mobile-subtitle {
          color: rgba(255, 255, 255, 0.9);
          font-size: 10px;
          font-weight: 500;
          margin-bottom: 15px;
          letter-spacing: 2px;
          text-transform: uppercase;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        }

        .mobile-title {
          color: white;
          font-size: 28px;
          font-weight: 700;
          line-height: 1.4;
          margin-bottom: 20px;
          text-shadow: 0 3px 20px rgba(0, 0, 0, 0.7), 0 2px 8px rgba(0, 0, 0, 0.5);
        }

        .mobile-title .highlight {
          color: #60a5fa;
          display: block;
          font-size: 32px;
          margin: 5px 0;
        }

        .mobile-cta {
          display: inline-block;
          background: #3b82f6;
          color: white;
          padding: 12px 32px;
          border-radius: 25px;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          margin-top: 10px;
        }

        .mobile-scroll {
          position: absolute;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          color: white;
          font-size: 10px;
          letter-spacing: 2px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          animation: mobileBounce 2s infinite;
        }

        .mobile-scroll-icon {
          width: 20px;
          height: 32px;
          border: 2px solid rgba(255, 255, 255, 0.5);
          border-radius: 15px;
          position: relative;
        }

        .mobile-scroll-icon::before {
          content: "";
          position: absolute;
          top: 6px;
          left: 50%;
          transform: translateX(-50%);
          width: 3px;
          height: 6px;
          background: white;
          border-radius: 2px;
          animation: mobileScrollAnim 2s infinite;
        }

        .mobile-light {
          position: absolute;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(96, 165, 250, 0.15) 0%, transparent 70%);
          border-radius: 50%;
          filter: blur(40px);
          animation: mobilePulse 3s ease-in-out infinite;
        }

        .mobile-light1 {
          top: -100px;
          left: -50px;
        }

        .mobile-light2 {
          bottom: -100px;
          right: -50px;
          animation-delay: 1.5s;
        }

        @keyframes mobilePulse {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes mobileBounce {
          0%, 100% {
            transform: translateX(-50%) translateY(0);
          }
          50% {
            transform: translateX(-50%) translateY(-8px);
          }
        }

        @keyframes mobileScrollAnim {
          0% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
        }
      `}</style>
    </div>
  );
}
