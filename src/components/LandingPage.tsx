import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  Users,
  Zap,
  ChevronRight,
  Lock,
  Activity,
  CheckCircle2,
  HelpCircle,
  Award,
  ArrowRight,
  MapPin,
  Clock,
  Sparkles,
  Shield,
  Menu,
  X,
  Mail,
  Globe,
  HeartPulse,
  Github,
  Linkedin,
  Droplet,
  UserPlus,
  Truck,
  Coffee,
  UtensilsCrossed,
  Moon,
  Ban,
  Building2
} from "lucide-react";

interface LandingPageProps {
  onJoin?: () => void;
}

// Optimized high-performance animated counter that runs when mounted
function AnimatedCounter({ value, duration = 1500 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) return;

    const startTime = performance.now();
    let animationFrameId: number;

    const updateCount = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);

      // Easing function: easeOutQuad
      const easeProgress = progress * (2 - progress);
      const currentCount = Math.floor(easeProgress * end);

      setCount(currentCount);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCount);
      } else {
        setCount(end);
      }
    };

    animationFrameId = requestAnimationFrame(updateCount);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration]);

  return <span>{count}</span>;
}

// Animated ECG / heartbeat pulse visual used inside the hero card
function HeartbeatPulse() {
  return (
    <div className="relative flex-1 flex items-center justify-center py-6">
      {/* Ambient pulse rings behind the drop */}
      <div className="absolute w-40 h-40 rounded-full border border-red-500/10 animate-ping opacity-20" />
      <div className="absolute w-28 h-28 rounded-full border border-red-500/20 animate-pulse" />

      {/* ECG line */}
      <svg viewBox="0 0 320 100" className="absolute inset-x-0 w-full h-24 opacity-80" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ecgGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f87171" stopOpacity="0" />
            <stop offset="20%" stopColor="#f87171" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#ef4444" stopOpacity="1" />
            <stop offset="80%" stopColor="#f87171" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d="M0,50 L60,50 L80,50 L92,20 L104,80 L116,10 L128,50 L150,50 L320,50"
          fill="none"
          stroke="url(#ecgGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.4 }}
        />
      </svg>

      {/* Blood drop marker, centered on the pulse spike */}
      <motion.div
        className="w-20 h-20 bg-gradient-to-br from-red-500 to-rose-600 rounded-[45%_45%_50%_50%/60%_60%_40%_40%] rotate-45 flex items-center justify-center relative z-10 shadow-lg shadow-red-500/30"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <Droplet className="w-9 h-9 text-white -rotate-45 fill-white/90" />
      </motion.div>
    </div>
  );
}

export default function LandingPage({ onJoin }: LandingPageProps) {
  const navigate = useNavigate();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Smooth scroll helper
  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navLinks = [
    { label: "Home", action: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
    { label: "About", action: () => scrollToSection("about") },
    { label: "How It Works", action: () => scrollToSection("how-it-works") },
    { label: "Donation Tips", action: () => scrollToSection("donation-tips") },
    { label: "FAQ", action: () => scrollToSection("faq") },
    { label: "Contact", action: () => scrollToSection("contact") },
  ];

  const trustBadges = [
    { icon: <Shield className="w-3.5 h-3.5 text-emerald-400" />, label: "Campus verified" },
    { icon: <Zap className="w-3.5 h-3.5 text-yellow-400" />, label: "Real-time alerts" },
    { icon: <Lock className="w-3.5 h-3.5 text-blue-400" />, label: "Privacy protected" },
  ];

  const stats = [
    { value: 480, suffix: "+", label: "Registered Donors", sub: "Verified KLU Members", icon: <Users className="w-5 h-5 text-red-500" /> },
    { value: 120, suffix: "+", label: "Lives Saved", sub: "Emergency Matches", icon: <Heart className="w-5 h-5 text-red-500" /> },
    { value: 64, suffix: "+", label: "Emergency Requests", sub: "Active Matches Resolved", icon: <Zap className="w-5 h-5 text-red-500" /> },
    { value: 8, suffix: " Types", label: "Blood Groups", sub: "Fully Supported Compatible Types", icon: <Activity className="w-5 h-5 text-red-500" /> }
  ];

  const whyCards = [
    {
      icon: <Users className="w-6 h-6 text-red-500" />,
      title: "Verified University Members",
      desc: "Exclusively restricted to KL University students, faculty, and administrative staff. By filtering out public email domains, we preserve direct trust and campus community safety."
    },
    {
      icon: <Zap className="w-6 h-6 text-red-500" />,
      title: "Emergency Blood Matching",
      desc: "Our high-speed proximity and compatibility engine targets active, nearby eligible donors matching compatible groups in seconds. Fast, direct, and zero chat spam."
    },
    {
      icon: <HeartPulse className="w-6 h-6 text-red-500" />,
      title: "Campus Community Support",
      desc: "An elite campus solidarity network that supports quick volunteer mobilization, instant hospital transport assistance, and counselor support at every step."
    }
  ];

  const steps = [
    { num: "01", title: "Register", desc: "Create your secure donor profile using your official security credentials in under a minute." },
    { num: "02", title: "Verify University Email", desc: "Authenticate your campus role using your @kluniversity.in email ID to keep public spam out." },
    { num: "03", title: "Become Available", desc: "Declare your blood group, update your donation history, and toggle your active availability state." },
    { num: "04", title: "Respond to Emergency Requests", desc: "Receive immediate matching alerts on your radar, verify requirements, and coordinate life-saving support." }
  ];

  const eligibilityTips = [
    { icon: <CheckCircle2 className="w-4.5 h-4.5" />, text: "Aged between 18–65 years" },
    { icon: <CheckCircle2 className="w-4.5 h-4.5" />, text: "Weigh at least 45kg" },
    { icon: <CheckCircle2 className="w-4.5 h-4.5" />, text: "Hemoglobin level above 12.5 g/dL" },
    { icon: <CheckCircle2 className="w-4.5 h-4.5" />, text: "No donation in the last 90 days" },
    { icon: <Ban className="w-4.5 h-4.5" />, text: "No recent surgery or blood transfusion" },
  ];

  const beforeTips = [
    { icon: <Moon className="w-5 h-5 text-blue-400" />, title: "Sleep well", desc: "Get a full night's rest before your donation appointment." },
    { icon: <UtensilsCrossed className="w-5 h-5 text-blue-400" />, title: "Eat iron-rich food", desc: "Have a healthy, iron-rich meal a few hours prior." },
    { icon: <Droplet className="w-5 h-5 text-blue-400" />, title: "Stay hydrated", desc: "Drink plenty of water in the 24 hours beforehand." },
    { icon: <Ban className="w-5 h-5 text-blue-400" />, title: "Avoid alcohol", desc: "Skip alcohol for at least 24 hours before donating." },
  ];

  const afterTips = [
    { icon: <Clock className="w-5 h-5 text-emerald-400" />, title: "Rest 10–15 minutes", desc: "Relax at the donation site before resuming activity." },
    { icon: <Droplet className="w-5 h-5 text-emerald-400" />, title: "Hydrate extra", desc: "Drink more fluids than usual over the next day." },
    { icon: <Coffee className="w-5 h-5 text-emerald-400" />, title: "Refuel with a snack", desc: "Eat something light and sweet to restore your energy." },
    { icon: <Ban className="w-5 h-5 text-emerald-400" />, title: "Avoid heavy lifting", desc: "Skip strenuous exercise for the remainder of the day." },
  ];

  const testimonials = [
    {
      quote: "My father required urgent O-negative blood for heart surgery. Proximity matches on WhatsApp groups got buried instantly in spam. Within 10 minutes of posting on Suraksha, three students responded, verified compatibility, and arrived at the clinic. It is an indispensable lifesaver.",
      author: "Aditya K. Verma",
      role: "B.Tech CSE, Student",
      gradient: "from-orange-500 to-red-600",
      initials: "AV"
    },
    {
      quote: "Suraksha has solved the coordinate problem on campus. Instead of spamming everyone, we target matching compatible donors cleanly. This secure network has our department's and clinic's full advisory backing. Highly professional framework.",
      author: "Dr. Sandeep Vardhan",
      role: "Professor & Medical Advisor",
      gradient: "from-blue-600 to-indigo-600",
      initials: "SV"
    },
    {
      quote: "In emergency dispatch, time is cellular survival. By leveraging authenticated university emails and keeping student coordinates secure, Suraksha cuts match and dispatch times from a grueling 5 hours to a prompt 15 minutes.",
      author: "Dr. Rachel Green",
      role: "Resident Cardiologist, Advisory Board",
      gradient: "from-rose-500 to-pink-600",
      initials: "RG"
    }
  ];

  const faqs = [
    { q: "Who is allowed to join the Suraksha network?", a: "Only verified students, faculty, and administrative staff members of KL University. You must register using your official university-issued email address ending with @kluniversity.in." },
    { q: "How does the smart notification matching work?", a: "When an emergency request is posted, our system automatically targets active available campus members with compatible blood types. Instead of broadcasting to everyone and creating spam, high-priority notifications are directed only to eligible matches." },
    { q: "Are my phone number and details visible to everyone?", a: "No. Your privacy is protected. Your contact number is kept completely hidden from public directories. It is only displayed to the specific verified request creator when you actively tap 'Accept Request'." },
    { q: "What is the medical eligibility criteria to donate?", a: "Donors must weigh 45kg or more, have a healthy hemoglobin level, and not have donated blood in the last 90 days. The system automatically tracks your eligibility based on your last donation date." },
    { q: "Can I use public emails like Gmail, Yahoo, or Outlook?", a: "No. To maintain extreme security, campus integrity, and protect student privacy, we reject all public email addresses. Only official @kluniversity.in emails are accepted." }
  ];

  return (
    <div className="min-h-screen text-slate-100 bg-navy-dark relative overflow-hidden font-sans selection:bg-red-500 selection:text-white">

      {/* Abstract Glowing Accent Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-red-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-900/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-rose-600/5 blur-[160px] pointer-events-none" />

      {/* 1. Fixed Navbar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-navy-dark/80 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/30">
              <Droplet className="w-6 h-6 text-white fill-white/90" />
            </div>
            <div>
              <span className="font-display text-xl font-black tracking-wide text-white block leading-tight">Suraksha</span>
              <span className="block text-[9px] font-mono tracking-widest text-red-400 uppercase font-bold">KL University only</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button key={link.label} onClick={link.action} className="text-sm font-medium text-gray-300 hover:text-white transition tracking-wide">
                {link.label}
              </button>
            ))}
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => navigate("/login")}
              className="text-xs font-mono font-bold text-gray-200 hover:text-white transition px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/register")}
              className="bg-gradient-to-r from-red-500 via-rose-600 to-orange-500 hover:brightness-110 text-white text-xs font-mono font-bold px-5 py-2.5 rounded-full shadow-lg shadow-red-950/40 flex items-center gap-1.5 hover:-translate-y-0.5 transition"
            >
              <UserPlus className="w-3.5 h-3.5" /> Become Donor
            </button>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            className="md:hidden p-2 text-gray-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Panel */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-navy-dark border-b border-white/5 px-6 pb-6 overflow-hidden space-y-4 flex flex-col"
            >
              {navLinks.map((link) => (
                <button key={link.label} onClick={link.action} className="text-left text-sm font-mono text-gray-300 py-2">
                  {link.label.toUpperCase()}
                </button>
              ))}
              <div className="pt-2 flex flex-col gap-3">
                <button onClick={() => navigate("/login")} className="w-full text-center border border-white/10 hover:bg-white/5 py-2.5 rounded-full text-xs font-mono font-bold">LOG IN</button>
                <button onClick={() => navigate("/register")} className="w-full text-center bg-gradient-to-r from-red-500 via-rose-600 to-orange-500 py-2.5 rounded-full text-xs font-mono font-bold text-white shadow-lg shadow-red-900/40">BECOME DONOR</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-40 pb-24 px-6 overflow-hidden z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-14 items-center">

          {/* Hero Details */}
          <div className="lg:col-span-7 space-y-7 text-left">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-gray-300 px-4 py-1.5 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> KL University Campus Blood Network
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-display text-5xl sm:text-7xl font-black tracking-tight leading-[0.95] text-white"
            >
              Every Minute<br />Matters.
            </motion.h1>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="text-xl sm:text-2xl font-bold text-gray-300"
            >
              Connect Blood Donors Across KL University.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-gray-400 text-sm sm:text-base max-w-xl leading-relaxed"
            >
              Suraksha is a campus-only emergency blood donation platform for verified KL University students. Register with your @kluniversity.in email, get matched fast, and respond when every second counts.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 pt-2"
            >
              <button
                onClick={() => navigate("/register")}
                className="bg-gradient-to-r from-red-500 via-rose-600 to-orange-500 hover:brightness-110 text-white font-bold py-3.5 px-8 rounded-full text-sm transition shadow-xl shadow-red-950/60 flex items-center justify-center gap-2 group hover:-translate-y-0.5"
              >
                <UserPlus className="w-4 h-4" /> Become Donor
              </button>
              <button
                onClick={() => navigate("/register")}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:brightness-110 text-white font-bold text-sm tracking-wide transition py-3.5 px-8 rounded-full flex items-center justify-center gap-2 shadow-xl shadow-blue-950/40 hover:-translate-y-0.5"
              >
                <Truck className="w-4 h-4" /> Request Blood
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-3"
            >
              {trustBadges.map((badge) => (
                <span key={badge.label} className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                  {badge.icon} {badge.label}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Live Response Network Visual Card */}
          <div className="lg:col-span-5 relative flex justify-center items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative w-full max-w-[420px] aspect-square rounded-3xl bg-white/[0.02] border border-white/10 p-6 flex flex-col justify-between overflow-hidden shadow-2xl backdrop-blur-2xl"
            >
              {/* Overlay Glass Grid Glow */}
              <div className="absolute top-[-30%] right-[-20%] w-56 h-56 rounded-full bg-red-600/20 blur-3xl" />
              <div className="absolute bottom-[-10%] left-[-10%] w-44 h-44 rounded-full bg-blue-500/10 blur-3xl" />

              {/* Header inside the visualizer card */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="text-[11px] font-mono tracking-wide text-gray-300 font-bold">Live response network</span>
                </div>
              </div>

              {/* Heartbeat / ECG illustration */}
              <HeartbeatPulse />

              {/* Bottom stat readouts */}
              <div className="grid grid-cols-2 gap-3 relative z-10">
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-3.5">
                  <div className="text-xl font-display font-black text-white">11 min</div>
                  <div className="text-[10px] text-gray-500 font-mono mt-0.5">Average response time</div>
                </div>
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-3.5">
                  <div className="text-xl font-display font-black text-white">Verified</div>
                  <div className="text-[10px] text-gray-500 font-mono mt-0.5">@kluniversity.in only</div>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </section>

      {/* 3. LIVE STATISTICS STRIP */}
      <section className="py-16 px-6 border-t border-white/5 bg-white/[0.01] relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-11 h-11 shrink-0 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                {stat.icon}
              </div>
              <div>
                <div className="text-2xl font-display font-black text-white flex items-baseline gap-0.5">
                  <AnimatedCounter value={stat.value} /><span className="text-sm text-red-500/80">{stat.suffix}</span>
                </div>
                <p className="text-[11px] text-gray-500 font-mono">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. ABOUT */}
      <section id="about" className="py-24 px-6 relative z-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto">

          <div className="text-center max-w-3xl mx-auto mb-20 space-y-3">
            <span className="text-xs font-mono text-red-500 tracking-widest uppercase font-bold">About Suraksha</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Designed from the ground up for critical campus situations
            </h2>
            <div className="h-1 w-20 bg-gradient-to-r from-red-600 to-orange-400 mx-auto rounded-full mt-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {whyCards.map((card, idx) => (
              <motion.div
                key={idx}
                className="p-8 rounded-3xl bg-white/[0.01] border border-white/5 hover:border-red-500/20 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between shadow-lg h-80"
                whileHover={{ y: -8 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-3xl group-hover:bg-red-500/10 transition duration-500 pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />

                <div>
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 shadow-inner text-red-500 group-hover:scale-110 group-hover:bg-red-500 group-hover:text-white transition duration-300">
                    {card.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4 tracking-tight group-hover:text-red-500 transition-colors duration-200">{card.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{card.desc}</p>
                </div>

                <div className="text-[11px] font-mono text-red-500 uppercase tracking-widest flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition duration-300">
                  Secure & Fast <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* 5. HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-6 border-t border-white/5 bg-white/[0.01] relative z-10">
        <div className="max-w-7xl mx-auto">

          <div className="text-center max-w-2xl mx-auto mb-20 space-y-3">
            <span className="text-xs font-mono text-red-500 tracking-widest uppercase font-bold">How a life gets saved</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              The 4-Step Network Mechanics
            </h2>
            <p className="text-gray-400 text-sm">Secure, automated, and streamlined campus coordination loops.</p>
            <div className="h-1 w-16 bg-gradient-to-r from-red-600 to-orange-400 mx-auto rounded-full mt-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">

            <div className="hidden md:block absolute top-[68px] left-[12%] right-[12%] h-[2px] bg-white/5 overflow-hidden z-0">
              <motion.div
                className="h-full bg-gradient-to-r from-red-500 via-rose-500 to-orange-500"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                style={{ width: "100%" }}
              />
            </div>

            {steps.map((step, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center text-center p-6 bg-navy-dark/80 rounded-2xl border border-white/5 shadow-xl group hover:border-red-500/20 transition duration-300">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0a0f26] to-[#121c40] border border-white/10 flex items-center justify-center font-display font-black text-lg text-red-500 shadow-md mb-6 relative group-hover:text-white group-hover:from-red-600 group-hover:to-orange-500 group-hover:border-red-500 transition duration-300">
                  {step.num}
                  <span className="absolute -inset-1.5 rounded-full border border-red-500/0 group-hover:border-red-500/20 transition duration-300 scale-90 group-hover:scale-100" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-red-500 transition-colors duration-200">{step.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 6. DONATION TIPS */}
      <section id="donation-tips" className="py-24 px-6 relative z-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto">

          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-mono text-red-500 tracking-widest uppercase font-bold">Stay Safe, Stay Ready</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Donation Tips & Eligibility
            </h2>
            <p className="text-gray-400 text-sm">Everything you need to know to donate safely and confidently.</p>
            <div className="h-1 w-16 bg-gradient-to-r from-red-600 to-orange-400 mx-auto rounded-full mt-4" />
          </div>

          {/* Eligibility checklist banner */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-red-950/20 to-transparent border border-red-500/20 mb-8">
            <h3 className="text-sm font-mono font-bold text-red-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Award className="w-4 h-4" /> Eligibility Criteria
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {eligibilityTips.map((tip, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-gray-300 bg-white/[0.02] border border-white/5 rounded-xl p-3">
                  <span className="text-red-500 shrink-0">{tip.icon}</span>
                  <span>{tip.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Before / After columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.01] border border-white/5">
              <h3 className="text-sm font-mono font-bold text-blue-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Before You Donate
              </h3>
              <div className="space-y-4">
                {beforeTips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-9 h-9 shrink-0 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      {tip.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{tip.title}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">{tip.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.01] border border-white/5">
              <h3 className="text-sm font-mono font-bold text-emerald-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> After You Donate
              </h3>
              <div className="space-y-4">
                {afterTips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-9 h-9 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      {tip.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{tip.title}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">{tip.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 7. DONOR SUCCESS STORIES */}
      <section className="py-24 px-6 border-t border-white/5 bg-white/[0.01] relative z-10">
        <div className="max-w-6xl mx-auto">

          <div className="text-center max-w-2xl mx-auto mb-20 space-y-3">
            <span className="text-xs font-mono text-red-500 tracking-widest uppercase font-bold">Campus Solidarity</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">Stories That Drive Us</h2>
            <div className="h-1 w-16 bg-gradient-to-r from-red-600 to-orange-400 mx-auto rounded-full mt-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, idx) => (
              <motion.div
                key={idx}
                className="p-8 rounded-3xl bg-navy-dark border border-white/5 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-red-500/20 transition duration-300 h-[360px]"
                whileHover={{ y: -8 }}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 rounded-full blur-2xl pointer-events-none" />

                <p className="text-xs sm:text-sm italic text-gray-300 leading-relaxed mb-8 flex-1">
                  "{t.quote}"
                </p>

                <div className="border-t border-white/5 pt-6 flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white font-mono font-black text-xs shadow-lg shadow-black/40 border border-white/10 shrink-0`}>
                    {t.initials}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold text-white text-sm truncate">{t.author}</div>
                    <div className="text-xs text-red-500 font-mono mt-0.5 truncate">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* 8. FAQ ACCORDION */}
      <section id="faq" className="py-24 px-6 border-t border-white/5 relative z-10">
        <div className="max-w-3xl mx-auto">

          <div className="text-center mb-16 space-y-3">
            <span className="text-xs font-mono text-red-500 uppercase tracking-widest font-bold">FAQ</span>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">Frequently Answered Queries</h2>
            <p className="text-xs text-gray-400 font-mono">Everything you need to know about the Suraksha Shield.</p>
            <div className="h-1 w-12 bg-gradient-to-r from-red-600 to-orange-400 mx-auto rounded-full mt-4" />
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="border border-white/5 rounded-2xl overflow-hidden bg-white/[0.01] transition-all duration-300 hover:border-white/10"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full text-left p-5 flex items-center justify-between hover:bg-white/[0.02] transition focus:outline-none"
                >
                  <span className="font-bold text-sm sm:text-base text-white pr-4">{faq.q}</span>
                  <div className={`w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-red-500 transition-transform duration-300 ${activeFaq === idx ? 'rotate-180 bg-red-500/10 text-red-500' : ''}`}>
                    <HelpCircle className="w-4 h-4" />
                  </div>
                </button>
                <AnimatePresence>
                  {activeFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="p-5 pt-0 border-t border-white/5 text-xs sm:text-sm text-gray-400 leading-relaxed bg-navy-dark/40">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 9. CONTACT */}
      <section id="contact" className="py-24 px-6 border-t border-white/5 bg-white/[0.01] relative z-10">
        <div className="max-w-5xl mx-auto">

          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-mono text-red-500 tracking-widest uppercase font-bold">Get In Touch</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">Contact Suraksha</h2>
            <p className="text-gray-400 text-sm">Reach the campus network team for support, partnerships, or urgent escalations.</p>
            <div className="h-1 w-16 bg-gradient-to-r from-red-600 to-orange-400 mx-auto rounded-full mt-4" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-navy-dark border border-white/5 text-center space-y-3">
              <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500">
                <Mail className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Emergency Support</h4>
              <a href="mailto:emergency@kluniversity.in" className="text-xs text-gray-400 hover:text-red-400 transition font-mono block">
                emergency@kluniversity.in
              </a>
            </div>

            <div className="p-6 rounded-2xl bg-navy-dark border border-white/5 text-center space-y-3">
              <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500">
                <Building2 className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Campus Location</h4>
              <p className="text-xs text-gray-400">Green Fields, Vaddeswaram, Guntur, AP, India</p>
            </div>

            <div className="p-6 rounded-2xl bg-navy-dark border border-white/5 text-center space-y-3">
              <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Response Window</h4>
              <p className="text-xs text-gray-400">Live matching, 24 hours a day, every day of the year</p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer className="bg-navy-dark border-t border-white/5 pt-16 pb-10 px-6 text-xs text-gray-400 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow">
                  <Droplet className="w-4.5 h-4.5 text-white fill-white/90" />
                </div>
                <span className="font-display font-black text-white text-lg tracking-widest">SURAKSHA</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                A premium, secure emergency blood coordination network exclusively for the KL University student, faculty, and administrative staff communities.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4">Quick Links</h4>
              <ul className="space-y-2 text-[11px]">
                {navLinks.map((link) => (
                  <li key={link.label}><button onClick={link.action} className="hover:text-red-500 transition text-left">{link.label}</button></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4">Connect</h4>
              <div className="flex gap-3 text-red-500">
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer text-gray-300 hover:text-white">
                  <Github className="w-4 h-4" />
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer text-gray-300 hover:text-white">
                  <Linkedin className="w-4 h-4" />
                </a>
                <span className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer text-gray-300 hover:text-white">
                  <Globe className="w-4 h-4" />
                </span>
              </div>
            </div>

          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-gray-500">
            <p>© 2026 SURAKSHA Campus Network. Certified for KL University deployment. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="font-mono tracking-wider uppercase text-[9px] text-red-400 font-bold">Secure Radar Operational</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
