import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, LogOut, CheckCircle, XCircle, PlayCircle, FileText, Landmark, User, LayoutDashboard, MessageSquare, Phone, Calendar, LifeBuoy, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const AgentDashboard = () => {
  const { user, logout } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [helpRequests, setHelpRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [scraped, setScraped] = useState<any>(null);
  const [scraping, setScraping] = useState(false);
  const [govSchemes, setGovSchemes] = useState<any[]>([]);

  const agentId = user?.id || "agent-1"; 

  const handleLogout = () => {
    logout();
    navigate("/");
  };
  useEffect(() => {
    fetchApplications();
    fetchHelpRequests();
    fetchScrapedData();
    fetchGovSchemes();
  }, []);

  const fetchScrapedData = async () => {
    try {
      const data = await api.get<any>('/admin/scraped-data');
      setScraped(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchGovSchemes = async () => {
    try {
      const data = await api.get<{ schemes: any[] }>('/schemes');
      const gov = (data.schemes || []).filter((s: any) => s.source === 'government');
      setGovSchemes(gov);
    } catch (e) { console.error(e); }
  };

  const fetchHelpRequests = async () => {
    setLoadingRequests(true);
    try {
      const data = await api.get<any[]>("/agents/all-requests");
      setHelpRequests(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchApplications = () => {
    api.get<any[]>(`/agent/applications/${agentId}`)
      .then(setApplications)
      .catch(console.error);
  };

  const updateStatus = async (applicationId: string, status: string) => {
    try {
      await api.patch(`/agent/update-status/${applicationId}`, { status });
      toast({ title: `Application marked as ${status}` });
      fetchApplications();
    } catch (e) {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const handleAccept = async (applicationId: string) => {
    try {
      await api.post(`/agent/accept/${applicationId}`, { agentId });
      toast({ title: "Application Claimed", description: "This application has been successfully assigned to you." });
      fetchApplications();
    } catch (e: any) {
      toast({ title: "Claim Failed", description: e.message || "Someone else may have already taken this task.", variant: "destructive" });
    }
  };

  const handleReject = async (applicationId: string) => {
    try {
      await api.post(`/agent/reject/${applicationId}`);
      toast({ title: "Application Rejected", description: "The application has been marked as rejected." });
      fetchApplications();
    } catch (e) {
      toast({ title: "Rejection Failed", variant: "destructive" });
    }
  };

  const poolApps = applications.filter(a => a.status === 'submitted' && (!a.agentId || a.agentId === ""));
  const activeApps = applications.filter(a => ['in_review'].includes(a.status) && a.agentId === agentId);
  const historyApps = applications.filter(a => ['approved', 'rejected'].includes(a.status) && a.agentId === agentId);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60000) return "Just now";
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <header className="border-b border-white/10 bg-slate-900/80 flex items-center h-20 px-6 sticky top-0 z-50 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between h-full">
          <Link to="/" className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-accent" />
            <span className="font-heading font-black text-xl tracking-tight uppercase">Agent Portal</span>
          </Link>
          <div className="flex items-center gap-6">
              <Badge variant="outline" className="hidden md:flex border-success text-success bg-success/10 font-black tracking-widest uppercase text-[10px] px-3 py-1 mr-2">Online</Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-4 hover:bg-white/5 p-2 rounded-2xl transition-all border border-transparent hover:border-white/10 cursor-pointer group">
                    <div className="text-right hidden sm:block">
                       <p className="text-[10px] font-black uppercase text-accent leading-tight tracking-[0.2em]">Active Agent</p>
                       <p className="text-sm font-black text-white group-hover:text-white">{user?.fullName}</p>
                    </div>
                    <Avatar className="h-10 w-10 border-2 border-success/50">
                      <AvatarImage src={user?.avatarUrl} className="object-cover" />
                      <AvatarFallback className="bg-slate-800 text-[12px] font-black text-white">{user?.fullName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-white/10 text-white p-2">
                  <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer py-3 rounded-xl" onClick={() => navigate('/profile')}>
                    <FileText className="mr-3 h-4 w-4 text-accent" />
                    <span className="font-bold">My Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-destructive/10 focus:text-destructive text-destructive cursor-pointer py-3 rounded-xl" onClick={handleLogout}>
                    <LogOut className="mr-3 h-4 w-4" />
                    <span className="font-bold">Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
           </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-white font-heading tracking-tight uppercase">
            Field Ops Terminal
          </h1>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 font-black tracking-[0.2em] uppercase">Status: Authenticated</p>
            <p className="text-sm font-black text-accent">{user?.fullName || "Field Officer"}</p>
          </div>
        </div>

        <Tabs defaultValue="pool" className="space-y-6">
          <TabsList className="bg-slate-900 border border-white/20 p-1 h-14 w-full flex">
            <TabsTrigger value="pool" className="flex-1 h-full data-[state=active]:bg-accent data-[state=active]:text-white transition-all font-bold relative">
              Application Pool
              {poolApps.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] h-5 w-5 rounded-full flex items-center justify-center animate-pulse">{poolApps.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="active" className="flex-1 h-full data-[state=active]:bg-accent data-[state=active]:text-white transition-all font-bold">My Active Queue ({activeApps.length})</TabsTrigger>
            <TabsTrigger value="assistance" className="flex-1 h-full data-[state=active]:bg-accent data-[state=active]:text-white transition-all font-bold relative">
              <LifeBuoy className="h-4 w-4 mr-1" /> Help Centre
              {helpRequests.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] h-5 w-5 rounded-full flex items-center justify-center">{helpRequests.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 h-full data-[state=active]:bg-accent data-[state=active]:text-white transition-all font-bold">My Archive</TabsTrigger>
            <TabsTrigger value="scraper" className="flex-1 h-full data-[state=active]:bg-accent data-[state=active]:text-white transition-all font-bold">
              <Search className="h-4 w-4 mr-1" /> Scraper
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="scraper">
            <Card className="bg-slate-900 border-white/10 shadow-2xl overflow-hidden">
              <div className="h-1 bg-accent" />
              <CardHeader>
                <div>
                  <CardTitle className="font-heading text-xl font-black text-white uppercase tracking-tight">AI Discovery Agent</CardTitle>
                  <p className="text-xs text-slate-500 font-bold tracking-widest mt-1">Discover schemes from any central or state portal</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Discovery Target (URL or Query)</label>
                  <input 
                    type="text"
                    id="agent-scraper-url"
                    placeholder="URL or query, e.g. 'Bihar women welfare schemes'"
                    defaultValue="https://www.india.gov.in/my-government/schemes"
                    className="w-full bg-white/5 border border-white/10 text-white placeholder:text-slate-600 rounded-xl h-12 px-4 text-sm"
                  />
                </div>
                <Button 
                  className="w-full bg-accent hover:bg-accent/90 text-white font-black rounded-xl h-12"
                  onClick={async () => {
                    const url = (document.getElementById('agent-scraper-url') as HTMLInputElement)?.value;
                    setScraping(true);
                    try {
                      toast({ title: "Agent Dispatched", description: "Browser Use Cloud session started..." });
                      const res = await api.post<any>('/scrape/managed', { url });
                      toast({ title: "Sync Complete", description: `Discovered ${res.count} schemes.` });
                      fetchScrapedData();
                    } catch (err: any) {
                      const errorMsg = err.details || err.message || "External session limit reached or portal offline.";
                      toast({ 
                        title: "Agent Busy / Error", 
                        description: errorMsg, 
                        variant: "destructive" 
                      });
                    } finally {
                      setScraping(false);
                    }
                  }}
                  disabled={scraping}
                >
                  {scraping ? "AGENT BUSY..." : "DISPATCH AGENT"}
                </Button>
              </CardContent>
              <CardContent>
                {!scraped ? (
                   <div className="text-center py-20 bg-slate-950/40 rounded-2xl border border-white/5 border-dashed">
                    <Search className="h-12 w-12 text-slate-800 mx-auto mb-4" />
                    <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">No active data stream</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {scraped.latest?.map((s: any) => (
                      <div key={s.id} className="p-4 rounded-xl border border-white/10 bg-white/5 hover:border-accent/30 transition-all group">
                         <div className="flex justify-between items-start mb-2">
                           <h4 className="font-black text-white group-hover:text-accent transition-colors">{s.name}</h4>
                           <Badge variant="outline" className="text-[9px] border-white/10 text-slate-400">{s.category}</Badge>
                         </div>
                         <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{s.description}</p>
                         <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5">
                           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Eligibility: {s.eligibility}</p>
                           <a href={s.officialLink} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-accent hover:underline">OFFICIAL LINK</a>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Government-Published Schemes */}
            <Card className="bg-slate-900 border-white/10 shadow-2xl overflow-hidden mt-6">
              <div className="h-1 bg-gradient-to-r from-green-500 to-accent" />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-heading text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                      <Shield className="h-5 w-5 text-green-400" /> Gov-Published Schemes
                    </CardTitle>
                    <p className="text-xs text-slate-500 font-bold tracking-widest mt-1">
                      Officially published by government officials — share these with your clients
                    </p>
                  </div>
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-[10px]">
                    {govSchemes.length} Live
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {govSchemes.length === 0 ? (
                  <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-white/5 border-dashed">
                    <Shield className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">No government schemes published yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {govSchemes.map((s: any) => (
                      <div key={s.id} className="p-4 rounded-xl border border-green-500/20 bg-green-500/5 hover:border-green-500/40 transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <Badge className="text-[9px] bg-green-500/10 text-green-400 border-green-500/20 mb-1">GOV VERIFIED</Badge>
                            <h4 className="font-black text-white text-sm leading-tight">{s.name}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">{s.ministry}</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">{s.description}</p>
                        <div className="flex justify-between items-center pt-2 border-t border-white/5">
                          <p className="text-[10px] text-slate-500">Benefits: {s.benefits?.substring(0, 50)}...</p>
                          {s.applyLink && s.applyLink !== '#' && (
                            <a href={s.applyLink} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-accent hover:underline">APPLY →</a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="pool">
            {poolApps.length === 0 ? (
              <div className="text-center py-20 bg-slate-950/40 rounded-3xl border border-white/10 border-dashed">
                <Landmark className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-300 font-bold">No new applications in the global pool.</p>
                <p className="text-xs text-slate-500 mt-2">Checking HQ every 30 seconds...</p>
              </div>
            ) : (
              <div className="grid gap-6">
                  {poolApps.map(app => (
                    <div key={app.id} className={`bg-slate-900 border ${app.paymentStatus === 'paid' ? 'border-accent/40 shadow-[0_0_20px_rgba(var(--accent-rgb),0.1)]' : 'border-white/10'} rounded-2xl overflow-hidden shadow-2xl relative transition-all hover:scale-[1.01]`}>
                      {app.paymentStatus === 'paid' ? (
                        <div className="absolute top-4 right-4 bg-accent text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-accent/20 z-10">
                          PRIORITY ASSISTANCE
                        </div>
                      ) : (
                        <div className="absolute top-4 right-4 bg-slate-800 text-slate-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/5 z-10">
                          FREE REQUEST
                        </div>
                      )}
                      
                      <div className="p-8">
                        <div className="flex items-center gap-3 mb-1">
                           <FileText className={`h-5 w-5 ${app.paymentStatus === 'paid' ? 'text-accent' : 'text-slate-500'}`} />
                           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Service Request</span>
                        </div>
                        <h3 className="text-2xl font-black text-white mb-4 tracking-tight leading-none">{app.schemeName}</h3>
                        
                        <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-white/5">
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Applicant Full Name</p>
                              <p className="text-lg font-bold text-white leading-none">{app.userName || app.formData?.fullName || "Anonymous Citizen"}</p>
                           </div>
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Region / State</p>
                              <p className="text-lg font-bold text-accent leading-none">{app.formData?.state || "N/A"}</p>
                           </div>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                           <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`border-accent/30 text-accent font-black uppercase text-[10px] px-3 py-1 ${app.paymentStatus === 'paid' ? 'opacity-100' : 'opacity-0'}`}>
                                 PRO-FILING
                              </Badge>
                           </div>
                           <Button 
                            onClick={() => handleAccept(app.id)} 
                            className={`h-14 px-10 ${app.paymentStatus === 'paid' ? 'bg-accent hover:bg-accent/90' : 'bg-white hover:bg-slate-200'} text-black font-black rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95`}
                           >
                             <CheckCircle className="h-5 w-5" /> ACCEPT & CLAIM WORK
                           </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active">
            {activeApps.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground bg-[#020617] rounded-2xl border-2 border-dashed border-white/5">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-10" />
                <p className="text-lg font-bold">Your active queue is empty.</p>
                <p className="text-sm opacity-60">Go to the Pool to claim new assignments.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {activeApps.map((app) => (
                  <Card key={app.id} className="bg-[#020617] border border-white/10 shadow-xl overflow-hidden group">
                    <div className="bg-accent/10 h-1" />
                    <CardHeader className="pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-xl font-black text-white group-hover:text-accent transition-colors">{app.schemeName}</CardTitle>
                          <div className="flex items-center gap-3 mt-2">
                             <div className="bg-white/5 px-2 py-1 rounded text-[10px] font-black tracking-tighter text-slate-400">APP-ID: {app.id.split('-')[0].toUpperCase()}</div>
                             <Badge className={app.status === 'in_review' ? "bg-info text-white" : "bg-warning text-black"} variant="secondary">
                               {app.status.toUpperCase()}
                             </Badge>
                          </div>
                        </div>
                        <div className="sm:text-right text-left">
                          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-widest font-bold">Citizen Contact</p>
                          <p className="font-bold text-white text-lg">{app.userName || app.formData?.fullName || "N/A"}</p>
                          <p className="text-accent text-sm font-mono">{app.formData?.mobile || app.userEmail || "N/A"}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[#0f172a] p-4 rounded-xl border border-white/5">
                          <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-3 flex items-center gap-2">
                            <FileText className="h-3 w-3" /> Verification Documents
                          </p>
                          {app.documents && app.documents.length > 0 ? (
                            <div className="space-y-2">
                              {app.documents.map((d: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-slate-200">
                                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                  <span className="truncate">{typeof d === 'string' ? d : d.name}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-destructive italic font-bold">CRITICAL: No documents uploaded.</p>
                          )}
                        </div>
                        <div className="bg-[#0f172a] p-4 rounded-xl border border-white/5">
                          <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Landmark className="h-3 w-3" /> Location Context
                          </p>
                          <div className="space-y-1 text-sm text-slate-200">
                             <p className="font-bold">{app.formData?.state || "N/A"}</p>
                             <p className="text-xs text-slate-400">{app.formData?.address || "No address provided"}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-white/5">
                        {app.status !== 'in_review' && (
                          <Button className="flex-1 sm:flex-none h-12 bg-white text-black hover:bg-slate-200 font-bold px-8 rounded-xl transition-all" onClick={() => updateStatus(app.id, 'in_review')}>
                            <PlayCircle className="h-4 w-4 mr-2" /> Start Processing
                          </Button>
                        )}
                        <Button className="flex-1 sm:flex-none h-12 bg-green-600 hover:bg-green-500 text-white font-bold px-8 rounded-xl shadow-lg shadow-green-900/20" onClick={() => updateStatus(app.id, 'approved')}>
                          <CheckCircle className="h-4 w-4 mr-2" /> Verify & Approve
                        </Button>
                        <Button className="flex-1 sm:flex-none h-12 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 font-bold px-8 rounded-xl transition-all" onClick={() => updateStatus(app.id, 'rejected')}>
                          <XCircle className="h-4 w-4 mr-2" /> Mark Deficient
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="assistance">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">Citizen Callback Requests</h2>
                  <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest">Connect with users seeking expert guidance</p>
                </div>
                <Badge variant="outline" className="border-accent/30 text-accent font-black uppercase text-[10px] px-3 py-1">Direct Leads</Badge>
              </div>

              {helpRequests.length === 0 ? (
                <div className="text-center py-20 bg-slate-950/40 rounded-3xl border border-white/10 border-dashed">
                  <MessageSquare className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-300 font-bold">No help requests at the moment.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {helpRequests.map((req: any) => (
                    <Card key={req.id} className="bg-slate-900 border border-white/10 overflow-hidden group hover:border-accent/30 transition-all">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-black text-lg text-white tracking-tight leading-none">{req.userName || "Anonymous Guest"}</h3>
                              <Badge className="bg-success/10 text-success border-success/20 text-[10px] font-black tracking-widest uppercase">New Lead</Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                              <p className="text-xs text-slate-400 flex items-center gap-2">
                                <Phone className="h-3 w-3 text-accent" /> <span className="text-white font-bold">{req.userPhone}</span>
                              </p>
                              <p className="text-xs text-slate-400 flex items-center gap-2">
                                <FileText className="h-3 w-3 text-slate-500" /> Scheme: <span className="text-slate-200 font-medium">{req.schemeName || "General Discovery"}</span>
                              </p>
                            </div>
                            {req.userEmail && (
                              <p className="text-xs text-slate-400 flex items-center gap-2">
                                <MessageSquare className="h-3 w-3 text-slate-500" /> <span className="text-slate-200">{req.userEmail}</span>
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                             <a href={`tel:${req.userPhone}`} className="flex-1 sm:flex-none">
                               <Button className="w-full h-12 bg-white text-black font-black hover:bg-slate-100 rounded-xl flex items-center justify-center gap-2 px-6">
                                 <Phone className="h-4 w-4" /> INITIATE CALL
                               </Button>
                             </a>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
              <div className="grid gap-4">
                {historyApps.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground italic">No processed history.</p>
                ) : (
                  historyApps.map((app) => (
                    <Card key={app.id} className="bg-[#020617] border border-white/5 opacity-70 group hover:opacity-100 transition-opacity">
                      <CardHeader className="p-4 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${app.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {app.status === 'approved' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                          </div>
                          <div>
                            <CardTitle className="text-md font-bold text-white">{app.schemeName}</CardTitle>
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{app.userName || app.formData?.fullName} · {new Date(app.updatedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <Badge className={app.status === 'approved' ? "bg-green-900/30 text-green-400 border-green-800/30" : "bg-red-900/30 text-red-400 border-red-800/30"} variant="outline">
                          {app.status.toUpperCase()}
                        </Badge>
                      </CardHeader>
                    </Card>
                  ))
                )}
              </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AgentDashboard;
