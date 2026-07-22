import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Heart, 
  ShieldAlert, 
  MessageSquareX, 
  Users, 
  Zap, 
  ChevronRight, 
  Bell, 
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
  Phone,
  MessageSquare,
  Globe,
  Share2,
  HeartPulse,
  Github,
  Linkedin
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

  const stats = [
    { 
      value: 480, 
      suffix: "+", 
      label: "Registered Donors", 
      sub: "Verified KLU Members", 
      icon: <Users className="w-5 h-5 text-red-500" /> 
    },
    { 
      value: 120, 
      suffix: "+", 
      label: "Lives Saved", 
      sub: "Emergency Matches", 
      icon: <Heart className="w-5 h-5 text-red-500" /> 
    },
    { 
      value: 64, 
      suffix: "+", 
      label: "Emergency Requests", 
      sub: "Active Matches Resolved", 
      icon: <Zap className="w-5 h-5 text-red-500" /> 
    },
    { 
      value: 8, 
      suffix: " Types", 
      label: "Blood Groups", 
      sub: "Fully Supported Compatible Types", 
      icon: <Activity className="w-5 h-5 text-red-500" /> 
    }
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
    {
      num: "01",
      title: "Register",
      desc: "Create your secure donor profile using your official security credentials in under a minute."
    },
    {
      num: "02",
      title: "Verify University Email",
      desc: "Authenticate your campus role using your @kluniversity.in email ID to keep public spam out."
    },
    {
      num: "03",
      title: "Become Available",
      desc: "Declare your blood group, update your donation history, and toggle your active availability state."
    },
    {
      num: "04",
      title: "Respond to Emergency Requests",
      desc: "Receive immediate matching alerts on your radar, verify requirements, and coordinate life-saving support."
    }
  ];

  const previewRequests = [
    {
      bloodGroup: "O-",
      patient: "Srinivas Rao (Faculty Father)",
      hospital: "AIIMS Hospital, Vijayawada",
      distance: "2.8 km from Campus",
      urgency: "CRITICAL (Within 2 Hours)",
      unitsNeeded: 3,
      timePosted: "12 mins ago",
      isCritical: true,
      icon: <HeartPulse className="w-5 h-5 text-red-500" />
    },
    {
      bloodGroup: "A+",
      patient: "Ananya Mehta (B.Tech Student)",
      hospital: "Ramesh Hospitals, Guntur",
      distance: "14 km from Campus",
      urgency: "HIGH (Within 6 Hours)",
      unitsNeeded: 2,
      timePosted: "45 mins ago",
      isCritical: false,
      icon: <Heart className="w-5 h-5 text-red-400" />
    },
    {
      bloodGroup: "B-",
      patient: "Suresh Kumar (Lab Assistant)",
      hospital: "Government General Hospital, Guntur",
      distance: "12.5 km from Campus",
      urgency: "MODERATE (Within 12 Hours)",
      unitsNeeded: 1,
      timePosted: "2 hours ago",
      isCritical: false,
      icon: <Activity className="w-5 h-5 text-yellow-500" />
    }
  ];

  const testimonials = [
    {
      quote: "My father required urgent O-negative blood for heart surgery. Proximity matches on WhatsApp groups got buried instantly in spam. Within 10 minutes of posting on Suraksha, three students responded, verified compatibility, and arrived at the clinic. It is an indispensable lifesaver.",
      author: "Aditya K. Verma",
      role: "B.Tech CSE, Student",
      gradient: "from-orange-500 to-red-600 animate-pulse-subtle",
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
    {
      q: "Who is allowed to join the Suraksha network?",
      a: "Only verified students, faculty, and administrative staff members of KL University. You must register using your official university-issued email address ending with @kluniversity.in."
    },
    {
      q: "How does the smart notification matching work?",
      a: "When an emergency request is posted, our system automatically targets active available campus members with compatible blood types. Instead of broadcasting to everyone and creating spam, high-priority notifications are directed only to eligible matches."
    },
    {
      q: "Are my phone number and details visible to everyone?",
      a: "No. Your privacy is protected. Your contact number is kept completely hidden from public directories. It is only displayed to the specific verified request creator when you actively tap 'Accept Request'."
    },
    {
      q: "What is the medical eligibility criteria to donate?",
      a: "Donors must weigh 45kg or more, have a healthy hemoglobin level, and not have donated blood in the last 90 days. The system automatically tracks your eligibility based on your last donation date."
    },
    {
      q: "Can I use public emails like Gmail, Yahoo, or Outlook?",
      a: "No. To maintain extreme security, campus integrity, and protect student privacy, we reject all public email addresses. Only official @kluniversity.in emails are accepted."
    }
  ];

  return (
    <div className="min-h-screen text-slate-100 bg-[#050816] relative overflow-hidden font-sans selection:bg-red-500 selection:text-white">
      
      {/* Abstract Glowing Accent Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-red-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] rounded-full bg-red-900/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-rose-600/5 blur-[160px] pointer-events-none" />

      {/* Floating Animated Red Droplets (Framer Motion) */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-to-b from-red-500/30 to-red-600/10 border border-red-500/20"
            style={{
              width: Math.random() * 14 + 10,
              height: Math.random() * 20 + 16,
              left: `${Math.random() * 85 + 5}%`,
              top: `${Math.random() * 75 + 10}%`,
              borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%", // drop-like shape
            }}
            animate={{
              y: [0, -35, 0],
              x: [0, Math.random() * 15 - 7, 0],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: Math.random() * 8 + 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 4,
            }}
          />
        ))}
      </div>

      {/* 1. Fixed Navbar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#050816]/75 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center font-display font-black text-xl text-white shadow-lg shadow-red-500/20">
              S
            </div>
            <div>
              <span className="font-display text-lg font-black tracking-widest text-white block">SURAKSHA</span>
              <span className="block text-[8px] font-mono tracking-widest text-red-500 uppercase font-bold">KLU Emergency Shield</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="text-xs font-mono font-medium text-gray-400 hover:text-white transition tracking-wider">HOME</button>
            <button onClick={() => scrollToSection("live-stats")} className="text-xs font-mono font-medium text-gray-400 hover:text-white transition tracking-wider">STATISTICS</button>
            <button onClick={() => scrollToSection("why-suraksha")} className="text-xs font-mono font-medium text-gray-400 hover:text-white transition tracking-wider">ABOUT</button>
            <button onClick={() => scrollToSection("how-it-works")} className="text-xs font-mono font-medium text-gray-400 hover:text-white transition tracking-wider">HOW IT WORKS</button>
            <button onClick={() => scrollToSection("emergency-status")} className="text-xs font-mono font-medium text-gray-400 hover:text-white transition tracking-wider">EMERGENCY</button>
            <button onClick={() => scrollToSection("faq-section")} className="text-xs font-mono font-medium text-gray-400 hover:text-white transition tracking-wider">FAQ</button>
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={() => navigate("/login")} 
              className="text-xs font-mono font-semibold text-gray-300 hover:text-white transition px-4 py-2"
            >
              LOG IN
            </button>
            <button 
              onClick={() => navigate("/register")} 
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-bold px-5 py-2.5 rounded-xl border border-red-500/20 transition shadow-lg shadow-red-950/40 flex items-center gap-1.5 hover:-translate-y-0.5"
            >
              REGISTER PORTAL <ChevronRight className="w-3.5 h-3.5" />
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
              className="md:hidden bg-[#050816] border-b border-white/5 px-6 pb-6 overflow-hidden space-y-4 flex flex-col"
            >
              <button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setMobileMenuOpen(false); }} className="text-left text-sm font-mono text-gray-400 py-2">HOME</button>
              <button onClick={() => { scrollToSection("live-stats"); setMobileMenuOpen(false); }} className="text-left text-sm font-mono text-gray-400 py-2">STATISTICS</button>
              <button onClick={() => { scrollToSection("why-suraksha"); setMobileMenuOpen(false); }} className="text-left text-sm font-mono text-gray-400 py-2">ABOUT</button>
              <button onClick={() => { scrollToSection("how-it-works"); setMobileMenuOpen(false); }} className="text-left text-sm font-mono text-gray-400 py-2">HOW IT WORKS</button>
              <button onClick={() => { scrollToSection("emergency-status"); setMobileMenuOpen(false); }} className="text-left text-sm font-mono text-gray-400 py-2">EMERGENCY</button>
              <button onClick={() => { scrollToSection("faq-section"); setMobileMenuOpen(false); }} className="text-left text-sm font-mono text-gray-400 py-2">FAQ</button>
              <div className="pt-2 flex flex-col gap-3">
                <button onClick={() => navigate("/login")} className="w-full text-center border border-white/10 hover:bg-white/5 py-2.5 rounded-xl text-xs font-mono font-bold">LOG IN</button>
                <button onClick={() => navigate("/register")} className="w-full text-center bg-red-600 hover:bg-red-700 py-2.5 rounded-xl text-xs font-mono font-bold text-white shadow-lg shadow-red-900/40">REGISTER NOW</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-36 pb-20 px-6 overflow-hidden z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero Details */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-full text-xs font-mono font-bold tracking-wider"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-red-500" /> SECURE CAMPUS BLOOD DISPATCH NETWORK
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-display text-4xl sm:text-6xl font-black tracking-tight leading-none text-white space-y-1"
            >
              <div>One Campus.</div>
              <div>One Community.</div>
              <div className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-600 to-rose-400 font-extrabold pb-2">
                Saving Lives Together.
              </div>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-gray-400 text-sm sm:text-base max-w-xl leading-relaxed"
            >
              Say goodbye to chaotic, unreliable WhatsApp and Telegram spam. Welcome to <span className="text-white font-semibold">Suraksha</span>—the elite, real-time university emergency network connecting verified KL University students, faculty, and staff donors with campus members in critical need.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 pt-4"
            >
              <button 
                onClick={() => navigate("/register")} 
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-8 rounded-xl text-sm transition shadow-xl shadow-red-950/60 flex items-center justify-center gap-2 group hover:-translate-y-0.5"
              >
                Become a Donor
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </button>
              <button 
                onClick={() => navigate("/register")}
                className="text-sm font-mono font-semibold tracking-wider text-gray-300 hover:text-white transition py-3.5 px-6 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl flex items-center justify-center gap-2 hover:-translate-y-0.5"
              >
                Request Blood <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>

          {/* Beautiful Tech Visualizer */}
          <div className="lg:col-span-5 relative flex justify-center items-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative w-full max-w-[420px] aspect-square rounded-3xl bg-white/[0.02] border border-white/10 p-6 flex flex-col justify-between overflow-hidden shadow-2xl backdrop-blur-2xl"
            >
              {/* Overlay Glass Grid Glow */}
              <div className="absolute top-[-30%] right-[-20%] w-56 h-56 rounded-full bg-red-600/20 blur-3xl" />
              <div className="absolute bottom-[-10%] left-[-10%] w-44 h-44 rounded-full bg-red-500/10 blur-3xl" />
              
              {/* Header inside the Mock Visualizer */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="text-[10px] font-mono tracking-widest text-red-400 font-bold">KLU DISPATCH RADAR</span>
                </div>
                <span className="text-[9px] font-mono text-gray-500">PING: ACTIVE</span>
              </div>

              {/* Heart and Connecting Nodes Illustration */}
              <div className="relative flex-1 flex items-center justify-center py-6">
                
                {/* Central Pulse Waves */}
                <div className="absolute w-44 h-44 rounded-full border border-red-500/10 animate-ping opacity-25" />
                <div className="absolute w-32 h-32 rounded-full border border-red-500/20 animate-pulse" />
                
                {/* Heart Shape representation */}
                <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center relative z-10 shadow-lg shadow-red-500/30">
                  <Heart className="w-10 h-10 text-white animate-pulse" />
                </div>

                {/* Satellite Nodes mimicking nearby available campus donors */}
                <div className="absolute top-4 left-10 flex items-center gap-1.5 p-1.5 px-2.5 rounded-full bg-[#050816]/90 border border-white/10 shadow text-[9px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> A- (Faculty)
                </div>
                <div className="absolute top-10 right-8 flex items-center gap-1.5 p-1.5 px-2.5 rounded-full bg-[#050816]/90 border border-white/10 shadow text-[9px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> O- (Student)
                </div>
                <div className="absolute bottom-12 left-4 flex items-center gap-1.5 p-1.5 px-2.5 rounded-full bg-[#050816]/90 border border-white/10 shadow text-[9px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> B+ (Ready)
                </div>
                <div className="absolute bottom-8 right-12 flex items-center gap-1.5 p-1.5 px-2.5 rounded-full bg-[#050816]/90 border border-white/10 shadow text-[9px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> AB+ (Staff)
                </div>
              </div>

              {/* Footer of the visualizer card */}
              <div className="p-3.5 bg-red-500/5 rounded-2xl border border-red-500/10 text-center relative z-10">
                <div className="text-[10px] font-mono text-red-400 font-bold uppercase tracking-wider mb-0.5">Live Match Synchronization</div>
                <div className="text-xs text-white font-medium">Automatic matching takes less than 15 minutes</div>
              </div>
            </motion.div>
          </div>

        </div>
      </section>

      {/* 1. LIVE STATISTICS */}
      <section id="live-stats" className="py-24 px-6 border-t border-white/5 bg-white/[0.01] relative z-10">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-mono text-red-500 tracking-widest uppercase font-bold">RADAR METRICS</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">Live System Performance</h2>
            <div className="h-1 w-16 bg-gradient-to-r from-red-600 to-rose-400 mx-auto rounded-full mt-4" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <motion.div
                key={idx}
                className="relative group rounded-3xl p-6 bg-white/[0.01] border border-white/5 hover:border-red-500/20 transition-all duration-500 overflow-hidden shadow-xl backdrop-blur-md flex flex-col justify-between h-48"
                animate={{ y: [0, -6, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: idx * 0.4
                }}
                whileHover={{ scale: 1.03, y: -10 }}
              >
                {/* Hover Glow Background */}
                <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-red-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none" />
                
                {/* Glow Ring Border Accent */}
                <div className="absolute inset-0 rounded-3xl border border-red-500/0 group-hover:border-red-500/10 transition-all duration-500 pointer-events-none" />

                {/* Card Top Row: Custom Styled Icon and Suffix Tag */}
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 group-hover:bg-red-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-red-600/30 transition-all duration-300">
                    {stat.icon}
                  </div>
                  <span className="text-[9px] font-mono tracking-widest text-gray-500 uppercase font-bold group-hover:text-red-400 transition-colors duration-300">
                    SECURED PORTAL
                  </span>
                </div>

                {/* Card Bottom Row: Animated Counter with Label */}
                <div>
                  <div className="text-4xl sm:text-5xl font-display font-black tracking-tight text-white flex items-baseline gap-1 group-hover:text-red-500 transition-colors duration-300">
                    <AnimatedCounter value={stat.value} />
                    <span className="text-xl font-bold text-red-500/80 group-hover:text-white transition-colors duration-300">{stat.suffix}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-300 mt-1">{stat.label}</p>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">{stat.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. WHY SURAKSHA */}
      <section id="why-suraksha" className="py-24 px-6 relative z-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-3">
            <span className="text-xs font-mono text-red-500 tracking-widest uppercase font-bold">THE SURAKSHA SHIELD</span>
            <h2 className="font-display text-3xl sm:text-4.5xl font-extrabold tracking-tight text-white leading-tight">
              Designed from the ground up for critical campus situations
            </h2>
            <div className="h-1 w-20 bg-gradient-to-r from-red-600 to-rose-400 mx-auto rounded-full mt-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {whyCards.map((card, idx) => (
              <motion.div 
                key={idx}
                className="p-8 rounded-3xl bg-white/[0.01] border border-white/5 hover:border-red-500/20 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between shadow-lg h-80"
                whileHover={{ y: -8 }}
              >
                {/* Highlight Glow Effect */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-3xl group-hover:bg-red-500/10 transition duration-500 pointer-events-none" />
                
                {/* Glassmorphism gradient lines */}
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />

                <div>
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 shadow-inner text-red-500 group-hover:scale-110 group-hover:bg-red-500 group-hover:text-white transition duration-300">
                    {card.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4 tracking-tight group-hover:text-red-500 transition-colors duration-200">{card.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{card.desc}</p>
                </div>

                <div className="text-[11px] font-mono text-red-500 uppercase tracking-widest flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition duration-300">
                  Secure Dispatch Pipeline <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-6 border-t border-white/5 bg-white/[0.01] relative z-10">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-3">
            <span className="text-xs font-mono text-red-500 tracking-widest uppercase font-bold">PIPELINE TO A LIFE SAVED</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              The 4-Step Network Mechanics
            </h2>
            <p className="text-gray-400 text-sm">Secure, automated, and streamlined campus coordination loops.</p>
            <div className="h-1 w-16 bg-gradient-to-r from-red-600 to-rose-400 mx-auto rounded-full mt-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            
            {/* Horizontal Timeline Connector Lines on Desktop */}
            <div className="hidden md:block absolute top-[68px] left-[12%] right-[12%] h-[2px] bg-white/5 overflow-hidden z-0">
              <motion.div 
                className="h-full bg-gradient-to-r from-red-500 via-rose-500 to-red-600"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                style={{ width: "100%" }}
              />
            </div>

            {steps.map((step, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center text-center p-6 bg-[#050816]/80 rounded-2xl border border-white/5 shadow-xl group hover:border-red-500/20 transition duration-300">
                {/* Circular step badge */}
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0a0f26] to-[#121c40] border border-white/10 flex items-center justify-center font-display font-black text-lg text-red-500 shadow-md mb-6 relative group-hover:text-white group-hover:from-red-600 group-hover:to-rose-500 group-hover:border-red-500 transition duration-300">
                  {step.num}
                  {/* Connected ring indicator */}
                  <span className="absolute -inset-1.5 rounded-full border border-red-500/0 group-hover:border-red-500/20 transition duration-300 scale-90 group-hover:scale-100" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-red-500 transition-colors duration-200">{step.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 4. LIVE EMERGENCY REQUESTS */}
      <section id="emergency-status" className="py-24 px-6 relative z-10 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-red-950/20 to-transparent border border-red-500/20 shadow-2xl relative overflow-hidden backdrop-blur-md">
            
            {/* Background glowing rings */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-6 border-b border-white/10">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  Live Emergency Feed Simulation
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-white">Active Campus Emergency Radar</h3>
              </div>
              <div className="flex items-center gap-2 bg-red-950/80 text-red-400 font-mono text-xs px-4 py-2 rounded-xl border border-red-500/20 shadow-lg">
                <Activity className="w-4 h-4 animate-pulse text-red-500" /> 
                <span>3 CRITICAL REQUESTS ACTIVE</span>
              </div>
            </div>

            {/* List of Mock Real-looking Emergency Cards */}
            <div className="space-y-4">
              {previewRequests.map((req, idx) => (
                <div 
                  key={idx} 
                  className="p-6 rounded-2xl bg-[#050816]/95 border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-red-500/30 transition duration-300 group relative overflow-hidden"
                >
                  <div className="absolute -left-16 top-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-16 text-center py-1 rounded-lg bg-red-600 text-white font-display font-black text-sm tracking-wide shadow shadow-red-900/50">
                        {req.bloodGroup}
                      </span>
                      <span className="text-[10px] font-mono text-red-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        {req.urgency}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">•</span>
                      <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-red-500/70" /> {req.timePosted}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-white group-hover:text-red-500 transition duration-200">{req.patient}</h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-red-500/70" /> {req.hospital}</span>
                      <span className="text-gray-500">•</span>
                      <span>{req.distance}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-white/5">
                    <div className="text-left md:text-right pr-4">
                      <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Required Units</div>
                      <div className="text-sm font-bold text-white">{req.unitsNeeded} units</div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button 
                        onClick={() => navigate("/register")}
                        className="px-4 py-2 border border-white/10 hover:border-red-500/30 text-gray-300 hover:text-white hover:bg-white/[0.02] text-xs font-mono font-bold rounded-xl transition flex items-center justify-center gap-1 text-center flex-1 sm:flex-none"
                      >
                        Request Blood
                      </button>
                      <button 
                        onClick={() => navigate("/login")}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-bold rounded-xl shadow-lg shadow-red-950/80 transition flex items-center justify-center gap-1.5 hover:scale-105 flex-1 sm:flex-none"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* 5. DONOR SUCCESS STORIES */}
      <section className="py-24 px-6 border-t border-white/5 bg-white/[0.01] relative z-10">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-3">
            <span className="text-xs font-mono text-red-500 tracking-widest uppercase font-bold">CAMPUS SOLIDARITY</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">Stories That Drive Us</h2>
            <div className="h-1 w-16 bg-gradient-to-r from-red-600 to-rose-400 mx-auto rounded-full mt-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, idx) => (
              <motion.div 
                key={idx} 
                className="p-8 rounded-3xl bg-[#050816] border border-white/5 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-red-500/20 transition duration-300 h-[360px]"
                whileHover={{ y: -8 }}
              >
                {/* Mini background accent */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 rounded-full blur-2xl pointer-events-none" />
                
                <p className="text-xs sm:text-sm italic text-gray-300 leading-relaxed mb-8 flex-1">
                  "{t.quote}"
                </p>
                
                <div className="border-t border-white/5 pt-6 flex items-center gap-4">
                  
                  {/* Profile Placeholder with Premium Gradient Glow */}
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

      {/* 6. FAQ ACCORDION */}
      <section id="faq-section" className="py-24 px-6 border-t border-white/5 relative z-10">
        <div className="max-w-3xl mx-auto">
          
          <div className="text-center mb-16 space-y-3">
            <span className="text-xs font-mono text-red-500 uppercase tracking-widest font-bold">FAQ</span>
            <h2 className="font-display text-2xl sm:text-3.5xl font-extrabold text-white">Frequently Answered Queries</h2>
            <p className="text-xs text-gray-400 font-mono">Everything you need to know about the Suraksha Shield.</p>
            <div className="h-1 w-12 bg-gradient-to-r from-red-600 to-rose-400 mx-auto rounded-full mt-4" />
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
                      <div className="p-5 pt-0 border-t border-white/5 text-xs sm:text-sm text-gray-400 leading-relaxed bg-[#050816]/40">
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

      {/* 7. FOOTER */}
      <footer className="bg-[#050816] border-t border-white/5 pt-16 pb-12 px-6 text-xs text-gray-400 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            
            {/* Logo and Tagline */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center font-display font-black text-white text-base shadow">
                  S
                </div>
                <span className="font-display font-black text-white text-lg tracking-widest">SURAKSHA</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                A premium, secure emergency blood coordination network exclusively for the KL University student, faculty, and administrative staff communities.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4">Quick Links</h4>
              <ul className="space-y-2 text-[11px]">
                <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-red-500 transition text-left">Portal Home</button></li>
                <li><button onClick={() => scrollToSection("live-stats")} className="hover:text-red-500 transition text-left">Live Statistics</button></li>
                <li><button onClick={() => scrollToSection("why-suraksha")} className="hover:text-red-500 transition text-left">About Suraksha</button></li>
                <li><button onClick={() => scrollToSection("how-it-works")} className="hover:text-red-500 transition text-left">Network Flow</button></li>
                <li><button onClick={() => scrollToSection("emergency-status")} className="hover:text-red-500 transition text-left">Active Emergencies</button></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4">Contact</h4>
              <ul className="space-y-2 text-[11px] text-gray-400">
                <li>📍 Green Fields, Vaddeswaram, Guntur, AP, India.</li>
                <li>
                  <span className="text-white font-semibold">Emergency Support:</span>
                  <br />
                  <a href="mailto:emergency@kluniversity.in" className="hover:text-red-400 transition font-mono">
                    emergency@kluniversity.in
                  </a>
                </li>
              </ul>
            </div>

            {/* Social & Media Connections */}
            <div>
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4">Emergency & Tech Links</h4>
              <div className="space-y-3 text-[11px] text-gray-400">
                <p>Verify matches on our secure blockchain-inspired central database ledger.</p>
                <div className="flex gap-3 text-red-500">
                  <a 
                    href="https://github.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer text-gray-300 hover:text-white"
                  >
                    <Github className="w-4 h-4" />
                  </a>
                  <a 
                    href="https://linkedin.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer text-gray-300 hover:text-white"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                  <span className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer text-gray-300 hover:text-white">
                    <Globe className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>

          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-gray-500">
            <p>© 2026 SURAKSHA Campus Network. Certified for KL University deployment. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="font-mono tracking-wider uppercase text-[9px] text-red-400 font-bold">🔴 SECURE RADAR OPERATIONAL</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
