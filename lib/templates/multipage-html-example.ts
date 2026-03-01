/**
 * MULTI-PAGE HTML EXAMPLE
 *
 * Injected into BUILDFLOW_ENHANCED_SYSTEM_PROMPT as a few-shot example.
 * Shows the exact <!-- File: name.html --> format, design system, and
 * content quality that every multi-page generation must match or exceed.
 *
 * This is a 2-page fitness site demonstrating:
 *   - <!-- File: name.html --> delimiter format
 *   - Complete standalone HTML documents (DOCTYPE → </html>)
 *   - CSS design system (:root variables + Google Fonts)
 *   - Sticky nav with active-link detection and mobile hamburger
 *   - Gradient hero, card grid, testimonials, CTA banner, footer
 *   - Scroll-reveal via IntersectionObserver
 *   - Zero inline event handlers (CSP-safe)
 *   - Real content (no Lorem ipsum, no placeholders)
 */
export const MULTIPAGE_HTML_EXAMPLE = `
<!-- File: index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="FitLife Pro — science-backed fitness coaching that has helped 50,000 people transform their health. Start your 14-day free trial today.">
  <title>Home | FitLife Pro</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #10b981; --primary-dark: #059669; --primary-light: #6ee7b7;
      --secondary: #3b82f6; --accent: #f59e0b;
      --gray-950:#030712; --gray-900:#111827; --gray-800:#1f2937; --gray-700:#374151;
      --gray-500:#6b7280; --gray-300:#d1d5db; --gray-100:#f3f4f6; --gray-50:#f9fafb; --white:#fff;
      --font-sans:'Inter',system-ui,sans-serif; --font-display:'Poppins',var(--font-sans);
      --shadow-sm:0 1px 3px rgba(0,0,0,.1); --shadow-md:0 4px 6px rgba(0,0,0,.07);
      --shadow-lg:0 10px 15px rgba(0,0,0,.1); --shadow-xl:0 20px 25px rgba(0,0,0,.1);
      --radius-sm:6px; --radius-md:12px; --radius-lg:16px; --radius-full:9999px;
      --transition:0.2s ease;
    }
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth}
    body{font-family:var(--font-sans);color:var(--gray-900);line-height:1.6}
    img{max-width:100%;height:auto;display:block}
    a{text-decoration:none;color:inherit}

    /* NAV */
    .nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(255,255,255,.88);backdrop-filter:blur(12px);border-bottom:1px solid rgba(0,0,0,.08);padding:0 24px}
    .nav-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:68px}
    .nav-logo{font-family:var(--font-display);font-size:1.2rem;font-weight:700;color:var(--primary)}
    .nav-links{display:flex;gap:28px;list-style:none;align-items:center}
    .nav-links a{font-size:.9rem;font-weight:500;color:var(--gray-700);position:relative;padding-bottom:2px;transition:color var(--transition)}
    .nav-links a::after{content:'';position:absolute;bottom:-2px;left:0;right:0;height:2px;background:var(--primary);border-radius:2px;transform:scaleX(0);transition:transform var(--transition)}
    .nav-links a:hover,.nav-links a.active{color:var(--primary)}
    .nav-links a:hover::after,.nav-links a.active::after{transform:scaleX(1)}
    .btn-nav{background:var(--primary);color:var(--white)!important;padding:9px 20px;border-radius:var(--radius-full);font-weight:600;transition:background var(--transition),transform var(--transition)}
    .btn-nav:hover{background:var(--primary-dark);transform:translateY(-1px)}
    .btn-nav::after{display:none!important}
    .menu-toggle{display:none;flex-direction:column;gap:5px;background:none;border:none;cursor:pointer;padding:4px}
    .menu-toggle span{display:block;width:24px;height:2px;background:var(--gray-800);border-radius:2px;transition:var(--transition)}

    /* HERO */
    .hero{min-height:100vh;background:linear-gradient(135deg,#064e3b 0%,#065f46 45%,#1e3a5f 100%);display:flex;align-items:center;position:relative;overflow:hidden;padding:100px 24px 60px}
    .hero::before{content:'';position:absolute;inset:0;background:url('https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1400&auto=format&fit=crop') center/cover;opacity:.12}
    .blob{position:absolute;border-radius:50%;filter:blur(60px);opacity:.35}
    .blob-1{width:380px;height:380px;background:var(--primary);top:-80px;right:-80px}
    .blob-2{width:280px;height:280px;background:var(--secondary);bottom:-40px;left:8%}
    .hero-inner{max-width:1200px;margin:0 auto;position:relative;z-index:1}
    .hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.14);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.24);color:var(--white);padding:6px 16px;border-radius:var(--radius-full);font-size:.82rem;font-weight:500;margin-bottom:24px}
    .hero h1{font-family:var(--font-display);font-size:clamp(2.4rem,5.5vw,4.2rem);font-weight:800;color:var(--white);line-height:1.1;margin-bottom:20px}
    .hero h1 span{background:linear-gradient(90deg,#6ee7b7,#93c5fd);-webkit-background-clip:text;background-clip:text;color:transparent}
    .hero p{font-size:1.1rem;color:rgba(255,255,255,.78);max-width:540px;margin-bottom:36px}
    .hero-ctas{display:flex;gap:14px;flex-wrap:wrap}
    .btn-primary{background:linear-gradient(135deg,var(--primary),var(--secondary));color:var(--white);padding:13px 30px;border-radius:var(--radius-full);font-weight:700;font-size:.95rem;box-shadow:0 4px 20px rgba(16,185,129,.4);transition:transform var(--transition),box-shadow var(--transition);display:inline-block}
    .btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(16,185,129,.5)}
    .btn-outline{border:2px solid rgba(255,255,255,.45);color:var(--white);padding:11px 26px;border-radius:var(--radius-full);font-weight:600;font-size:.95rem;transition:border-color var(--transition),background var(--transition);display:inline-block}
    .btn-outline:hover{border-color:var(--white);background:rgba(255,255,255,.1)}
    .hero-stats{display:flex;gap:36px;margin-top:52px;padding-top:36px;border-top:1px solid rgba(255,255,255,.15);flex-wrap:wrap}
    .stat-num{font-family:var(--font-display);font-size:1.9rem;font-weight:800;color:var(--white)}
    .stat-label{font-size:.82rem;color:rgba(255,255,255,.6)}

    /* SECTIONS */
    section{padding:80px 24px}
    .container{max-width:1200px;margin:0 auto}
    .section-label{font-size:.75rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--primary);margin-bottom:10px}
    .section-title{font-family:var(--font-display);font-size:clamp(1.7rem,3.5vw,2.4rem);font-weight:800;color:var(--gray-900);margin-bottom:14px}
    .section-sub{font-size:1rem;color:var(--gray-500);max-width:540px}
    .section-header{margin-bottom:52px}
    .section-header.center{text-align:center}
    .section-header.center .section-sub{margin:0 auto}

    /* FEATURES */
    .features{background:var(--gray-50)}
    .features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:24px}
    .card{background:var(--white);border-radius:var(--radius-md);padding:28px;box-shadow:var(--shadow-sm);border:1px solid var(--gray-100);transition:transform var(--transition),box-shadow var(--transition)}
    .card:hover{transform:translateY(-4px);box-shadow:var(--shadow-xl)}
    .card-icon{font-size:2rem;margin-bottom:14px}
    .card h3{font-size:1.05rem;font-weight:700;color:var(--gray-900);margin-bottom:8px}
    .card p{font-size:.9rem;color:var(--gray-500);line-height:1.7}

    /* TESTIMONIALS */
    .testi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:22px}
    .testi-card{background:var(--white);border-radius:var(--radius-md);padding:26px;box-shadow:var(--shadow-md);border:1px solid var(--gray-100)}
    .testi-stars{color:var(--accent);font-size:.95rem;letter-spacing:2px;margin-bottom:12px}
    .testi-text{font-size:.9rem;color:var(--gray-700);line-height:1.75;font-style:italic;margin-bottom:18px}
    .testi-author{display:flex;align-items:center;gap:12px}
    .testi-avatar{width:42px;height:42px;border-radius:50%;object-fit:cover}
    .testi-name{font-weight:700;font-size:.87rem;color:var(--gray-900)}
    .testi-role{font-size:.78rem;color:var(--gray-500)}

    /* CTA BANNER */
    .cta-box{background:linear-gradient(135deg,var(--primary-dark),#1e3a5f);border-radius:var(--radius-lg);padding:60px 48px;text-align:center}
    .cta-box h2{font-family:var(--font-display);font-size:1.9rem;font-weight:800;color:var(--white);margin-bottom:14px}
    .cta-box p{color:rgba(255,255,255,.78);margin-bottom:28px}

    /* FOOTER */
    footer{background:var(--gray-950);color:rgba(255,255,255,.6);padding:52px 24px 28px}
    .footer-grid{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:44px;margin-bottom:44px}
    .footer-brand{font-family:var(--font-display);font-size:1.15rem;font-weight:700;color:var(--primary);margin-bottom:10px}
    .footer-desc{font-size:.83rem;line-height:1.7;color:rgba(255,255,255,.45)}
    .footer-head{font-size:.75rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.88);margin-bottom:14px}
    .footer-links{list-style:none;display:flex;flex-direction:column;gap:9px}
    .footer-links a{font-size:.83rem;color:rgba(255,255,255,.48);transition:color var(--transition)}
    .footer-links a:hover{color:var(--primary)}
    .footer-bottom{max-width:1200px;margin:0 auto;border-top:1px solid rgba(255,255,255,.08);padding-top:22px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;font-size:.78rem}

    /* ANIMATIONS */
    @keyframes fadeInUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
    .anim{animation:fadeInUp .6s ease both}
    .d1{animation-delay:.1s}.d2{animation-delay:.2s}.d3{animation-delay:.3s}

    /* RESPONSIVE */
    @media(max-width:768px){
      .nav-links{display:none;flex-direction:column;gap:14px;position:absolute;top:68px;left:0;right:0;background:var(--white);padding:18px 24px;box-shadow:var(--shadow-lg);border-top:1px solid var(--gray-100)}
      .nav-links.open{display:flex}
      .menu-toggle{display:flex}
      .hero-stats{gap:20px}
      .footer-grid{grid-template-columns:1fr 1fr}
      .cta-box{padding:36px 22px}
    }
    @media(max-width:480px){.footer-grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <nav class="nav">
    <div class="nav-inner">
      <a href="index.html" class="nav-logo">⚡ FitLife Pro</a>
      <ul class="nav-links" id="navLinks">
        <li><a href="index.html">Home</a></li>
        <li><a href="about.html">About</a></li>
        <li><a href="programs.html">Programs</a></li>
        <li><a href="contact.html">Contact</a></li>
        <li><a href="contact.html" class="btn-nav">Get Started</a></li>
      </ul>
      <button class="menu-toggle" id="menuToggle" aria-label="Toggle navigation">
        <span></span><span></span><span></span>
      </button>
    </div>
  </nav>

  <section class="hero">
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>
    <div class="hero-inner">
      <div class="hero-badge anim">🏆 <span>#1 Rated Fitness Platform 2024</span></div>
      <h1 class="anim d1">Transform Your Body<br><span>in 90 Days</span></h1>
      <p class="anim d2">Expert-designed programmes, real-time coaching, and a community that keeps you accountable. Over 50,000 members have already changed their lives.</p>
      <div class="hero-ctas anim d3">
        <a href="programs.html" class="btn-primary">Start Free Trial</a>
        <a href="about.html" class="btn-outline">Watch Our Story</a>
      </div>
      <div class="hero-stats">
        <div><div class="stat-num">50K+</div><div class="stat-label">Active Members</div></div>
        <div><div class="stat-num">98%</div><div class="stat-label">Success Rate</div></div>
        <div><div class="stat-num">4.9★</div><div class="stat-label">App Rating</div></div>
        <div><div class="stat-num">12</div><div class="stat-label">Expert Coaches</div></div>
      </div>
    </div>
  </section>

  <section class="features">
    <div class="container">
      <div class="section-header center">
        <p class="section-label">Why FitLife Pro</p>
        <h2 class="section-title">Everything You Need to Succeed</h2>
        <p class="section-sub">Science-backed training, personalised nutrition, and expert support — all in one place.</p>
      </div>
      <div class="features-grid">
        <div class="card reveal"><div class="card-icon">🎯</div><h3>Personalised Plans</h3><p>AI-powered programmes tailored to your goals, fitness level, and available equipment. No two plans are the same.</p></div>
        <div class="card reveal"><div class="card-icon">📱</div><h3>Live Coaching Sessions</h3><p>Weekly live Q&amp;A with certified trainers. Ask anything, get answers in real time, and stay on track.</p></div>
        <div class="card reveal"><div class="card-icon">🥗</div><h3>Nutrition Tracking</h3><p>Built-in meal planner with 500+ recipes, macro tracking, and automatically generated grocery lists.</p></div>
        <div class="card reveal"><div class="card-icon">📊</div><h3>Progress Analytics</h3><p>Visual dashboards showing strength gains, body composition, and weekly performance trends.</p></div>
        <div class="card reveal"><div class="card-icon">👥</div><h3>Accountability Community</h3><p>Private community of 50,000+ members sharing wins, challenges, and motivation every day.</p></div>
        <div class="card reveal"><div class="card-icon">🏅</div><h3>Certification Credits</h3><p>Structured programmes that count towards personal trainer certification credits.</p></div>
      </div>
    </div>
  </section>

  <section>
    <div class="container">
      <div class="section-header center">
        <p class="section-label">Real Results</p>
        <h2 class="section-title">Members Who Changed Their Lives</h2>
      </div>
      <div class="testi-grid">
        <div class="testi-card reveal">
          <div class="testi-stars">★★★★★</div>
          <p class="testi-text">"I lost 18kg in 12 weeks without feeling deprived. The meal plans are incredible and the community kept me going on the hard days."</p>
          <div class="testi-author">
            <img src="https://api.dicebear.com/7.x/personas/svg?seed=SarahKent" alt="Sarah K." class="testi-avatar" loading="lazy">
            <div><div class="testi-name">Sarah K.</div><div class="testi-role">Marketing Manager, Bristol</div></div>
          </div>
        </div>
        <div class="testi-card reveal">
          <div class="testi-stars">★★★★★</div>
          <p class="testi-text">"As a busy dad of three, I thought I'd never get fit again. FitLife's 30-minute programmes fit perfectly into my schedule."</p>
          <div class="testi-author">
            <img src="https://api.dicebear.com/7.x/personas/svg?seed=MarcTaylor" alt="Marc T." class="testi-avatar" loading="lazy">
            <div><div class="testi-name">Marc T.</div><div class="testi-role">Software Engineer, London</div></div>
          </div>
        </div>
        <div class="testi-card reveal">
          <div class="testi-stars">★★★★★</div>
          <p class="testi-text">"The live coaching sessions are worth every penny. My form improved in week one and I've been injury-free for 6 months."</p>
          <div class="testi-author">
            <img src="https://api.dicebear.com/7.x/personas/svg?seed=PriyaMed" alt="Priya M." class="testi-avatar" loading="lazy">
            <div><div class="testi-name">Priya M.</div><div class="testi-role">Physiotherapist, Manchester</div></div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section>
    <div class="container">
      <div class="cta-box">
        <h2>Start Your Transformation Today</h2>
        <p>14-day free trial. No credit card required. Cancel anytime.</p>
        <a href="contact.html" class="btn-primary" style="font-size:1rem;padding:15px 38px">Join 50,000+ Members Free</a>
      </div>
    </div>
  </section>

  <footer>
    <div class="footer-grid">
      <div>
        <div class="footer-brand">⚡ FitLife Pro</div>
        <p class="footer-desc">Science-backed fitness coaching for real people. Founded 2019, London.</p>
      </div>
      <div>
        <div class="footer-head">Platform</div>
        <ul class="footer-links">
          <li><a href="programs.html">Programs</a></li>
          <li><a href="#">Nutrition</a></li>
          <li><a href="#">Community</a></li>
          <li><a href="#">Mobile App</a></li>
        </ul>
      </div>
      <div>
        <div class="footer-head">Company</div>
        <ul class="footer-links">
          <li><a href="about.html">About Us</a></li>
          <li><a href="#">Coaches</a></li>
          <li><a href="#">Blog</a></li>
          <li><a href="#">Press</a></li>
        </ul>
      </div>
      <div>
        <div class="footer-head">Support</div>
        <ul class="footer-links">
          <li><a href="contact.html">Contact</a></li>
          <li><a href="#">FAQ</a></li>
          <li><a href="#">Privacy Policy</a></li>
          <li><a href="#">Terms of Service</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2025 FitLife Pro Ltd. All rights reserved.</span>
      <span>Made with ❤️ in London</span>
    </div>
  </footer>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      // Active nav link
      const current = window.location.pathname.split('/').pop() || 'index.html';
      document.querySelectorAll('.nav-links a').forEach(link => {
        if (link.getAttribute('href') === current) link.classList.add('active');
      });

      // Mobile menu toggle
      const toggle = document.getElementById('menuToggle');
      const navLinks = document.getElementById('navLinks');
      toggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(navLinks.classList.contains('open')));
      });

      // Scroll reveal
      const observer = new IntersectionObserver(entries => {
        entries.forEach(el => {
          if (el.isIntersecting) {
            el.target.style.opacity = '1';
            el.target.style.transform = 'translateY(0)';
          }
        });
      }, { threshold: 0.1 });
      document.querySelectorAll('.reveal').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(18px)';
        el.style.transition = 'opacity .55s ease, transform .55s ease';
        observer.observe(el);
      });
    });
  </script>
</body>
</html>

<!-- File: about.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="The FitLife Pro story — how two personal trainers built a platform that has helped 50,000 people transform their health.">
  <title>About Us | FitLife Pro</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary:#10b981;--primary-dark:#059669;--primary-light:#6ee7b7;
      --secondary:#3b82f6;--accent:#f59e0b;
      --gray-950:#030712;--gray-900:#111827;--gray-800:#1f2937;--gray-700:#374151;
      --gray-500:#6b7280;--gray-300:#d1d5db;--gray-100:#f3f4f6;--gray-50:#f9fafb;--white:#fff;
      --font-sans:'Inter',system-ui,sans-serif;--font-display:'Poppins',var(--font-sans);
      --shadow-sm:0 1px 3px rgba(0,0,0,.1);--shadow-md:0 4px 6px rgba(0,0,0,.07);
      --shadow-lg:0 10px 15px rgba(0,0,0,.1);--shadow-xl:0 20px 25px rgba(0,0,0,.1);
      --radius-sm:6px;--radius-md:12px;--radius-lg:16px;--radius-full:9999px;
      --transition:0.2s ease;
    }
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth}
    body{font-family:var(--font-sans);color:var(--gray-900);line-height:1.6}
    img{max-width:100%;height:auto;display:block}
    a{text-decoration:none;color:inherit}

    /* NAV — identical across all pages */
    .nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(255,255,255,.88);backdrop-filter:blur(12px);border-bottom:1px solid rgba(0,0,0,.08);padding:0 24px}
    .nav-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:68px}
    .nav-logo{font-family:var(--font-display);font-size:1.2rem;font-weight:700;color:var(--primary)}
    .nav-links{display:flex;gap:28px;list-style:none;align-items:center}
    .nav-links a{font-size:.9rem;font-weight:500;color:var(--gray-700);position:relative;padding-bottom:2px;transition:color var(--transition)}
    .nav-links a::after{content:'';position:absolute;bottom:-2px;left:0;right:0;height:2px;background:var(--primary);border-radius:2px;transform:scaleX(0);transition:transform var(--transition)}
    .nav-links a:hover,.nav-links a.active{color:var(--primary)}
    .nav-links a:hover::after,.nav-links a.active::after{transform:scaleX(1)}
    .btn-nav{background:var(--primary);color:var(--white)!important;padding:9px 20px;border-radius:var(--radius-full);font-weight:600;transition:background var(--transition),transform var(--transition)}
    .btn-nav:hover{background:var(--primary-dark);transform:translateY(-1px)}
    .btn-nav::after{display:none!important}
    .menu-toggle{display:none;flex-direction:column;gap:5px;background:none;border:none;cursor:pointer;padding:4px}
    .menu-toggle span{display:block;width:24px;height:2px;background:var(--gray-800);border-radius:2px;transition:var(--transition)}

    /* PAGE HERO */
    .page-hero{background:linear-gradient(135deg,#064e3b,#065f46);padding:136px 24px 72px;text-align:center}
    .page-badge{display:inline-block;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.24);color:rgba(255,255,255,.88);padding:5px 15px;border-radius:var(--radius-full);font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:18px}
    .page-hero h1{font-family:var(--font-display);font-size:clamp(1.9rem,4.5vw,3.2rem);font-weight:800;color:var(--white);margin-bottom:14px}
    .page-hero p{font-size:1.05rem;color:rgba(255,255,255,.72);max-width:500px;margin:0 auto}

    /* STORY */
    .story{padding:80px 24px}
    .story-grid{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}
    .story-img{border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-xl)}
    .story-img img{width:100%;height:380px;object-fit:cover}
    .story-label{font-size:.75rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--primary);margin-bottom:10px}
    .story-title{font-family:var(--font-display);font-size:1.9rem;font-weight:800;color:var(--gray-900);margin-bottom:18px;line-height:1.25}
    .story p{color:var(--gray-700);line-height:1.8;margin-bottom:14px;font-size:.95rem}

    /* TEAM */
    .team{background:var(--gray-50);padding:80px 24px}
    .team-inner{max-width:1100px;margin:0 auto}
    .section-label{font-size:.75rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--primary);margin-bottom:10px}
    .section-title{font-family:var(--font-display);font-size:clamp(1.7rem,3.5vw,2.4rem);font-weight:800;color:var(--gray-900);margin-bottom:12px}
    .section-sub{font-size:.95rem;color:var(--gray-500);margin-bottom:44px}
    .team-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px}
    .team-card{background:var(--white);border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-sm);transition:transform var(--transition),box-shadow var(--transition)}
    .team-card:hover{transform:translateY(-4px);box-shadow:var(--shadow-xl)}
    .team-card img{width:100%;height:200px;object-fit:cover}
    .team-body{padding:18px}
    .team-name{font-weight:700;font-size:.95rem;color:var(--gray-900)}
    .team-role{font-size:.82rem;color:var(--primary);font-weight:600;margin-bottom:6px}
    .team-bio{font-size:.83rem;color:var(--gray-500);line-height:1.6}

    /* VALUES */
    .values{padding:80px 24px}
    .values-inner{max-width:1100px;margin:0 auto}
    .values-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:32px}
    .value-item{text-align:center}
    .value-icon{font-size:2.25rem;margin-bottom:14px}
    .value-title{font-weight:700;font-size:.95rem;color:var(--gray-900);margin-bottom:6px}
    .value-desc{font-size:.875rem;color:var(--gray-500);line-height:1.7}

    /* CTA */
    .cta-wrap{padding:0 24px 80px}
    .cta-box{max-width:1100px;margin:0 auto;background:linear-gradient(135deg,var(--primary-dark),#1e3a5f);border-radius:var(--radius-lg);padding:60px 48px;text-align:center}
    .cta-box h2{font-family:var(--font-display);font-size:1.9rem;font-weight:800;color:var(--white);margin-bottom:14px}
    .cta-box p{color:rgba(255,255,255,.78);margin-bottom:28px}
    .btn-primary{background:linear-gradient(135deg,var(--primary),var(--secondary));color:var(--white);padding:13px 30px;border-radius:var(--radius-full);font-weight:700;display:inline-block;transition:transform var(--transition),box-shadow var(--transition);box-shadow:0 4px 20px rgba(16,185,129,.4)}
    .btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(16,185,129,.5)}

    /* FOOTER — identical across all pages */
    footer{background:var(--gray-950);color:rgba(255,255,255,.6);padding:52px 24px 28px}
    .footer-grid{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:44px;margin-bottom:44px}
    .footer-brand{font-family:var(--font-display);font-size:1.15rem;font-weight:700;color:var(--primary);margin-bottom:10px}
    .footer-desc{font-size:.83rem;line-height:1.7;color:rgba(255,255,255,.45)}
    .footer-head{font-size:.75rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.88);margin-bottom:14px}
    .footer-links{list-style:none;display:flex;flex-direction:column;gap:9px}
    .footer-links a{font-size:.83rem;color:rgba(255,255,255,.48);transition:color var(--transition)}
    .footer-links a:hover{color:var(--primary)}
    .footer-bottom{max-width:1200px;margin:0 auto;border-top:1px solid rgba(255,255,255,.08);padding-top:22px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;font-size:.78rem}

    @keyframes fadeInUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
    .anim{animation:fadeInUp .6s ease both}

    @media(max-width:768px){
      .nav-links{display:none;flex-direction:column;gap:14px;position:absolute;top:68px;left:0;right:0;background:var(--white);padding:18px 24px;box-shadow:var(--shadow-lg);border-top:1px solid var(--gray-100)}
      .nav-links.open{display:flex}
      .menu-toggle{display:flex}
      .story-grid{grid-template-columns:1fr}
      .footer-grid{grid-template-columns:1fr 1fr}
      .cta-box{padding:36px 22px}
    }
    @media(max-width:480px){.footer-grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <nav class="nav">
    <div class="nav-inner">
      <a href="index.html" class="nav-logo">⚡ FitLife Pro</a>
      <ul class="nav-links" id="navLinks">
        <li><a href="index.html">Home</a></li>
        <li><a href="about.html">About</a></li>
        <li><a href="programs.html">Programs</a></li>
        <li><a href="contact.html">Contact</a></li>
        <li><a href="contact.html" class="btn-nav">Get Started</a></li>
      </ul>
      <button class="menu-toggle" id="menuToggle" aria-label="Toggle navigation">
        <span></span><span></span><span></span>
      </button>
    </div>
  </nav>

  <section class="page-hero">
    <div class="page-badge">Our Story</div>
    <h1 class="anim">Built by Coaches, for People</h1>
    <p class="anim">We started FitLife Pro in 2019 because we believed great coaching shouldn't be a luxury. Here's what we've built since.</p>
  </section>

  <section class="story">
    <div class="story-grid">
      <div class="story-img">
        <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop" alt="Emma and James in their first East London studio, 2019" loading="lazy">
      </div>
      <div>
        <p class="story-label">Our Origin</p>
        <h2 class="story-title">Two Trainers,<br>One Mission</h2>
        <p>In 2019, personal trainers Emma Clarke and James Osei were frustrated. They watched talented coaches charge £80 an hour while most people couldn't afford consistent guidance.</p>
        <p>Starting from a rented studio in East London, they filmed 200 workouts in three months and launched with 47 beta users. Within a year, 5,000 members had joined. By 2022, FitLife Pro was the UK's fastest-growing fitness platform.</p>
        <p>Today, our 12 certified coaches have helped over 50,000 people lose weight, build strength, and find a relationship with fitness they actually enjoy.</p>
      </div>
    </div>
  </section>

  <section class="team">
    <div class="team-inner">
      <p class="section-label">The People Behind FitLife</p>
      <h2 class="section-title">Meet Our Coaches</h2>
      <p class="section-sub">Certified, experienced, and genuinely passionate about your results.</p>
      <div class="team-grid">
        <div class="team-card reveal">
          <img src="https://api.dicebear.com/7.x/personas/svg?seed=EmmaC2019" alt="Emma Clarke, Co-Founder" loading="lazy">
          <div class="team-body">
            <div class="team-name">Emma Clarke</div>
            <div class="team-role">Co-Founder &amp; Head Coach</div>
            <p class="team-bio">NASM-certified PT, 12 years in strength &amp; conditioning. Olympic weightlifting specialist.</p>
          </div>
        </div>
        <div class="team-card reveal">
          <img src="https://api.dicebear.com/7.x/personas/svg?seed=JamesOsei" alt="James Osei, Co-Founder" loading="lazy">
          <div class="team-body">
            <div class="team-name">James Osei</div>
            <div class="team-role">Co-Founder &amp; Nutrition Lead</div>
            <p class="team-bio">BSc Sports Nutrition, 8 years coaching elite athletes. Fat loss and muscle-building specialist.</p>
          </div>
        </div>
        <div class="team-card reveal">
          <img src="https://api.dicebear.com/7.x/personas/svg?seed=PriyaNair" alt="Priya Nair, Rehab Specialist" loading="lazy">
          <div class="team-body">
            <div class="team-name">Priya Nair</div>
            <div class="team-role">Rehabilitation Specialist</div>
            <p class="team-bio">Physiotherapist with 10 years NHS experience. Designs programmes for injury recovery.</p>
          </div>
        </div>
        <div class="team-card reveal">
          <img src="https://api.dicebear.com/7.x/personas/svg?seed=TomBennett" alt="Tom Bennett, HIIT Coach" loading="lazy">
          <div class="team-body">
            <div class="team-name">Tom Bennett</div>
            <div class="team-role">HIIT &amp; Cardio Coach</div>
            <p class="team-bio">Ex-professional cyclist and two-time Ironman finisher. Makes cardio genuinely enjoyable.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="values">
    <div class="values-inner">
      <div style="text-align:center;margin-bottom:44px">
        <p class="section-label">What We Stand For</p>
        <h2 class="section-title">Our Values</h2>
      </div>
      <div class="values-grid">
        <div class="value-item reveal"><div class="value-icon">🎯</div><div class="value-title">Results First</div><p class="value-desc">Every decision is measured against one question: does this help our members get better results?</p></div>
        <div class="value-item reveal"><div class="value-icon">🔬</div><div class="value-title">Science-Backed</div><p class="value-desc">We don't follow trends. Every programme is built on peer-reviewed research and tested with real members.</p></div>
        <div class="value-item reveal"><div class="value-icon">🤝</div><div class="value-title">Inclusive by Design</div><p class="value-desc">Fitness is for every body, every age, and every starting point. We meet you where you are.</p></div>
        <div class="value-item reveal"><div class="value-icon">🌱</div><div class="value-title">Long-Term Thinking</div><p class="value-desc">We optimise for lifelong habits, not quick fixes. Sustainable results are the only results that matter.</p></div>
      </div>
    </div>
  </section>

  <div class="cta-wrap">
    <div class="cta-box">
      <h2>Ready to Join Our Community?</h2>
      <p>Start your 14-day free trial and see why 50,000 members trust FitLife Pro.</p>
      <a href="contact.html" class="btn-primary">Get Started Free</a>
    </div>
  </div>

  <footer>
    <div class="footer-grid">
      <div>
        <div class="footer-brand">⚡ FitLife Pro</div>
        <p class="footer-desc">Science-backed fitness coaching for real people. Founded 2019, London.</p>
      </div>
      <div>
        <div class="footer-head">Platform</div>
        <ul class="footer-links">
          <li><a href="programs.html">Programs</a></li>
          <li><a href="#">Nutrition</a></li>
          <li><a href="#">Community</a></li>
          <li><a href="#">App</a></li>
        </ul>
      </div>
      <div>
        <div class="footer-head">Company</div>
        <ul class="footer-links">
          <li><a href="about.html">About</a></li>
          <li><a href="#">Coaches</a></li>
          <li><a href="#">Blog</a></li>
          <li><a href="#">Press</a></li>
        </ul>
      </div>
      <div>
        <div class="footer-head">Support</div>
        <ul class="footer-links">
          <li><a href="contact.html">Contact</a></li>
          <li><a href="#">FAQ</a></li>
          <li><a href="#">Privacy</a></li>
          <li><a href="#">Terms</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2025 FitLife Pro Ltd. All rights reserved.</span>
      <span>Made with ❤️ in London</span>
    </div>
  </footer>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const current = window.location.pathname.split('/').pop() || 'index.html';
      document.querySelectorAll('.nav-links a').forEach(link => {
        if (link.getAttribute('href') === current) link.classList.add('active');
      });
      const toggle = document.getElementById('menuToggle');
      const navLinks = document.getElementById('navLinks');
      toggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(navLinks.classList.contains('open')));
      });
      const observer = new IntersectionObserver(entries => {
        entries.forEach(el => {
          if (el.isIntersecting) {
            el.target.style.opacity = '1';
            el.target.style.transform = 'translateY(0)';
          }
        });
      }, { threshold: 0.1 });
      document.querySelectorAll('.reveal').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(18px)';
        el.style.transition = 'opacity .55s ease, transform .55s ease';
        observer.observe(el);
      });
    });
  </script>
</body>
</html>
`
