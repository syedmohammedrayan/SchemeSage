import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Shield, User, Lock } from "lucide-react";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isLanding = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navClasses = `sticky top-0 z-50 transition-all duration-300 ${
    scrolled 
      ? "bg-slate-900/95 backdrop-blur-md shadow-lg h-16 border-b border-white/5" 
      : "bg-slate-900 h-20"
  }`;

  return (
    <nav className={navClasses}>
      <div className="container mx-auto flex items-center justify-between h-full px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-accent/10 p-1.5 rounded-xl group-hover:bg-accent/20 transition-colors">
            <Shield className="h-7 w-7 text-accent" />
          </div>
          <span className="font-heading font-black text-xl text-white tracking-tight uppercase">
            Scheme Sage
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {isLanding && (
            <>
              <a href="#how-it-works" className="text-slate-300 hover:text-white text-xs font-black uppercase tracking-widest transition-all hover:tracking-[0.15em]">How it Works</a>
              <a href="#schemes" className="text-slate-300 hover:text-white text-xs font-black uppercase tracking-widest transition-all hover:tracking-[0.15em]">Schemes</a>
            </>
          )}
          
          <div className="h-6 w-[1px] bg-white/10 mx-2" />

          <Link to="/login">
            <Button 
              className="bg-white/5 hover:bg-white text-slate-200 hover:text-slate-900 border border-white/10 hover:border-white font-black text-[10px] px-6 h-11 rounded-xl transition-all uppercase tracking-widest flex items-center gap-2 group/btn shadow-xl shadow-black/20"
            >
              <div className="bg-accent/20 group-hover/btn:bg-slate-900/10 p-1 rounded-md transition-colors">
                <User className="h-3.5 w-3.5 text-accent group-hover/btn:text-slate-900" />
              </div>
              Professional Login
              <Lock className="h-3 w-3 opacity-30 group-hover/btn:opacity-100 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button 
          onClick={() => setOpen(!open)} 
          className="md:hidden bg-white/5 p-2 rounded-xl border border-white/10 text-white"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden px-4 pb-8 pt-4 space-y-4 bg-slate-900 border-b border-white/10 animate-in slide-in-from-top-4 duration-300">
          {isLanding && (
            <>
              <a href="#how-it-works" onClick={() => setOpen(false)} className="block py-3 text-slate-300 font-bold text-sm tracking-wide border-b border-white/5">How it Works</a>
              <a href="#schemes" onClick={() => setOpen(false)} className="block py-3 text-slate-300 font-bold text-sm tracking-wide border-b border-white/5">Schemes</a>
            </>
          )}
          <Link to="/login" onClick={() => setOpen(false)}>
            <Button className="w-full bg-accent text-white font-black h-12 rounded-xl shadow-lg shadow-accent/20 uppercase tracking-widest text-xs flex items-center justify-center gap-3">
              <User className="h-4 w-4" /> Professional Login
            </Button>
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
