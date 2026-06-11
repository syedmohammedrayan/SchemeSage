import VoiceInput from "../components/VoiceInput";
import SchemeCard from "../components/SchemeCard";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { categories, occupations, indianStates } from "@/data/schemes";
import { Search, User, FileText, Bell, Bookmark, BarChart3, LogOut, Shield, Upload, Trash2, CheckCircle, Phone, MapPin, Send, Star, Edit } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSchemes, useSavedSchemes, useSaveScheme } from "@/hooks/useSchemes";
import { useApplications } from "@/hooks/useApplications";
import { useDocuments, useDeleteDocument } from "@/hooks/useDocuments";
import { useAIRecommendations } from "@/hooks/useAI";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const CitizenDashboard = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Filters
  const [profile, setProfile] = useState({ age: "", gender: "", occupation: "", income: "", state: "", category: "", guestName: "", guestPhone: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [agentDialog, setAgentDialog] = useState(false);
  const [agentMessage, setAgentMessage] = useState("");

  useEffect(() => {
    const state = user?.state || profile.state;
    if (state) {
      api.get<any[]>(`/agents?location=${state}`)
        .then(setAgents)
        .catch(console.error);
    }
  }, [user?.state, profile.state]);

  const handleAgentRequest = async () => {
    if (!selectedAgent) return;
    try {
      // For guests, we use the provided contact info from the modal fields if we add them
      // For now, let's assume we add them to the modal
      await api.post("/agents/request", {
        agentId: selectedAgent.id,
        userName: profile.guestName || user?.fullName || "Guest User",
        userPhone: profile.guestPhone || user?.mobile || "",
        message: agentMessage || "I need help finding or applying for schemes."
      });
      toast({ title: "Request Sent!", description: `${selectedAgent.fullName} will contact you shortly via call or WhatsApp.` });
      setAgentDialog(false);
      setAgentMessage("");
      setSelectedAgent(null);
    } catch (e) {
      toast({ title: "Failed to request agent", variant: "destructive" });
    }
  };
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en-IN");

  // Profile edit — FIX: was declared but never rendered or saved
  const [editProfile, setEditProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<any>({
    fullName: user?.fullName || '',
    mobile: user?.mobile || '',
    address: user?.address || '',
    state: user?.state || '',
    district: user?.district || '',
  });

  // Sync profileForm when user data loads
  useEffect(() => {
    if (user) {
      setProfileForm({
        fullName: user.fullName || '',
        mobile: user.mobile || '',
        address: user.address || '',
        state: user.state || '',
        district: user.district || '',
      });
    }
  }, [user?.id]);

  const handleSaveProfile = async () => {
    if (!profileForm.fullName) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    setSavingProfile(true);
    try {
      const data = await api.patch<{ user: any }>('/auth/profile', profileForm);
      // refreshUser is available from useAuth — sync context
      await refreshUser();
      toast({ title: '✅ Profile updated successfully!' });
      setEditProfile(false);
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  // Queries
  const { data: schemes = [], isLoading: schemesLoading } = useSchemes(
    searchQuery ? { search: searchQuery } : undefined
  );
  const { data: savedSchemesList = [] } = useSavedSchemes();
  const savedIds = savedSchemesList.map((s: any) => s.id);
  const saveScheme = useSaveScheme();
  const { data: applications = [], isLoading: appsLoading } = useApplications();
  const { data: documents = [], isLoading: docsLoading } = useDocuments();
  const deleteDoc = useDeleteDocument();
  const { data: recommendations, isLoading: recLoading, refetch: fetchRecs } = useAIRecommendations(showRecommendations, selectedLang, profile);

  const fileInputRef = useRef<Record<string, HTMLInputElement | null>>({});

  // Text-to-speech — speaks in the detected/selected language
  const speak = (text: string, lang: string) => {
    speechSynthesis.cancel(); // stop any ongoing speech first
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    speechSynthesis.speak(utterance);
  };

  // Called by VoiceInput when speech is transcribed
  const handleVoice = (text: string, lang: string, extractedProfile?: any) => {
    setSearchQuery(text);
    setSelectedLang(lang);
    if (extractedProfile) {
       setProfile(prev => ({
         ...prev,
         age: extractedProfile.age || prev.age,
         state: extractedProfile.state || prev.state,
         occupation: extractedProfile.occupation || prev.occupation,
         income: extractedProfile.income || prev.income
       }));
    }
    setShowRecommendations(true);
    fetchRecs();
  };

  // Speak AI response when recommendations arrive
  useEffect(() => {
    if (recommendations && recommendations.length > 0) {
      const top = recommendations[0];
      const message = `I found ${recommendations.length} schemes. Top recommendation is ${top.scheme.name}`;
      speak(message, selectedLang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendations]);

  const toggleSave = (id: string) => {
    saveScheme.mutate(id, {
      onSuccess: (data) => {
        toast({ title: data.saved ? "Scheme saved!" : "Scheme removed from saved" });
      },
    });
  };

  const findSchemes = () => {
    setShowRecommendations(true);
    fetchRecs();
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Profile Edit Modal */}
      <Dialog open={editProfile} onOpenChange={setEditProfile}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <User className="h-5 w-5 text-accent" /> Edit Profile
            </DialogTitle>
            <DialogDescription>Update your personal information. Changes are saved to your account.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="pf-name">Full Name *</Label>
              <Input id="pf-name" value={profileForm?.fullName || ''} onChange={e => setProfileForm((p: any) => ({...p, fullName: e.target.value}))} placeholder="Your full name" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pf-mobile">Mobile Number</Label>
              <Input id="pf-mobile" value={profileForm?.mobile || ''} onChange={e => setProfileForm((p: any) => ({...p, mobile: e.target.value}))} placeholder="10-digit mobile number" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pf-state">State</Label>
              <Select value={profileForm?.state || ''} onValueChange={v => setProfileForm((p: any) => ({...p, state: v}))}>
                <SelectTrigger id="pf-state"><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {indianStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pf-district">District</Label>
              <Input id="pf-district" value={profileForm?.district || ''} onChange={e => setProfileForm((p: any) => ({...p, district: e.target.value}))} placeholder="Your district" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pf-address">Address</Label>
              <Textarea id="pf-address" value={profileForm?.address || ''} onChange={e => setProfileForm((p: any) => ({...p, address: e.target.value}))} placeholder="Full address" rows={2} />
            </div>
          </div>
          <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full">
            {savingProfile ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Top bar */}
      <header className="bg-slate-900 border-b border-white/10 sticky top-0 z-40 text-white shadow-xl">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-accent" />
            <span className="font-heading font-black text-xl tracking-tight uppercase">Scheme Sage</span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-slate-300 hidden sm:inline">{user?.fullName}</span>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 font-bold" onClick={handleLogout}>
                   <LogOut className="h-4 w-4 mr-2" /> Logout
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button className="bg-accent hover:bg-accent/90 text-white font-black uppercase tracking-widest text-[10px] px-6 h-10 rounded-xl shadow-lg shadow-accent/20">
                   Agent Login 
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Badge variant="outline" className="bg-accent/5 text-accent border-accent/20 px-3 py-1 uppercase tracking-[0.2em] text-[10px] font-black">
            Global Discovery Engine
          </Badge>
        </div>
        <h1 className="font-heading font-black text-3xl text-foreground mb-6 tracking-tight uppercase">Citizen <span className="text-accent">Portal</span></h1>

        <Tabs defaultValue="finder" className="space-y-6">
          <TabsList className="bg-card border w-full justify-start overflow-x-auto">
            <TabsTrigger value="finder" className="gap-1.5"><Search className="h-4 w-4" /> Scheme Finder</TabsTrigger>
            <TabsTrigger value="applications" className="gap-1.5"><FileText className="h-4 w-4" /> My Applications</TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5"><Upload className="h-4 w-4" /> My Documents</TabsTrigger>
          </TabsList>

          {/* Scheme Finder */}
          <TabsContent value="finder" className="space-y-6">
            {/* Voice Input — select language & speak to auto-search */}
            <VoiceInput onResult={handleVoice} />

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Find Eligible Schemes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label>Age</Label>
                    <Input type="number" placeholder="Your age" value={profile.age} onChange={(e) => setProfile({ ...profile, age: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Select value={profile.gender} onValueChange={(v) => setProfile({ ...profile, gender: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Occupation</Label>
                    <Select value={profile.occupation} onValueChange={(v) => setProfile({ ...profile, occupation: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {occupations.map((o) => <SelectItem key={o} value={o.toLowerCase()}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Annual Income (₹)</Label>
                    <Input type="number" placeholder="e.g. 200000" value={profile.income} onChange={(e) => setProfile({ ...profile, income: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Select value={profile.state} onValueChange={(v) => setProfile({ ...profile, state: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {indianStates.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={profile.category} onValueChange={(v) => setProfile({ ...profile, category: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button variant="accent" onClick={findSchemes} size="lg" disabled={recLoading}>
                  <Search className="h-4 w-4" /> {recLoading ? "Finding schemes..." : "Find My Schemes"}
                </Button>
              </CardContent>
            </Card>

            {/* Text search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search schemes by name or tag..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>

            {showRecommendations && recommendations && recommendations.length > 0 && (
              <div>
                <h3 className="font-heading font-bold text-lg text-foreground mb-1">AI Recommended Schemes</h3>
                <p className="text-sm text-muted-foreground mb-4">Based on your profile, ranked by AI match score</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendations.map((rec: any) => (
                    <SchemeCard
                      key={rec.schemeId}
                      scheme={rec.scheme}
                      saved={savedIds.includes(rec.scheme.id)}
                      onSave={toggleSave}
                      matchScore={rec.matchScore}
                      matchReason={rec.reason}
                    />
                  ))}
                </div>
              </div>
            )}

            {(!showRecommendations || !recommendations?.length) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {schemesLoading ? (
                  <p className="text-muted-foreground col-span-full text-center py-12">Loading schemes...</p>
                ) : schemes.length === 0 ? (
                  <p className="text-muted-foreground col-span-full text-center py-12">No schemes found. Try different search terms.</p>
                ) : (
                  schemes.map((scheme: any) => (
                    <SchemeCard key={scheme.id} scheme={scheme} saved={savedIds.includes(scheme.id)} onSave={toggleSave} />
                  ))
                )}
              </div>
            )}

            {/* Nearby Agents */}
            {agents && agents.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
                      <User className="h-6 w-6 text-accent" /> Connect with Verified Agents
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">Get free 1-on-1 assistance with scheme applications right now.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {agents.map((agent) => (
                    <Card key={agent.id} className="shadow-card border-t-4 border-t-accent hover:shadow-lg transition-shadow relative overflow-hidden group">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="h-12 w-12 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center">
                            <span className="font-bold text-accent text-lg">{agent.fullName?.charAt(0)}</span>
                          </div>
                          <Badge className="bg-success/10 text-success capitalize px-2 py-0.5"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
                        </div>
                        
                        <h4 className="font-bold text-foreground text-lg">{agent.fullName}</h4>
                        <div className="space-y-1 mt-2 mb-4 text-sm text-muted-foreground">
                          <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {agent.state}{agent.district ? `, ${agent.district}` : ''}</p>
                          <p className="flex items-center gap-2"><Star className="h-3.5 w-3.5 text-warning" /> Expertise: <span className="capitalize">{agent.expertise}</span></p>
                        </div>

                        <Button
                          variant="outline"
                          className="w-full border-accent text-accent hover:bg-accent hover:text-white transition-colors"
                          onClick={() => { setSelectedAgent(agent); setAgentMessage(""); setAgentDialog(true); }}
                        >
                          <Phone className="h-4 w-4 mr-2" /> Request Callback
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Agent Connection Modal */}
                <Dialog open={agentDialog} onOpenChange={setAgentDialog}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-xl">
                        <User className="h-5 w-5 text-accent" /> Request Assistance
                      </DialogTitle>
                      <DialogDescription>
                        You are about to request a callback from <strong className="text-foreground">{selectedAgent?.fullName}</strong>.
                        Please provide details about what schemes you need help with.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      {!user && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="guestName">Full Name</Label>
                            <Input
                              id="guestName"
                              placeholder="Your name"
                              value={profile.guestName}
                              onChange={(e) => setProfile({ ...profile, guestName: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="guestPhone">Mobile Number</Label>
                            <Input
                              id="guestPhone"
                              placeholder="e.g. 9876543210"
                              value={profile.guestPhone}
                              onChange={(e) => setProfile({ ...profile, guestPhone: e.target.value })}
                            />
                          </div>
                        </>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="message">Your Message</Label>
                        <Textarea
                          id="message"
                          placeholder="E.g. I need help filling out the PM Kisan application..."
                          value={agentMessage}
                          onChange={(e) => setAgentMessage(e.target.value)}
                          rows={4}
                        />
                      </div>
                      <div className="bg-muted p-3 rounded-lg flex items-start gap-3 mt-2">
                        <Phone className="h-5 w-5 text-accent mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          {user ? (
                            <>The agent will contact you shortly using your registered mobile number: <strong>{user?.mobile}</strong>.</>
                          ) : (
                            <>The agent will contact you shortly using the mobile number provided above.</>
                          )}
                        </p>
                      </div>
                    </div>
                    <Button onClick={handleAgentRequest} className="w-full">
                      <Send className="h-4 w-4 mr-2" /> Send Request
                    </Button>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </TabsContent>

          {/* My Applications */}
          <TabsContent value="applications" className="space-y-6">
             <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-heading text-lg">Application History</CardTitle>
                </CardHeader>
                <CardContent>
                  {appsLoading ? (
                    <p className="text-center py-12 text-muted-foreground">Loading applications...</p>
                  ) : applications.length === 0 ? (
                    <div className="text-center py-12 space-y-4">
                       <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                       <p className="text-muted-foreground">You haven't applied for any schemes yet.</p>
                       <Button variant="outline" onClick={() => document.querySelector<HTMLButtonElement>('[value="finder"]')?.click()}>Browse Schemes</Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {applications.map((app: any) => (
                        <div key={app.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-colors gap-4">
                          <div className="flex items-start gap-4">
                             <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${app.status === 'approved' ? 'bg-green-100 text-green-600' : app.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                <FileText className="h-5 w-5" />
                             </div>
                             <div>
                               <h4 className="font-bold text-foreground">{app.schemeName}</h4>
                               <p className="text-xs text-muted-foreground">Reference: <span className="font-mono">{app.trackingId || app.id.slice(0, 8)}</span> • Applied on {new Date(app.createdAt).toLocaleDateString()}</p>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-3 justify-between md:justify-end">
                             <Badge className={`capitalize ${
                               app.status === 'approved' ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : 
                               app.status === 'rejected' ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20' : 
                               app.status === 'submitted' ? 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20' :
                               'bg-slate-500/10 text-slate-600 hover:bg-slate-500/20'
                             }`}>
                               {app.status}
                             </Badge>
                             <Button variant="ghost" size="sm" asChild>
                                <Link to={`/schemes/${app.schemeId}`}>View Details</Link>
                             </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
             </Card>
          </TabsContent>

          {/* My Documents */}
          <TabsContent value="documents" className="space-y-6">
             <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="font-heading text-lg">Vault (Secure Documents)</CardTitle>
                  <Button variant="accent" size="sm" onClick={() => navigate('/apply-scheme/new')}><Upload className="h-4 w-4 mr-2" /> Upload New</Button>
                </CardHeader>
                <CardContent>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex gap-3">
                     <Shield className="h-5 w-5 text-blue-600 shrink-0" />
                     <p className="text-xs text-blue-800 leading-relaxed">
                       Your documents are encrypted and only shared with the government departments when you explicitly submit a scheme application.
                     </p>
                  </div>

                  {docsLoading ? (
                    <p className="text-center py-12 text-muted-foreground">Accessing secure vault...</p>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground italic">
                       No documents stored yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {documents.map((doc: any) => (
                         <div key={doc.id} className="group p-4 border rounded-2xl bg-card hover:border-accent/40 transition-all flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <div className="h-10 w-10 bg-muted rounded-xl flex items-center justify-center group-hover:bg-accent/5 transition-colors">
                                  <FileText className="h-5 w-5 text-muted-foreground group-hover:text-accent" />
                               </div>
                               <div>
                                 <h5 className="font-semibold text-sm truncate max-w-[150px]">{doc.fileName}</h5>
                                 <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{doc.type}</p>
                               </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => deleteDoc.mutate(doc.id, { onSuccess: () => toast({ title: "Document deleted" }) })}
                            >
                               <Trash2 className="h-4 w-4" />
                            </Button>
                         </div>
                       ))}
                    </div>
                  )}
                </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CitizenDashboard;
