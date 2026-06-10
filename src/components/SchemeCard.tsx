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
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });

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
        type: 'callback'
      });
      toast({ title: "Request Sent!", description: "An agent will contact you shortly regarding this scheme." });
      setOpen(false);
      setContact({ name: "", phone: "", email: "" });
    } catch (error: any) {
      toast({ title: "Request Failed", description: error.message || "Could not send help request. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = matchScore
    ? matchScore >= 80 ? "bg-success/10 text-success border-success/30"
    : matchScore >= 60 ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
    : "bg-orange-500/10 text-orange-600 border-orange-500/30"
    : "";

  return (
    <Card className="shadow-card hover:shadow-card-hover transition-all duration-300 group border-border/60 relative overflow-hidden">
      <CardHeader className="pb-3 pr-16">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-heading font-black text-lg text-foreground group-hover:text-accent transition-colors leading-tight">
              {scheme.name}
            </h3>
            {matchScore !== undefined && (
              <Badge className={`shrink-0 text-[10px] font-black border rounded px-1.5 py-0.5 tracking-tighter ${scoreColor}`}>
                {matchScore}% Match
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{scheme.ministry}</p>
            {(scheme as any).source === 'government' && (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[9px] font-black uppercase tracking-widest px-1.5 py-0">
                <Shield className="h-2.5 w-2.5 mr-1" /> Gov Verified
              </Badge>
            )}
          </div>
        </div>
        
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-xl bg-accent/10 text-accent hover:bg-accent hover:text-white border border-accent/20 transition-all shadow-lg shadow-accent/10 group/btn"
              >
                <Headphones className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-white p-0 overflow-hidden rounded-3xl border shadow-2xl">
              <div className="bg-accent p-6 flex flex-col items-center text-center gap-2">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                  <Headphones className="h-8 w-8 text-white" />
                </div>
                <DialogTitle className="text-2xl font-black text-white tracking-tight uppercase">Agent Assistance</DialogTitle>
                <p className="text-white/80 text-sm font-medium">Talk to an expert about "{scheme.name}"</p>
              </div>
              <div className="p-8">
                <form onSubmit={handleConnect} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Full Name</Label>
                    <Input id="name" placeholder="John Doe" value={contact.name} onChange={e => setContact({...contact, name: e.target.value})} required className="bg-white/5 border-white/10 rounded-xl h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Phone Number</Label>
                    <Input id="phone" type="tel" placeholder="+91 XXXXX XXXXX" value={contact.phone} onChange={e => setContact({...contact, phone: e.target.value})} required className="bg-white/5 border-white/10 rounded-xl h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Email (Optional)</Label>
                    <Input id="email" type="email" placeholder="john@example.com" value={contact.email} onChange={e => setContact({...contact, email: e.target.value})} className="bg-white/5 border-white/10 rounded-xl h-12" />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-14 bg-accent hover:bg-accent/90 text-white font-black rounded-2xl mt-4 shadow-xl shadow-accent/20">
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
              className={`p-1.5 rounded-lg transition-colors ${saved ? "text-accent bg-accent/10" : "text-muted-foreground hover:text-accent hover:bg-accent/5"}`}
            >
              <Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} />
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {matchReason && (
          <p className="text-xs text-accent font-medium mb-2 bg-accent/5 rounded-md px-2 py-1">{matchReason}</p>
        )}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{scheme.description}</p>
        <div className="bg-success/10 text-success rounded-lg px-3 py-2 text-sm font-medium mb-3">
          {scheme.benefits}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(scheme.tags || []).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs font-medium">
              {tag}
            </Badge>
          ))}
        </div>
        
        {/* Official Website Trust Badge Link */}
        {(scheme.applyLink || (scheme as any).officialLink) && (
          <a
            href={scheme.applyLink || (scheme as any).officialLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-100 hover:bg-blue-100 transition-colors mt-4"
          >
            <Shield className="h-3 w-3" /> Official Govt Portal
          </a>
        )}
      </CardContent>

      <CardFooter className="pt-2 flex items-center justify-between border-t border-white/10 bg-slate-100/80 px-6 py-4">
        <div className="flex items-center gap-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">
          <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-accent" />{(scheme.views / 1000).toFixed(1)}k Views</span>
          <span className="flex items-center gap-1.5"><Bookmark className="h-3.5 w-3.5 text-slate-500" />{(scheme.saves / 1000).toFixed(1)}k Saves</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to={`/scheme/${scheme.id}`}>
            <Button variant="outline" size="sm" className="border-slate-300 text-slate-700 hover:bg-slate-200 font-black text-[10px] px-6 h-10 rounded-xl transition-all uppercase tracking-widest shadow-sm">
              Details
            </Button>
          </Link>
          <Link to={`/apply/${scheme.id}`}>
            <Button size="sm" className="bg-accent text-white hover:bg-accent/90 font-black text-[10px] px-6 h-10 rounded-xl shadow-lg shadow-accent/20 uppercase tracking-[0.15em]">
              Apply Now <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>

  );
};

export default SchemeCard;
