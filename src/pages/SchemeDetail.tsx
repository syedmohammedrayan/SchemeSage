import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, ExternalLink, FileText, CheckCircle, Calendar, 
  Shield, Sparkles, Loader2, Share2, Printer, Phone, 
  HelpCircle, Landmark, Bookmark, Headphones, Send 
} from "lucide-react";
import { useScheme, useSaveScheme, useCheckSaved } from "@/hooks/useSchemes";
import { useAISummary, useEligibilityCheck } from "@/hooks/useAI";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";


const SchemeDetail = () => {
  const { id } = useParams();
  const { data: scheme, isLoading } = useScheme(id);
  const { user } = useAuth();
  const { data: isSaved } = useCheckSaved(id);
  const saveScheme = useSaveScheme();
  const { data: aiSummary, isLoading: summaryLoading } = useAISummary(id);
  const eligibilityCheck = useEligibilityCheck();
  const [eligResult, setEligResult] = useState<any>(null);
  const { toast } = useToast();
  
  // Connect to Agent state
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contact, setContact] = useState({ 
    name: user?.fullName || "", 
    phone: user?.mobile || "", 
    email: user?.email || "" 
  });

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/agents/request', {
        schemeId: scheme?.id,
        schemeName: scheme?.name,
        userName: contact.name,
        userPhone: contact.phone,
        userEmail: contact.email,
        type: 'callback'
      });
      toast({ title: "Request Sent!", description: "An agent will contact you shortly regarding this scheme." });
      setOpen(false);
      setContact({ name: "", phone: "", email: "" });
    } catch (error: any) {
      toast({ title: "Request Failed", description: error.message || "Could not send help request.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!id) return;
    saveScheme.mutate(id, {
      onSuccess: (data) => toast({ title: data.saved ? "Scheme saved!" : "Removed from saved" }),
    });
  };

  const handleEligCheck = () => {
    if (!id) return;
    eligibilityCheck.mutate({ schemeId: id }, {
      onSuccess: (data) => setEligResult(data),
      onError: (error: any) => {
        console.error('[Eligibility Check Error]', error);
        toast({ 
          title: "Eligibility Check Failed", 
          description: error.message || "We encountered an error while verifying your profile. Please try again soon.", 
          variant: "destructive" 
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-pulse text-muted-foreground">Loading scheme details...</div>
      </div>
    );
  }

  if (!scheme) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading font-bold text-2xl text-foreground mb-2">Scheme Not Found</h1>
          <Link to="/"><Button variant="outline">Go Home</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <header className="border-b border-white/10 bg-slate-900/80 flex items-center h-20 px-6 sticky top-0 z-50 backdrop-blur-xl">
        <div className="container mx-auto flex items-center h-full gap-6">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-white/10 h-10 w-10">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-accent" />
            <span className="font-heading font-black text-xl tracking-tight uppercase">Scheme Vault</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex flex-wrap gap-2 mb-6">
          {(scheme.tags || []).map((tag: string) => (
            <Badge key={tag} className="bg-accent/10 text-accent border-accent/20 font-black tracking-widest uppercase text-[10px] px-3 py-1">{tag}</Badge>
          ))}
        </div>

        <div className="flex items-start justify-between gap-6 mb-8">
          <div>
            <h1 className="font-heading font-black text-4xl text-white tracking-tight leading-tight mb-2">{scheme.name}</h1>
            <div className="flex items-center gap-2 text-slate-400">
               <div className="bg-white/5 p-1 rounded"><Landmark className="h-4 w-4" /></div>
               <span className="text-xs font-black uppercase tracking-widest">{scheme.ministry || 'Ministry of Welfare'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-2xl"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: scheme.name, text: scheme.description, url: window.location.href });
                } else {
                  toast({ title: "Link Copied", description: "Share this scheme with others!" });
                }
              }}
            >
              <Share2 className="h-5 w-5" />
            </Button>
            <Button
               variant="outline"
               size="icon"
               className="h-12 w-12 border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-2xl"
               onClick={() => window.print()}
            >
               <Printer className="h-5 w-5" />
            </Button>
            {user && (
              <button
                onClick={handleSave}
                className={`h-12 w-12 flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors ${isSaved ? "text-accent" : "text-slate-400"}`}
              >
                <Bookmark className="h-5 w-5" fill={isSaved ? "currentColor" : "none"} />
              </button>
            )}
          </div>
        </div>
        <p className="text-muted-foreground mb-6 flex items-center gap-2">
          <Landmark className="h-4 w-4 text-accent" /> {scheme.ministry}
        </p>

        {/* AI Summary */}
        {aiSummary && aiSummary !== scheme.description && (
          <Card className="shadow-card mb-6 border-accent/20 bg-accent/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold text-accent">AI Summary</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{aiSummary}</p>
            </CardContent>
          </Card>
        )}
        {summaryLoading && (
          <Card className="shadow-card mb-6 border-accent/20 bg-accent/5">
            <CardContent className="p-4 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating AI summary...
            </CardContent>
          </Card>
        )}

        <Card className="shadow-card mb-6">
          <CardContent className="p-6">
            <h2 className="font-heading font-bold text-lg mb-3">About this Scheme</h2>
            <p className="text-foreground leading-relaxed">{scheme.description}</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="shadow-card">
            <CardContent className="p-6">
              <h3 className="font-heading font-bold flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-success" /> Benefits
              </h3>
              <div className="bg-success/10 text-success rounded-lg px-4 py-3 font-semibold">
                {scheme.benefits}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6">
              <h3 className="font-heading font-bold flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-info" /> Required Documents
              </h3>
              <ul className="space-y-2">
                {(scheme.documents || []).map((doc: string) => (
                  <li key={doc} className="flex items-center gap-2 text-sm text-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                    {doc}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {scheme.deadline && (
          <Card className="shadow-card mb-6">
            <CardContent className="p-6 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-accent" />
              <div>
                <p className="font-medium text-foreground">Application Deadline</p>
                <p className="text-sm text-muted-foreground">{scheme.deadline}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Eligibility Check */}
        <Card className="shadow-card mb-6">
          <CardContent className="p-6">
            <h3 className="font-heading font-bold flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-accent" /> AI Eligibility Check
            </h3>
            {!eligResult ? (
              <div>
                <p className="text-sm text-muted-foreground mb-3">Let AI check if you're eligible based on your profile</p>
                <Button variant="accent" onClick={handleEligCheck} disabled={eligibilityCheck.isPending}>
                  {eligibilityCheck.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Checking...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-1" /> Check My Eligibility</>
                  )}
                </Button>
              </div>
            ) : (
              <div className={`rounded-lg px-4 py-3 ${eligResult.eligible
                ? "bg-success/10 border border-success/30"
                : "bg-destructive/10 border border-destructive/30"
                }`}>
                <p className={`font-semibold mb-1 ${eligResult.eligible ? "text-success" : "text-destructive"}`}>
                  {eligResult.eligible ? "You are likely eligible!" : "You may not be eligible"}
                  <Badge className="ml-2 text-xs" variant="secondary">{eligResult.confidence} confidence</Badge>
                </p>
                <p className="text-sm text-foreground">{eligResult.explanation}</p>
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setEligResult(null)}>Check again</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 mt-8 pb-12">
          <Link to={`/apply/${scheme.id}`} className="w-full">
            <Button variant="accent" size="lg" className="w-full h-16 text-xl shadow-lg shadow-accent/20 font-black uppercase tracking-widest rounded-2xl">
              Apply Now Securely 
            </Button>
          </Link>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full h-16 border-white/10 bg-slate-900 text-white hover:bg-slate-800 font-bold uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3"
              >
                <Headphones className="h-5 w-5 text-accent" />
                Connect to Agent for Help
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-white p-0 overflow-hidden rounded-3xl border shadow-2xl">
              <div className="bg-accent p-6 flex flex-col items-center text-center gap-2">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                  <Headphones className="h-8 w-8 text-white" />
                </div>
                <DialogTitle className="text-2xl font-black text-white tracking-tight uppercase">Expert Assistance</DialogTitle>
                <p className="text-white/80 text-sm font-medium">Need help with "{scheme.name}"?</p>
              </div>
              <div className="p-8">
                <form onSubmit={handleConnect} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="detail-name" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Full Name</Label>
                    <Input id="detail-name" placeholder="John Doe" value={contact.name} onChange={e => setContact({...contact, name: e.target.value})} required className="bg-white/5 border-white/10 rounded-xl h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="detail-phone" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Phone Number</Label>
                    <Input id="detail-phone" type="tel" placeholder="+91 XXXXX XXXXX" value={contact.phone} onChange={e => setContact({...contact, phone: e.target.value})} required className="bg-white/5 border-white/10 rounded-xl h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="detail-email" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Email (Optional)</Label>
                    <Input id="detail-email" type="email" placeholder="john@example.com" value={contact.email} onChange={e => setContact({...contact, email: e.target.value})} className="bg-white/5 border-white/10 rounded-xl h-12" />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-14 bg-accent hover:bg-accent/90 text-white font-black rounded-2xl mt-4 shadow-xl shadow-accent/20">
                    {loading ? "SENDING REQUEST..." : "SUBMIT HELP REQUEST"}
                    {!loading && <Send className="h-4 w-4 ml-2" />}
                  </Button>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default SchemeDetail;
