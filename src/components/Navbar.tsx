import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Shield, Headphones, Send, Home, Phone, ChevronDown, Landmark, UserCog, Bookmark, FileText, LayoutDashboard, LogOut, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { indianStates } from "@/data/schemes";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isOfficialDropdownOpen, setIsOfficialDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ fullName: "", phone: "", email: "", state: "" });
  const { toast } = useToast();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { user, isAuthenticated, loginWithGoogle, logout } = useAuth();

  const isOfficial = user?.role === 'government' || user?.role === 'agent' || user?.role === 'admin';
  const dashboardLink = user?.role === 'government' ? '/government/dashboard' : '/agent/dashboard';

  const handleGoogleAuth = async () => {
    try {
      await loginWithGoogle();
      toast({ title: "Welcome back!", description: "Successfully logged in with Google." });
    } catch (e: any) {
      if (e.code !== 'auth/popup-closed-by-user') {
        console.error("Firebase Google Auth Error:", e);
        toast({ title: "Login Failed", description: e.message || "Could not authenticate with Google.", variant: "destructive" });
      }
    }
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOfficialDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const navClasses = `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
    scrolled
      ? "bg-[#020617]/95 backdrop-blur-xl shadow-lg h-16 border-b border-transparent"
      : "bg-transparent h-20"
  }`;

  const handleAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone || !formData.state) {
      toast({ title: "Name, Phone and State are required", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/agents/request', {
        userName: formData.fullName,
        userPhone: formData.phone,
        userEmail: formData.email,
        state: formData.state,
        message: "Scheme advisory request from Agent Assistance modal.",
        agentId: 'all'
      });
      toast({ title: "Request Submitted", description: "A verified advisor will contact you shortly." });
      setIsAgentModalOpen(false);
      setFormData({ fullName: "", phone: "", email: "", state: "" });
    } catch {
      toast({ title: "Submission Failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const navLinks = [
    { label: "Home", href: "/", icon: Home },
    { label: "Contact", href: "#contact", icon: Phone },
  ];

  return (
    <>
      <nav className={navClasses}>
        <div className="container mx-auto flex items-center justify-between h-full px-6 lg:px-12">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group z-50">
            <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] p-1.5 rounded-xl shadow-lg">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="font-black text-xl text-white tracking-tight">SchemeSage</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${location.pathname === '/' ? 'text-white bg-white/10' : 'text-[#94A3B8] hover:text-white hover:bg-white/5'}`}
            >
              <Home className="h-4 w-4" /> Home
            </Link>

            <button
              onClick={() => setIsAgentModalOpen(true)}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-colors text-[#94A3B8] hover:text-white hover:bg-white/5"
            >
              <Headphones className="h-4 w-4" /> Agent Assistance
            </button>

            <a
              href="#contact"
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-colors text-[#94A3B8] hover:text-white hover:bg-white/5"
            >
              <Phone className="h-4 w-4" /> Contact
            </a>

            {/* Official Access Dropdown */}
            {!isAuthenticated && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsOfficialDropdownOpen(!isOfficialDropdownOpen)}
                className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-colors border ${
                  isOfficialDropdownOpen
                    ? 'bg-[#F97316] text-white border-[#F97316]'
                    : 'text-white border-white/20 hover:bg-white/10 bg-white/5'
                }`}
              >
                <Landmark className="h-4 w-4" />
                Official Access
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOfficialDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isOfficialDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-64 bg-[#0F172A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                  >
                    <div className="p-2">
                      <Link
                        to="/government/login"
                        onClick={() => setIsOfficialDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors group"
                      >
                        <div className="h-9 w-9 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                          <Landmark className="h-4 w-4 text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-green-300 transition-colors flex items-center gap-1.5">
                            Government Portal
                          </p>
                          <p className="text-xs text-[#64748B]">Login as government official</p>
                        </div>
                      </Link>

                      <div className="my-1 border-t border-white/5" />

                      <Link
                        to="/agent/login"
                        onClick={() => setIsOfficialDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors group"
                      >
                        <div className="h-9 w-9 rounded-xl bg-[#F97316]/10 flex items-center justify-center shrink-0">
                          <UserCog className="h-4 w-4 text-[#F97316]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-[#F97316] transition-colors">Agent / Admin Portal</p>
                          <p className="text-xs text-[#64748B]">Login or register as staff</p>
                        </div>
                      </Link>
                    </div>

                    <div className="px-4 py-3 bg-[#020617] border-t border-white/5">
                      <p className="text-[10px] text-[#475569] flex items-center gap-1.5">
                        <Shield className="h-3 w-3 text-green-500" />
                        Secure authenticated access only
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            )}

            {/* Auth Buttons */}
            <div className="ml-2 flex items-center border-l border-white/10 pl-4 space-x-2">
              {!isAuthenticated ? (
                <>
                  <button onClick={handleGoogleAuth} className="text-sm font-semibold text-white px-3 py-2 hover:text-[#f97316] transition-colors">
                    Log In
                  </button>
                  <button onClick={handleGoogleAuth} className="text-sm font-bold text-white px-4 py-2 bg-[#f97316] hover:bg-[#ea580c] rounded-xl transition-all shadow-lg shadow-[#f97316]/20">
                    Sign Up
                  </button>
                </>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger className="outline-none rounded-full ring-offset-2 ring-offset-[#020617] focus-visible:ring-2 focus-visible:ring-[#f97316]">
                    <Avatar className="h-10 w-10 border-2 border-white/20 hover:border-[#f97316]/50 transition-colors">
                      <AvatarImage src={user?.avatarUrl} alt={user?.fullName} />
                      <AvatarFallback className="bg-[#f97316] text-white font-black">
                        {user?.fullName?.charAt(0) || 'C'}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 bg-[#0F172A] border-white/10 text-white rounded-2xl shadow-2xl overflow-hidden mt-2">
                    <div className="px-4 py-3 bg-[#020617] border-b border-white/5 flex flex-col gap-0.5">
                      <p className="text-sm font-bold truncate">{user?.fullName}</p>
                      <p className="text-xs text-[#94A3B8] truncate">{user?.email}</p>
                    </div>
                    
                    <div className="p-2 space-y-0.5">
                      {isOfficial ? (
                        <DropdownMenuItem asChild className="hover:bg-white/5 focus:bg-white/5 cursor-pointer rounded-xl">
                          <Link to={dashboardLink} className="flex items-center gap-2">
                            <LayoutDashboard className="h-4 w-4 text-[#f97316]" /> Go to Dashboard
                          </Link>
                        </DropdownMenuItem>
                      ) : (
                        <>
                          <DropdownMenuItem asChild className="hover:bg-white/5 focus:bg-white/5 cursor-pointer rounded-xl">
                            <Link to="/tracking" className="flex items-center gap-2">
                              <Activity className="h-4 w-4 text-[#f97316]" /> Application Tracking
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="hover:bg-white/5 focus:bg-white/5 cursor-pointer rounded-xl">
                            <Link to="/saved-schemes" className="flex items-center gap-2">
                              <Bookmark className="h-4 w-4 text-blue-400" /> Saved Schemes
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="hover:bg-white/5 focus:bg-white/5 cursor-pointer rounded-xl">
                            <Link to="/applications" className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-green-400" /> Applications History
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                    </div>

                    <DropdownMenuSeparator className="bg-white/5 m-0" />
                    
                    <div className="p-2">
                      <DropdownMenuItem onClick={logout} className="hover:bg-red-500/10 focus:bg-red-500/10 text-red-400 cursor-pointer rounded-xl flex items-center gap-2 font-semibold">
                        <LogOut className="h-4 w-4" /> Logout
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden z-50 bg-white/5 p-2 rounded-xl border border-white/10 text-white"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="lg:hidden absolute top-0 left-0 right-0 bg-[#0F172A] border-b border-white/10 pt-20 pb-8 px-6 shadow-2xl"
            >
              <div className="flex flex-col space-y-1">
                <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-3 text-white font-bold py-3 px-4 rounded-xl hover:bg-white/5">
                  <Home className="h-5 w-5 text-[#94A3B8]" /> Home
                </Link>
                <button
                  onClick={() => { setIsAgentModalOpen(true); setOpen(false); }}
                  className="flex items-center gap-3 text-white font-bold py-3 px-4 rounded-xl hover:bg-white/5 text-left"
                >
                  <Headphones className="h-5 w-5 text-[#94A3B8]" /> Agent Assistance
                </button>
                <a href="#contact" onClick={() => setOpen(false)} className="flex items-center gap-3 text-white font-bold py-3 px-4 rounded-xl hover:bg-white/5">
                  <Phone className="h-5 w-5 text-[#94A3B8]" /> Contact
                </a>

                {!isAuthenticated && (
                <div className="border-t border-white/5 pt-3 mt-2 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#475569] px-4 mb-2">Official Access</p>
                  <Link
                    to="/government/login"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 text-white font-bold py-3 px-4 rounded-xl hover:bg-white/5"
                  >
                    <Landmark className="h-5 w-5 text-green-400" /> Government Portal
                  </Link>
                  <Link
                    to="/agent/login"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 text-white font-bold py-3 px-4 rounded-xl hover:bg-white/5"
                  >
                    <UserCog className="h-5 w-5 text-[#F97316]" /> Agent / Admin Portal
                  </Link>
                </div>
                )}
                
                <div className="border-t border-white/5 pt-3 mt-2 space-y-2 px-4 pb-2">
                   {!isAuthenticated ? (
                     <>
                        <Button onClick={handleGoogleAuth} className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white font-bold h-12 rounded-xl">
                          Sign In with Google
                        </Button>
                     </>
                   ) : (
                     <>
                        <div className="flex items-center gap-3 mb-2 bg-white/5 p-3 rounded-xl border border-white/5">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user?.avatarUrl} />
                            <AvatarFallback className="bg-[#f97316] text-white font-black">{user?.fullName?.charAt(0) || 'C'}</AvatarFallback>
                          </Avatar>
                          <div className="overflow-hidden">
                            <p className="text-sm font-bold text-white truncate">{user?.fullName}</p>
                            <p className="text-xs text-[#94A3B8] truncate">{user?.email}</p>
                          </div>
                        </div>
                        {isOfficial ? (
                          <Link to={dashboardLink} onClick={() => setOpen(false)} className="flex items-center gap-3 text-white font-bold py-3 px-4 rounded-xl hover:bg-white/5">
                            <LayoutDashboard className="h-5 w-5 text-[#f97316]" /> Go to Dashboard
                          </Link>
                        ) : (
                          <>
                            <Link to="/tracking" onClick={() => setOpen(false)} className="flex items-center gap-3 text-white font-bold py-3 px-4 rounded-xl hover:bg-white/5">
                              <Activity className="h-5 w-5 text-[#f97316]" /> Application Tracking
                            </Link>
                            <Link to="/saved-schemes" onClick={() => setOpen(false)} className="flex items-center gap-3 text-white font-bold py-3 px-4 rounded-xl hover:bg-white/5">
                              <Bookmark className="h-5 w-5 text-blue-400" /> Saved Schemes
                            </Link>
                            <Link to="/applications" onClick={() => setOpen(false)} className="flex items-center gap-3 text-white font-bold py-3 px-4 rounded-xl hover:bg-white/5">
                              <FileText className="h-5 w-5 text-green-400" /> Applications History
                            </Link>
                          </>
                        )}
                        <button onClick={logout} className="w-full text-left flex items-center gap-3 text-red-400 font-bold py-3 px-4 rounded-xl hover:bg-red-500/10">
                          <LogOut className="h-5 w-5" /> Logout
                        </button>
                     </>
                   )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Agent Assistance Modal */}
      <AnimatePresence>
        {isAgentModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm"
              onClick={() => setIsAgentModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#0F172A] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/10"
            >
              {/* Header */}
              <div className="bg-[#f97316] pt-8 pb-10 px-8 flex flex-col items-center text-center relative">
                <button
                  onClick={() => setIsAgentModalOpen(false)}
                  className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center mb-4 backdrop-blur-md border border-white/20">
                  <Headphones className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight mb-2">Talk to an Advisor</h3>
                <p className="text-white/90 font-medium text-sm leading-snug px-4">
                  Get free guidance on scheme eligibility, documents, and applications.
                </p>
              </div>

              {/* Form */}
              <div className="p-8">
                <form onSubmit={handleAgentSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-[#CBD5E1] tracking-wider uppercase mb-2">Full Name *</label>
                    <input
                      required
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full bg-transparent border-2 border-white/10 rounded-xl h-13 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#f97316] transition-colors"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#CBD5E1] tracking-wider uppercase mb-2">Phone Number *</label>
                    <input
                      required
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-transparent border-2 border-white/10 rounded-xl h-13 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#f97316] transition-colors"
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#CBD5E1] tracking-wider uppercase mb-2">Email (Optional)</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-transparent border-2 border-white/10 rounded-xl h-13 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#f97316] transition-colors"
                      placeholder="optional@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#CBD5E1] tracking-wider uppercase mb-2">State / Region *</label>
                    <select
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full bg-[#0F172A] border-2 border-white/10 rounded-xl h-13 px-4 py-3 text-white focus:outline-none focus:border-[#f97316] transition-colors"
                    >
                      <option value="" disabled hidden>Select your state</option>
                      {indianStates.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white font-bold h-14 rounded-xl border-0 shadow-lg shadow-[#f97316]/20 transition-all flex items-center justify-center gap-2 text-base"
                    >
                      {isSubmitting ? "Connecting..." : "Request Callback"}
                      {!isSubmitting && <Send className="h-5 w-5" />}
                    </Button>
                    <p className="text-center text-xs text-[#CBD5E1]/50 mt-4">
                      Free service. Your data is secure and never shared.
                    </p>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
