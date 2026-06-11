import { Scheme } from "@/data/schemes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Bookmark, Eye, ArrowRight, Headphones, Send, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface SchemeCardProps {
  scheme: Scheme;
  onSave?: (id: string) => void;
  saved?: boolean;
  matchScore?: number;
  matchReason?: string;
}

const SchemeCard = ({ scheme, onSave, saved, matchScore, matchReason }: SchemeCardProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contact, setContact] = useState({ name: "", phone: "", email: "", state: "" });

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/agents/request', {
        schemeId: scheme.id,
        schemeName: scheme.name,
        userName: contact.name,
        userPhone: contact.phone,
        userEmail: contact.email,
        state: contact.state,
        type: 'callback'
      });
      toast({ title: "Request Sent!", description: "An agent will contact you shortly regarding this scheme." });
      setOpen(false);
      setContact({ name: "", phone: "", email: "", state: "" });
    } catch (error: any) {
      toast({ title: "Request Failed", description: error.message || "Could not send help request. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = matchScore
    ? matchScore >= 80 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    : matchScore >= 60 ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
    : "text-[#F97316] bg-[#F97316]/10 border-[#F97316]/20"
    : "";

  return (
    <Card className="bg-[#0F172A] border-white/10 hover:border-[#F97316]/40 transition-all duration-300 shadow-xl overflow-hidden flex flex-col h-full group relative">
      <CardHeader className="p-5 pb-0">
        <div className="flex justify-between items-start mb-3">
          <div className="flex flex-col gap-1.5">
            {matchScore !== undefined && (
              <Badge variant="outline" className={`w-fit text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${scoreColor}`}>
                {matchScore >= 80 ? 'Strong Match' : 'Match'} • {matchScore}%
              </Badge>
            )}
            {(scheme as any).source === 'government' && (
              <Badge variant="outline" className="w-fit bg-green-500/10 text-green-400 border-green-500/20 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1">
                <Shield className="h-3 w-3" /> Gov Verified
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full bg-[#F97316]/10 text-[#F97316] hover:bg-[#F97316] hover:text-white border border-[#F97316]/20 transition-all"
                  title="Agent Assistance"
                >
                  <Headphones className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-[#020617] border-white/10 text-white p-0 overflow-hidden rounded-3xl border shadow-2xl">
                <div className="bg-[#F97316] p-6 flex flex-col items-center text-center gap-2">
                  <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                    <Headphones className="h-8 w-8 text-white" />
                  </div>
                  <DialogTitle className="text-2xl font-black text-white tracking-tight uppercase">Agent Assistance</DialogTitle>
                  <p className="text-white/90 text-sm font-medium">Talk to an expert about "{scheme.name}"</p>
                </div>
                <div className="p-8">
                  <form onSubmit={handleConnect} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Full Name</Label>
                      <Input id="name" placeholder="John Doe" value={contact.name} onChange={e => setContact({...contact, name: e.target.value})} required className="bg-white/5 border-white/10 text-white rounded-xl h-12 focus:border-[#F97316]" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Phone Number</Label>
                      <Input id="phone" type="tel" placeholder="+91 XXXXX XXXXX" value={contact.phone} onChange={e => setContact({...contact, phone: e.target.value})} required className="bg-white/5 border-white/10 text-white rounded-xl h-12 focus:border-[#F97316]" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Your State</Label>
                      <Input id="state" placeholder="e.g., Maharashtra" value={contact.state} onChange={e => setContact({...contact, state: e.target.value})} required className="bg-white/5 border-white/10 text-white rounded-xl h-12 focus:border-[#F97316]" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Email (Optional)</Label>
                      <Input id="email" type="email" placeholder="john@example.com" value={contact.email} onChange={e => setContact({...contact, email: e.target.value})} className="bg-white/5 border-white/10 text-white rounded-xl h-12 focus:border-[#F97316]" />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full h-14 bg-[#F97316] hover:bg-[#EA580C] text-white font-black rounded-2xl mt-4 shadow-xl shadow-[#F97316]/20">
                      {loading ? "REQUESTING..." : "CONNECT WITH AGENT"}
                      {!loading && <Send className="h-4 w-4 ml-2" />}
                    </Button>
                  </form>
                </div>
              </DialogContent>
            </Dialog>

            {onSave && (
              <button
                onClick={() => onSave(scheme.id)}
                className={`p-1.5 rounded-full transition-colors ${saved ? "text-[#F97316] bg-[#F97316]/10" : "text-[#94A3B8] hover:text-white hover:bg-white/5"}`}
              >
                <Bookmark className="h-5 w-5" fill={saved ? "currentColor" : "none"} />
              </button>
            )}
          </div>
        </div>

        <h3 className="text-xl font-bold text-white leading-tight mb-2 group-hover:text-[#F97316] transition-colors line-clamp-2">
          {scheme.name}
        </h3>
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider line-clamp-1 mb-4">
          {scheme.ministry || 'Government of India'}
        </p>
      </CardHeader>

      <CardContent className="p-5 flex-grow flex flex-col gap-4">
        {matchReason && (
          <div className="bg-[#020617] rounded-xl p-3 border border-white/5">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#F97316] mb-1">Why Recommended</p>
            <p className="text-xs text-[#CBD5E1] font-medium leading-snug">{matchReason}</p>
          </div>
        )}
        
        <p className="text-sm text-[#94A3B8] line-clamp-3 leading-relaxed flex-grow">
          {scheme.description}
        </p>
        
        {scheme.benefits && (
          <div className="bg-white/5 border border-white/5 rounded-xl px-3 py-2">
            <p className="text-xs text-emerald-400 font-semibold line-clamp-2">✓ {scheme.benefits}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-auto pt-2">
          {(scheme.tags || []).slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] font-semibold bg-[#020617] border-white/10 text-[#94A3B8] px-2 py-0.5 rounded-md">
              {tag}
            </Badge>
          ))}
          {(scheme.tags?.length || 0) > 3 && (
            <Badge variant="outline" className="text-[10px] font-semibold bg-[#020617] border-white/10 text-[#94A3B8] px-2 py-0.5 rounded-md">
              +{(scheme.tags?.length || 0) - 3}
            </Badge>
          )}
        </div>
        
        {(scheme.applyLink || (scheme as any).officialLink) && (
          <a
            href={scheme.applyLink || (scheme as any).officialLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center w-fit gap-1.5 bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
          >
            <Shield className="h-3 w-3" /> Official Govt Portal
          </a>
        )}
        {/* Views and Saves */}
        <div className="flex items-center gap-4 text-[10px] font-black text-[#64748B] uppercase tracking-widest mt-auto pt-4 border-t border-white/5">
          <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-[#94A3B8]" />{(scheme.views / 1000).toFixed(1)}k Views</span>
          <span className="flex items-center gap-1.5"><Bookmark className="h-3.5 w-3.5 text-[#94A3B8]" />{(scheme.saves / 1000).toFixed(1)}k Saves</span>
        </div>
      </CardContent>

      <CardFooter className="p-4 border-t border-white/5 bg-[#020617] grid grid-cols-2 gap-3">
        <Link to={`/scheme/${scheme.id}`}>
          <Button variant="outline" className="w-full bg-transparent border-white/10 text-white hover:bg-white/5 font-bold text-xs h-12 rounded-xl transition-all">
            Details
          </Button>
        </Link>
        <Link to={`/apply/${scheme.id}`}>
          <Button className="w-full bg-[#F97316] text-white hover:bg-[#EA580C] font-bold text-xs h-12 rounded-xl shadow-lg shadow-[#F97316]/20">
            Apply Now <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default SchemeCard;
