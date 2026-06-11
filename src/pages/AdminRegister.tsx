import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, UserPlus, Briefcase, Info } from "lucide-react";
import { indianStates } from "@/data/schemes";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { api } from "@/lib/api";

const AdminRegister = () => {
  const [form, setForm] = useState({ 
    name: "", mobile: "", email: "", password: "", 
    state: "", district: "", expertise: "", 
    aadharNumber: "", panNumber: "", meeSevaId: "", address: "" 
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register } = useAuth();
  
  const [activeStates, setActiveStates] = useState<string[]>([]);
  useEffect(() => {
    api.get(`/auth/active-states?t=${Date.now()}`).then((res: any) => {
      if (res.states) setActiveStates(res.states);
    }).catch(console.error);
  }, []);

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const isStateSupported = !form.state || 
    activeStates.some(s => s.toLowerCase() === 'central' || s.toLowerCase() === 'all' || s.toLowerCase() === 'unassigned' || s.toLowerCase() === '') ||
    activeStates.some(s => s.toLowerCase() === form.state.toLowerCase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({
        fullName: form.name,
        email: form.email,
        mobile: form.mobile,
        password: form.password,
        state: form.state,
        district: form.district,
        role: 'admin', // Force Admin role
        aadharNumber: form.aadharNumber,
        panNumber: form.panNumber,
        meeSevaId: form.meeSevaId,
        address: form.address,
        expertise: form.expertise,
      });
      toast({ 
        title: "Registration Received", 
        description: "Your official license request is now pending government verification." 
      });
      navigate("/agent/login");
    } catch (err: any) {
      toast({ 
        title: "Registration Failed", 
        description: err.message || "Could not complete registration. Please check your network or try a different email.",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4 py-12 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 -left-20 w-80 h-80 bg-accent/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[120px]" />
      
      <Card className="w-full max-w-lg shadow-2xl border-white/10 bg-slate-900/50 backdrop-blur-xl text-white">
        <CardHeader className="text-center pb-2">
          <Link to="/" className="inline-flex items-center gap-2 justify-center mb-4 transition-transform hover:scale-105">
            <Shield className="h-10 w-10 text-accent" />
            <span className="font-heading font-bold text-3xl tracking-tight">Scheme Sage</span>
          </Link>
          <div className="flex items-center justify-center gap-2 text-accent mb-1 uppercase tracking-widest text-[10px] font-bold">
            <Briefcase className="h-3 w-3" /> Professional Onboarding
          </div>
          <h1 className="font-heading font-bold text-2xl">Agent Registration</h1>
          <p className="text-sm text-slate-400">Apply to become a verified government assistance agent.</p>
        </CardHeader>
        <CardContent>
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 mb-6 flex gap-3 items-start">
             <Info className="h-5 w-5 text-accent shrink-0 mt-0.5" />
             <p className="text-xs text-slate-300 leading-relaxed">
               All agent registrations are subject to manual verification by government officials. You will be able to log in once your license is approved.
             </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-slate-300">Full Name</Label>
              <Input 
                value={form.name} 
                onChange={(e) => update("name", e.target.value)} 
                placeholder="Name as per Government ID" 
                required 
                className="mt-1 bg-slate-800/50 border-white/10 focus:border-accent text-white" 
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Contact Number</Label>
                <Input 
                  value={form.mobile} 
                  onChange={(e) => update("mobile", e.target.value)} 
                  placeholder="+91" 
                  required 
                  className="mt-1 bg-slate-800/50 border-white/10" 
                />
              </div>
              <div>
                <Label className="text-slate-300">Official Email</Label>
                <Input 
                  type="email" 
                  value={form.email} 
                  onChange={(e) => update("email", e.target.value)} 
                  placeholder="name@portal.com" 
                  required 
                  className="mt-1 bg-slate-800/50 border-white/10" 
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Password</Label>
              <Input 
                type="password" 
                value={form.password} 
                onChange={(e) => update("password", e.target.value)} 
                placeholder="Secure Password" 
                required 
                className="mt-1 bg-slate-800/50 border-white/10" 
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Aadhar Number</Label>
                <Input 
                  value={form.aadharNumber} 
                  onChange={(e) => update("aadharNumber", e.target.value)} 
                  placeholder="12 Digit No." 
                  maxLength={12}
                  required 
                  className="mt-1 bg-slate-800/50 border-white/10" 
                />
              </div>
              <div>
                <Label className="text-slate-300">PAN Card No.</Label>
                <Input 
                  value={form.panNumber} 
                  onChange={(e) => update("panNumber", e.target.value)} 
                  placeholder="ABCDE1234F" 
                  maxLength={10}
                  required 
                  className="mt-1 bg-slate-800/50 border-white/10 uppercase" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">MeeSeva / Agent ID</Label>
                <Input 
                  value={form.meeSevaId} 
                  onChange={(e) => update("meeSevaId", e.target.value)} 
                  placeholder="Official ID Serial" 
                  required 
                  className="mt-1 bg-slate-800/50 border-white/10" 
                />
              </div>
              <div>
                <Label className="text-slate-300">Area of Expertise</Label>
                <Input 
                  value={form.expertise} 
                  onChange={(e) => update("expertise", e.target.value)} 
                  placeholder="Health, Agri, etc." 
                  className="mt-1 bg-slate-800/50 border-white/10" 
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Full Official/Home Address</Label>
              <Input 
                value={form.address} 
                onChange={(e) => update("address", e.target.value)} 
                placeholder="House No, Street, Landmark, Pincode" 
                required 
                className="mt-1 bg-slate-800/50 border-white/10" 
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Working State</Label>
                <Select value={form.state} onValueChange={(v) => update("state", v)}>
                  <SelectTrigger className="mt-1 bg-slate-800/50 border-white/10"><SelectValue placeholder="Jurisdiction" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                    {indianStates.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                {!isStateSupported && (
                  <p className="text-red-400 text-[11px] mt-1.5 font-medium leading-tight">
                    This platform is right now not available in your state.
                  </p>
                )}
              </div>
              <div>
                <Label className="text-slate-300">District</Label>
                <Input 
                  value={form.district} 
                  onChange={(e) => update("district", e.target.value)} 
                  placeholder="District Name" 
                  required
                  className="mt-1 bg-slate-800/50 border-white/10" 
                />
              </div>
            </div>

            <Button type="submit" variant="accent" className="w-full h-12 text-lg shadow-lg shadow-accent/20" disabled={loading || !isStateSupported}>
              {loading ? (
                <span className="flex items-center gap-2">
                   <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                   Submitting Application...
                </span>
              ) : "Submit Registration"}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            Need help? Contact system support for onboarding issues.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRegister;
