import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="bg-[#020617] border-t border-white/5 py-16">
    <div className="container mx-auto px-6 lg:px-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <div className="col-span-1 md:col-span-1">
          <Link to="/" className="flex items-center gap-2 mb-6 group">
            <div className="bg-gradient-to-br from-[#8B5CF6] to-[#A855F7] p-1.5 rounded-xl">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="font-sans font-black text-xl text-white tracking-tight">
              SchemeSage
            </span>
          </Link>
          <p className="text-[#CBD5E1] text-sm leading-relaxed">
            Empowering citizens to discover, apply for, and track government welfare schemes seamlessly. A modern bridge between policy and people.
          </p>
        </div>
        
        <div>
          <h4 className="font-bold text-white mb-6 uppercase tracking-wider text-sm">Navigation</h4>
          <div className="space-y-4 text-sm text-[#CBD5E1]">
            <Link to="/" className="block hover:text-white transition-colors">Home</Link>
            <Link to="/discover" className="block hover:text-white transition-colors">Find Schemes</Link>
            <Link to="/discover" className="block hover:text-white transition-colors">Eligibility Checker</Link>
            <Link to="/dashboard" className="block hover:text-white transition-colors">Track Application</Link>
          </div>
        </div>

        <div>
          <h4 className="font-bold text-white mb-6 uppercase tracking-wider text-sm">Legal & Support</h4>
          <div className="space-y-4 text-sm text-[#CBD5E1]">
            <a href="#" className="block hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="block hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="block hover:text-white transition-colors">Help Center / Support</a>
            <a href="#" className="block hover:text-white transition-colors">Contact Us</a>
          </div>
        </div>

        <div>
          <h4 className="font-bold text-white mb-6 uppercase tracking-wider text-sm">Government Resources</h4>
          <div className="space-y-4 text-sm text-[#CBD5E1]">
            <a href="#" className="block hover:text-white transition-colors">National Portal of India</a>
            <a href="#" className="block hover:text-white transition-colors">Digital India</a>
            <a href="#" className="block hover:text-white transition-colors">MyGov</a>
            <a href="#" className="block hover:text-white transition-colors">Ministry of IT</a>
          </div>
        </div>
      </div>
      
      <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-[#CBD5E1]/60">
          © {new Date().getFullYear()} SchemeSage. All rights reserved.
        </p>
        <p className="text-xs text-[#CBD5E1]/40 uppercase tracking-widest font-bold">
          Not an official government website
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
