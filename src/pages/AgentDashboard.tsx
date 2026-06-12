import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, LogOut, CheckCircle, XCircle, PlayCircle, FileText, Landmark, User, LayoutDashboard, MessageSquare, Phone, Calendar, LifeBuoy, Search, Wallet, IndianRupee, TrendingUp, AlertCircle, ArrowUpRight } from "lucide-react";
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
  
  const [subStatus, setSubStatus] = useState<any>(null);
  const [wallet, setWallet] = useState<any>({ availableBalance: 0, pendingEarnings: 0, totalEarned: 0 });
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);

  // FIX: Removed dangerous 'agent-1' fallback ID.
  // If user is not authenticated, redirect to login immediately.
  useEffect(() => {
    if (!user?.id) {
      navigate('/login', { replace: true });
      return;
    }
    fetchApplications();
    fetchHelpRequests();
    fetchScrapedData();
    fetchGovSchemes();
    fetchOverviewData();
  }, [user?.id]);

  // Safe: only reached after auth guard confirms user exists
  const agentId = user?.id ?? '';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

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

  const fetchOverviewData = async () => {
      try {
          const sub = await api.get<any>('/subscription/status');
          setSubStatus(sub);

          const wData = await api.get<any>('/agents/earnings');
          setWallet(wData);

          const wdData = await api.get<any>('/withdrawal/history');
          setWithdrawals(wdData.withdrawals || []);
      } catch (e) {
          console.error("Failed to load overview data", e);
      }
  };

  const requestWithdrawal = async () => {
      try {
          // Just request all available for MVP
          await api.post('/withdrawal/request', { amount: wallet.pendingEarnings, method: 'UPI' });
          toast({ title: "Withdrawal Requested", description: "Your request has been submitted for approval." });
          fetchOverviewData();
      } catch(e: any) {
          toast({ title: "Request Failed", description: e.message, variant: "destructive" });
      }
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

  const updateRequestStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/agents/request/${id}/status`, { status });
      toast({ title: `Lead marked as ${status.toUpperCase()}` });
      fetchHelpRequests();
    } catch (e) {
      toast({ title: "Failed to update request", variant: "destructive" });
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
  const activeApps = applications.filter(a => ['submitted', 'in_review'].includes(a.status) && a.agentId === agentId);
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

  const pendingLeads = helpRequests.filter(req => req.status === 'pending' || !req.status);
  const activeCases = helpRequests.filter(req => req.status === 'accepted' && req.assignedAgentId === agentId);

  return (
    <div className="min-h-screen bg-[#020617] selection:bg-accent/30 selection:text-white">
      {/* Sleek Enterprise Header */}
      <header className="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
           <Link to="/agent-dashboard" className="flex items-center gap-2 group">
              <div className="h-8 w-8 rounded-lg bg-accent/20 flex items-center justify-center group-hover:bg-accent transition-colors">
                <Shield className="h-4 w-4 text-accent group-hover:text-white transition-colors" />
              </div>
              <span className="font-heading font-black text-xl text-white tracking-tighter">
                SCHEMESAGE<span className="text-accent">.GOV</span>
              </span>
           </Link>

           <div className="flex items-center gap-4">
              <Badge variant="outline" className="hidden sm:flex border-accent/20 text-accent font-black tracking-widest text-[9px] uppercase px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse mr-2"></span>
                Secure Uplink Active
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-white/5 border border-white/10">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.fullName || "Agent"}&backgroundColor=0f172a&textColor=38bdf8`} />
                      <AvatarFallback className="bg-slate-800 text-xs">{user?.fullName?.charAt(0) || "A"}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-slate-900 border-white/10 text-white p-2" align="end">
                  <div className="px-2 py-3 border-b border-white/10 mb-2">
                    <p className="text-sm font-black tracking-tight">{user?.fullName}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">UID: {user?.id?.substring(0,8)}</p>
                  </div>
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

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-slate-900 border border-white/20 p-1 h-14 w-full flex overflow-x-auto overflow-y-hidden">
            <TabsTrigger value="overview" className="min-w-fit flex-1 h-full data-[state=active]:bg-accent data-[state=active]:text-white transition-all font-bold">
              Overview
            </TabsTrigger>
            <TabsTrigger value="pool" className="min-w-fit flex-1 h-full data-[state=active]:bg-accent data-[state=active]:text-white transition-all font-bold relative">
              Application Pool
              {poolApps.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] h-5 w-5 rounded-full flex items-center justify-center animate-pulse">{poolApps.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="active" className="min-w-fit flex-1 h-full data-[state=active]:bg-accent data-[state=active]:text-white transition-all font-bold">My Queue ({activeApps.length})</TabsTrigger>
            <TabsTrigger value="wallet" className="min-w-fit flex-1 h-full data-[state=active]:bg-accent data-[state=active]:text-white transition-all font-bold">
              Wallet
            </TabsTrigger>
            <TabsTrigger value="assistance" className="min-w-fit flex-1 h-full data-[state=active]:bg-accent data-[state=active]:text-white transition-all font-bold relative">
              Help Centre
              {(pendingLeads.length + activeCases.length) > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] h-5 w-5 rounded-full flex items-center justify-center">{pendingLeads.length + activeCases.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="history" className="min-w-fit flex-1 h-full data-[state=active]:bg-accent data-[state=active]:text-white transition-all font-bold">Archive</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            {/* Subscription & Performance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Subscription Card */}
              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-white/10 shadow-2xl relative overflow-hidden col-span-1 lg:col-span-2">
                {subStatus?.plan?.planKey === 'professional' && (
                  <div className="absolute -right-10 top-6 rotate-45 bg-accent text-white py-1 px-10 text-[10px] font-black uppercase tracking-widest shadow-lg">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Shield className="h-5 w-5 text-accent" /> Active Subscription
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!subStatus?.allowed ? (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-4">
                      <AlertCircle className="h-6 w-6 text-red-500 mt-1 shrink-0" />
                      <div>
                         <p className="font-bold text-red-500 text-lg">No Active Plan or Limit Reached</p>
                         <p className="text-sm text-slate-300 mt-1">You must subscribe to a plan to claim priority assisted applications. Free leads are still available.</p>
                         <Button onClick={() => navigate('/agent-subscription')} className="mt-4 bg-red-500 hover:bg-red-600 text-white font-bold">View Plans</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                       <div>
                         <h3 className="text-3xl font-black text-white">{subStatus.plan.planName}</h3>
                         <p className="text-slate-400 text-sm mt-1">Valid until {new Date(subStatus.plan.expiryDate).toLocaleDateString()}</p>
                         <div className="mt-6 space-x-3">
                           <Button onClick={() => navigate('/agent-subscription')} variant="outline" className="border-white/20 text-white hover:bg-white/10">Upgrade Plan</Button>
                         </div>
                       </div>
                       <div className="bg-black/30 p-6 rounded-2xl border border-white/5 flex-1 max-w-xs">
                          <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Application Credits</p>
                          <div className="flex items-end gap-2 mb-2">
                            <span className="text-4xl font-black text-accent">{subStatus.plan.limit === -1 ? '∞' : subStatus.remaining}</span>
                            <span className="text-sm text-slate-400 pb-1">remaining</span>
                          </div>
                          {subStatus.plan.limit !== -1 && (
                            <div className="w-full bg-slate-800 rounded-full h-2 mt-4">
                              <div className="bg-accent h-2 rounded-full" style={{ width: `${(subStatus.used / subStatus.plan.limit) * 100}%` }}></div>
                            </div>
                          )}
                          <p className="text-[10px] text-slate-500 mt-2 uppercase">{subStatus.used} used of {subStatus.plan.limit === -1 ? 'Unlimited' : subStatus.plan.limit}</p>
                       </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Performance Stats */}
              <Card className="bg-slate-900 border-white/10 shadow-xl">
                 <CardHeader>
                   <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Total Earnings</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="flex items-center gap-4">
                       <div className="h-12 w-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
                         <IndianRupee className="h-6 w-6 text-green-500" />
                       </div>
                       <div>
                         <p className="text-3xl font-black text-white">₹{(wallet?.totalEarned || 0) / 100}</p>
                         <p className="text-xs text-green-500 flex items-center gap-1 mt-1 font-bold"><TrendingUp className="h-3 w-3" /> Lifetime</p>
                       </div>
                    </div>
                 </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="wallet" className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-900 border-white/10 shadow-xl md:col-span-2">
                   <CardContent className="p-8">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                         <div>
                            <p className="text-sm font-black uppercase tracking-widest text-slate-500 mb-2">Available for Withdrawal</p>
                            <p className="text-5xl font-black text-white">₹{(wallet?.pendingEarnings || 0) / 100}<span className="text-xl text-slate-500 ml-1">.00</span></p>
                         </div>
                         <Button 
                          onClick={requestWithdrawal} 
                          disabled={!wallet?.pendingEarnings || wallet.pendingEarnings < 50000}
                          className="h-14 px-8 bg-accent hover:bg-accent/90 text-black font-black text-lg rounded-2xl shadow-lg shadow-accent/20"
                         >
                           Withdraw Funds
                         </Button>
                      </div>
                      <p className="text-xs text-slate-500 mt-6"><AlertCircle className="h-3 w-3 inline mr-1"/> Minimum withdrawal amount is ₹500. Standard processing time 2-3 business days.</p>
                   </CardContent>
                </Card>
                <Card className="bg-slate-900 border-white/10 shadow-xl">
                   <CardHeader>
                     <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Total Processed</CardTitle>
                   </CardHeader>
                   <CardContent>
                      <p className="text-3xl font-black text-white">{historyApps.length}</p>
                      <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">Successful Applications</p>
                   </CardContent>
                </Card>
             </div>

             <Card className="bg-slate-900 border-white/10 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-white">Withdrawal History</CardTitle>
                </CardHeader>
                <CardContent>
                   {withdrawals.length === 0 ? (
                      <p className="text-center py-8 text-slate-500 text-sm">No withdrawal requests found.</p>
                   ) : (
                      <div className="space-y-4">
                         {withdrawals.map((w, i) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-[#0f172a] rounded-xl border border-white/5">
                               <div className="flex items-center gap-4">
                                  <div className="bg-white/5 p-3 rounded-lg"><Wallet className="h-5 w-5 text-slate-400" /></div>
                                  <div>
                                     <p className="text-white font-bold">₹{w.amount / 100}</p>
                                     <p className="text-xs text-slate-500">{new Date(w.createdAt).toLocaleDateString()}</p>
                                  </div>
                               </div>
                               <Badge className={
                                 w.status === 'paid' ? 'bg-green-500/20 text-green-500' :
                                 w.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                                 'bg-yellow-500/20 text-yellow-500'
                               }>
                                 {w.status.toUpperCase()}
                               </Badge>
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
                             <Badge className={app.status === 'in_review' ? "bg-info text-white" : app.status === 'submitted' ? "bg-accent/20 text-accent border-0" : "bg-warning text-black"} variant="secondary">
                               {app.status === 'in_review' ? 'IN PROGRESS' : app.status.toUpperCase()}
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
                        <Button variant="outline" className="flex-1 sm:flex-none h-12 border-white/10 hover:bg-white/5 text-white font-bold px-8 rounded-xl transition-all" asChild>
                          <Link to={`/tracking/${app.id}`} target="_blank">
                            <FileText className="h-4 w-4 mr-2" /> Details
                          </Link>
                        </Button>
                        {app.status === 'submitted' && (
                          <Button className="flex-1 sm:flex-none h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 rounded-xl transition-all shadow-lg shadow-blue-900/20" onClick={() => updateStatus(app.id, 'in_review')}>
                            <PlayCircle className="h-4 w-4 mr-2" /> Mark In Progress
                          </Button>
                        )}
                        {app.status === 'in_review' && (
                          <Button className="flex-1 sm:flex-none h-12 bg-green-600 hover:bg-green-500 text-white font-bold px-8 rounded-xl shadow-lg shadow-green-900/20" onClick={() => updateStatus(app.id, 'approved')}>
                            <CheckCircle className="h-4 w-4 mr-2" /> Complete
                          </Button>
                        )}
                        <Button className="flex-1 sm:flex-none h-12 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 font-bold px-8 rounded-xl transition-all" onClick={() => updateStatus(app.id, 'rejected')}>
                          <XCircle className="h-4 w-4 mr-2" /> Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="assistance">
            <div className="space-y-12">
              
              {/* SECTION: ACTIVE CASES */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Active Consultations</h2>
                    <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest">In-progress client cases</p>
                  </div>
                  <Badge variant="outline" className="border-accent/30 text-accent font-black uppercase text-[10px] px-3 py-1 bg-accent/5">
                    {activeCases.length} Active
                  </Badge>
                </div>

                {activeCases.length === 0 ? (
                  <div className="text-center py-16 bg-slate-950/40 rounded-3xl border border-white/5 border-dashed">
                    <CheckCircle className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400 font-bold">No active consultations.</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {activeCases.map((req: any) => (
                      <Card key={req.id} className="bg-[#020617] border border-accent/40 shadow-[0_0_20px_rgba(var(--accent-rgb),0.05)] overflow-hidden">
                        <div className="h-1 w-full bg-accent" />
                        <CardContent className="p-0">
                          <div className="p-6 md:p-8">
                            <div className="flex items-center justify-between mb-6">
                               <div className="flex items-center gap-3">
                                 <h3 className="font-black text-2xl text-white tracking-tight leading-none">{req.userName || "Anonymous Guest"}</h3>
                                 <Badge className="bg-accent text-white border-0 text-[10px] font-black tracking-widest uppercase">Ongoing Process</Badge>
                               </div>
                               <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">ID: {req.id?.substring(0,8)}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-white/10">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Target Scheme</p>
                                <p className="text-lg font-bold text-white leading-tight">{req.schemeName || "General Discovery"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Contact Operations</p>
                                <div className="space-y-3">
                                  <a href={`tel:${req.userPhone}`} className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors group">
                                    <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10">
                                      <Phone className="h-3 w-3" />
                                    </div>
                                    <span className="font-bold text-sm tracking-wide">{req.userPhone}</span>
                                  </a>
                                  {req.userEmail && (
                                    <a href={`mailto:${req.userEmail}`} className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors group">
                                      <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10">
                                        <MessageSquare className="h-3 w-3" />
                                      </div>
                                      <span className="font-medium text-sm">{req.userEmail}</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-end gap-4">
                              <Button variant="outline" className="h-12 border-white/10 text-white hover:bg-white/5 font-bold px-8 rounded-xl" onClick={() => updateRequestStatus(req.id, 'rejected')}>
                                Cancel Lead
                              </Button>
                              <Button className="h-12 bg-green-600 hover:bg-green-500 text-white font-black px-8 rounded-xl shadow-lg shadow-green-900/20" onClick={() => updateRequestStatus(req.id, 'completed')}>
                                <CheckCircle className="h-4 w-4 mr-2" /> REQUEST COMPLETED
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION: PENDING LEADS */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Pending Leads Pool</h2>
                    <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest">New callback requests awaiting assignment</p>
                  </div>
                  <Badge variant="outline" className="border-slate-700 text-slate-400 font-black uppercase text-[10px] px-3 py-1">
                    {pendingLeads.length} Available
                  </Badge>
                </div>

                {pendingLeads.length === 0 ? (
                  <div className="text-center py-12 bg-slate-900/40 rounded-3xl border border-white/5 border-dashed">
                    <MessageSquare className="h-8 w-8 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500 font-bold text-sm">No new leads in the global pool.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {pendingLeads.map((req: any) => (
                      <Card key={req.id} className="bg-slate-900 border border-white/10 hover:border-white/20 transition-all">
                        <CardContent className="p-5">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="font-bold text-lg text-white leading-none">{req.userName || "Anonymous Lead"}</h3>
                                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px] font-black tracking-widest uppercase">New Lead</Badge>
                                {req.state && (
                                  <Badge className="bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20 text-[9px] font-black tracking-widest uppercase">{req.state}</Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 font-medium">{req.schemeName || "General Assistance"}</p>
                            </div>
                            <div className="flex items-center gap-3">
                               <Button variant="outline" className="h-10 border-white/10 hover:bg-white/5 text-slate-300 font-bold w-full sm:w-auto" onClick={() => updateRequestStatus(req.id, 'rejected')}>
                                 Decline
                               </Button>
                               <Button className="h-10 bg-white text-black hover:bg-slate-200 font-black px-6 shadow-md w-full sm:w-auto" onClick={() => updateRequestStatus(req.id, 'accepted')}>
                                 Accept Lead
                               </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

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
