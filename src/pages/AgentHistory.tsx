import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  CreditCard,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  BarChart3,
  MapPin,
  Fingerprint,
  IdCard,
  Building2,
  Stethoscope,
  MapPinned
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { api } from "@/lib/api";

const COLORS = ['hsl(142, 70%, 45%)', 'hsl(0, 84%, 60%)', 'hsl(199, 89%, 48%)', 'hsl(47, 95%, 50%)'];

const AgentHistory = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api.get<any>(`/government/agent-details/${id}`)
        .then(setData)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div className="flex h-screen items-center justify-center font-heading">Loading Portfolio...</div>;
  if (!data) return <div className="p-12 text-center">Agent not found</div>;

  const { agent, stats, history, activeApplications } = data;

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      <div className="bg-card border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Panel
          </Button>
          <div className="flex items-center gap-2">
             <Badge variant="outline" className="border-accent/50 text-accent bg-accent/5">Official Agent Registry</Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row gap-6 mb-8 items-start">
          <div className="h-24 w-24 rounded-2xl bg-accent flex items-center justify-center text-accent-foreground text-4xl font-bold shadow-lg">
            {agent.fullName[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-heading font-bold text-foreground">{agent.fullName}</h1>
              <Badge className={agent.status === 'active' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
                {agent.status.toUpperCase()}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" /> <span className="text-sm">{agent.email}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" /> <span className="text-sm">{agent.mobile || 'No Phone Registered'}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" /> <span className="text-sm">Joined {new Date(agent.joinedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-success" /> <span className="text-sm font-bold text-foreground">{stats.successRate}% Success Rate</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Stats & Charts */}
          <div className="space-y-6">
            <Card className="shadow-card border-none bg-gradient-to-br from-accent to-accent/80 text-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <BarChart3 className="h-8 w-8 opacity-50" />
                  <Badge className="bg-white/20 text-white border-white/40">Lifetime Stats</Badge>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-white/70 text-sm">Applications Processed</p>
                    <p className="text-4xl font-bold">{stats.totalProcessed}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm">Active Workload</p>
                    <p className="text-4xl font-bold">{stats.totalActive}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card overflow-hidden">
               <div className="bg-slate-900 px-6 py-4 flex items-center justify-between border-b border-white/10">
                  <h3 className="font-heading font-bold text-white flex items-center gap-2">
                    <Fingerprint className="h-4 w-4 text-accent" /> Verified Professional Identity
                  </h3>
                  <Badge variant="outline" className="border-white/20 text-white/50 text-[10px]">VERIFIED</Badge>
               </div>
               <CardContent className="p-6 space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <IdCard className="h-4 w-4" /> Aadhar No.
                      </div>
                      <span className="text-sm font-mono font-bold">
                        {agent.aadharNumber ? `XXXX XXXX ${agent.aadharNumber.slice(-4)}` : 'Not Provided'}
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <CreditCard className="h-4 w-4" /> PAN Card
                      </div>
                      <span className="text-sm font-mono font-bold">
                        {agent.panNumber ? `${agent.panNumber.slice(0,5)}XXXX${agent.panNumber.slice(-1)}` : 'Not Provided'}
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Building2 className="h-4 w-4" /> MeeSeva ID
                      </div>
                      <span className="text-sm font-bold text-accent">{agent.meeSevaId || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <MapPinned className="h-4 w-4" /> Speciality
                      </div>
                      <span className="text-sm font-bold">{agent.expertise || 'General'}</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-dashed">
                    <div className="flex items-start gap-2 text-muted-foreground text-xs mb-2">
                       <MapPin className="h-4 w-4 shrink-0" /> Full Working Address
                    </div>
                    <p className="text-sm leading-relaxed font-medium">
                      {agent.address || 'Address verification pending.'}
                    </p>
                  </div>
               </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base font-heading">Decision Breakdown</CardTitle>
                <CardDescription>Approval vs Rejection distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={history}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="status"
                      >
                        {history.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Active Progress */}
          <div className="lg:col-span-2 space-y-6">
             <Card className="shadow-card h-fit">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="font-heading">Active Progress Tracker</CardTitle>
                    <CardDescription>Live monitoring of applications currently in {agent.fullName}'s hands.</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-accent animate-pulse">LIVE TRACKING</Badge>
                </CardHeader>
                <CardContent>
                   <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-4">
                        {activeApplications.length === 0 ? (
                          <div className="text-center py-20 text-muted-foreground italic">
                            No active applications currently being processed.
                          </div>
                        ) : (
                          activeApplications.map((app: any) => (
                            <div key={app.id} className="p-4 rounded-xl border bg-card hover:shadow-md transition-all group">
                                   <div className="flex items-start justify-between">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <h3 className="font-bold text-foreground group-hover:text-accent transition-colors">{app.schemeName}</h3>
                                          <Badge variant="secondary" className="text-[10px] h-4">ID: {app.id.slice(0,6)}</Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                           <span className="flex items-center gap-1 font-medium"><User className="h-3 w-3" /> Citizen: {app.userId.slice(0,8)}</span>
                                           <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Stage Active For: {Math.floor((Date.now() - new Date(app.updatedAt).getTime()) / (1000 * 60 * 60 * 24))} Days</span>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <Badge className={
                                          app.status === 'in_review' ? 'bg-info/10 text-info' : 
                                          app.status === 'submitted' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                                        }>
                                          {app.status.replace('_', ' ').toUpperCase()}
                                        </Badge>
                                        {app.paymentStatus === 'paid' && (
                                          <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-success font-bold uppercase">
                                            <CheckCircle2 className="h-3 w-3" /> Priority Assisted
                                          </div>
                                        )}
                                      </div>
                                   </div>
                               <div className="mt-4 flex items-center justify-between">
                                  <div className="w-2/3 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-accent rounded-full transition-all duration-1000" 
                                      style={{ width: app.status === 'in_review' ? '65%' : '90%' }} 
                                    />
                                  </div>
                                  <Link to={`/admin/applications/${app.id}`} className="text-xs text-accent font-medium flex items-center gap-1 hover:underline">
                                    Full Details <ExternalLink className="h-3 w-3" />
                                  </Link>
                               </div>
                            </div>
                          ))
                        )}
                      </div>
                   </ScrollArea>
                </CardContent>
             </Card>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-success/5 border-success/20">
                   <CardContent className="p-4 flex gap-4 items-center">
                     <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center text-success">
                       <CheckCircle2 className="h-6 w-6" />
                     </div>
                     <div>
                       <p className="text-xs text-success/70 font-bold uppercase tracking-wider">Reliability Score</p>
                       <p className="text-lg font-bold text-success">Exemplary Performance</p>
                     </div>
                   </CardContent>
                </Card>
                <Card className="bg-info/5 border-info/20">
                   <CardContent className="p-4 flex gap-4 items-center">
                     <div className="h-10 w-10 rounded-full bg-info/20 flex items-center justify-center text-info">
                       <Clock className="h-6 w-6" />
                     </div>
                     <div>
                       <p className="text-xs text-info/70 font-bold uppercase tracking-wider">Typical Turnaround</p>
                       <p className="text-lg font-bold text-info">2.4 Days / Application</p>
                     </div>
                   </CardContent>
                </Card>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentHistory;
