import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Shield, Eye, EyeOff, Landmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function GovernmentLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password, "government");
      toast({ title: "Authentication Successful", description: `Welcome, ${user.fullName}` });
      navigate("/government/dashboard");
    } catch (err: any) {
      toast({ title: "Access Denied", description: err.message || "Invalid credentials", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900/20 via-[#020617] to-[#020617] pointer-events-none" />
      
      <Card className="w-full max-w-md shadow-2xl border-white/10 bg-[#0F172A] relative z-10">
        <CardHeader className="text-center pb-6 border-b border-white/10">
          <Link to="/" className="inline-flex items-center gap-2 justify-center mb-6">
            <Shield className="h-8 w-8 text-[#f97316]" />
            <span className="font-heading font-black text-2xl text-white">SchemeSage</span>
          </Link>
          <div className="h-12 w-12 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-500/20">
            <Landmark className="h-6 w-6 text-green-400" />
          </div>
          <h1 className="font-heading font-black text-2xl text-white">Government Portal</h1>
          <p className="text-sm text-[#94A3B8] mt-2">Restricted access for authorized officials only</p>
        </CardHeader>
        <CardContent className="pt-8">
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#94A3B8] text-xs font-bold uppercase tracking-wider">Official Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="official@gov.in"
                required
                className="bg-[#020617] border-white/10 text-white focus:border-green-500/50 h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#94A3B8] text-xs font-bold uppercase tracking-wider">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-[#020617] border-white/10 text-white focus:border-green-500/50 h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 text-sm shadow-lg shadow-green-900/20" disabled={loading}>
              {loading ? "Authenticating..." : "Official Login"}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <Link to="/" className="text-xs font-bold text-[#64748B] hover:text-white transition-colors">
              ← Return to Public Portal
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
