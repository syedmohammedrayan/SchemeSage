import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="bg-primary text-primary-foreground py-12">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-6 w-6 text-accent" />
            <span className="font-heading font-bold text-lg">Scheme Sage</span>
          </div>
          <p className="text-primary-foreground/70 text-sm">
            Empowering citizens to discover and access government welfare schemes easily.
          </p>
        </div>
        <div>
          <h4 className="font-heading font-semibold mb-3">Quick Links</h4>
          <div className="space-y-2 text-sm text-primary-foreground/70">
            <Link to="/" className="block hover:text-primary-foreground transition-colors">Home</Link>
            <Link to="/login" className="block hover:text-primary-foreground transition-colors">Login</Link>
            <Link to="/register" className="block hover:text-primary-foreground transition-colors">Register</Link>
          </div>
        </div>
        <div>
          <h4 className="font-heading font-semibold mb-3">Contact</h4>
          <p className="text-sm text-primary-foreground/70">support@schemesage.in</p>
          <p className="text-sm text-primary-foreground/70 mt-1">1800-XXX-XXXX (Toll Free)</p>
        </div>
      </div>
      <div className="border-t border-primary-foreground/20 mt-8 pt-6 text-center text-sm text-primary-foreground/50">
        © 2026 Scheme Sage. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
