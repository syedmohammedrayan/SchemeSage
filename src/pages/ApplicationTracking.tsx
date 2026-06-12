import { Link, useNavigate } from "react-router-dom";
import { useApplications } from "@/hooks/useApplications";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Activity, CheckCircle, Clock, AlertCircle, Phone, Mail, User, XCircle, FileText, FileSearch, ArrowRight, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

const steps = [
  { id: 'submitted', label: 'Submitted', icon: FileText },
  { id: 'in_review', label: 'In Progress', icon: FileSearch },
  { id: 'decision', label: 'Completed', icon: CheckCircle },
];

export default function ApplicationTracking() {
  const { data: applications = [], isLoading } = useApplications();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Filter out 'saved' applications since tracking is for submitted ones
  const activeApps = applications.filter((app: any) => app.status !== 'saved');

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-10 w-10 text-accent animate-pulse" />
          <p className="text-muted-foreground font-medium animate-pulse">Loading tracking data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-muted/30 pb-20">
      <header className="bg-[#020617] text-white pt-16 pb-12 px-4 shadow-xl border-b border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent pointer-events-none" />
        <div className="container mx-auto max-w-4xl relative z-10">
          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 px-3 py-1 uppercase tracking-[0.2em] text-[10px] font-black mb-4 backdrop-blur-sm">
            Live Tracking
          </Badge>
          <h1 className="font-heading font-black text-3xl md:text-5xl tracking-tight mb-3">
            Application <span className="text-accent">Tracking</span>
          </h1>
          <p className="text-slate-400 max-w-xl leading-relaxed">
            Monitor the progress of your government scheme applications in real-time. Whether self-applied or agent-assisted, stay updated at every step.
          </p>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 -mt-6">
        {activeApps.length === 0 ? (
          <Card className="shadow-2xl border-white/10 bg-card p-12 text-center flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="h-24 w-24 bg-muted rounded-full flex items-center justify-center mb-6">
              <BookOpen className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Active Applications</h2>
            <p className="text-muted-foreground max-w-sm mb-8">
              You haven't submitted any scheme applications yet. Discover schemes you're eligible for and apply today!
            </p>
            <Button size="lg" onClick={() => navigate('/dashboard')} className="gap-2">
              <Search className="h-4 w-4" /> Browse Schemes
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {activeApps.map((app: any, idx: number) => {
              // Status progression logic
              let currentStep = 0;
              let isError = false;
              if (app.status === 'submitted') currentStep = 1;
              if (app.status === 'in_review' || app.status === 'document_pending') currentStep = 2;
              if (app.status === 'approved') currentStep = 3;
              if (app.status === 'rejected') {
                currentStep = 3;
                isError = true;
              }

              const isAssisted = app.type === 'assisted';

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: idx * 0.1 }}
                  key={app.id}
                >
                  <Card className="overflow-hidden shadow-card border-t-4 border-t-accent hover:shadow-xl transition-shadow">
                    <CardHeader className="bg-muted/30 pb-4 border-b">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-2xl font-bold text-slate-900 mb-1">
                            {app.schemeName}
                          </CardTitle>
                          <p className="font-mono text-sm text-slate-500 font-semibold">
                            Application ID: {app.trackingId || app.id.slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                        <Button asChild className="shrink-0">
                          <Link to={`/tracking/${app.id}`}>View Details <ArrowRight className="h-4 w-4 ml-2" /></Link>
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Submitted</p>
                          <p className="text-sm font-medium text-slate-900">
                            {new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Method</p>
                          <div className="flex items-center gap-2">
                            {isAssisted ? <User className="h-4 w-4 text-purple-500" /> : <FileText className="h-4 w-4 text-blue-500" />}
                            <p className={`text-sm font-bold ${isAssisted ? 'text-purple-600' : 'text-blue-600'}`}>
                              {isAssisted ? 'Agent Assisted' : 'Manual Application'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Current Status</p>
                          <Badge variant="outline" className={`capitalize font-bold border-0 px-0 ${
                            isError ? 'text-red-600' : currentStep === 3 ? 'text-green-600' : 'text-accent'
                          }`}>
                            <Activity className="h-3 w-3 mr-1.5 inline" />
                            {app.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Last Updated</p>
                          <p className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {new Date(app.updatedAt || app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                        
                        {isAssisted && (
                          <div className="md:col-span-2 pt-2 mt-2 border-t border-slate-200">
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Assigned Agent</p>
                            <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              {app.agentDetails ? (
                                <>
                                  <User className="h-4 w-4 text-purple-600" /> {app.agentDetails.fullName}
                                </>
                              ) : (
                                <span className="text-slate-500 flex items-center gap-2"><Clock className="h-4 w-4" /> Pending Assignment</span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Tracking Stepper */}
                      <div className="relative mt-4 px-4">
                        <div className="absolute top-5 left-12 right-12 h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${isError ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${(Math.max(0, currentStep - 1) / (steps.length - 1)) * 100}%` }}
                          />
                        </div>
                        
                        <div className="flex justify-between relative z-10">
                          {steps.map((step, index) => {
                            const stepNumber = index + 1;
                            const isActive = currentStep >= stepNumber;
                            const isCurrent = currentStep === stepNumber || (currentStep === 3 && stepNumber === 3);
                            const StepIcon = isError && stepNumber === 3 ? XCircle : isActive ? CheckCircle : step.icon;
                            
                            return (
                              <div key={step.id} className="flex flex-col items-center">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors duration-500 ${
                                  isActive 
                                    ? (isError && stepNumber === 3 ? 'bg-red-500 text-white' : 'bg-green-500 text-white') 
                                    : 'bg-slate-100 text-slate-400'
                                } ${isCurrent ? 'ring-4 ring-green-500/20' : ''}`}>
                                  <StepIcon className="h-5 w-5" />
                                </div>
                                <span className={`text-xs font-bold mt-2 uppercase tracking-wider ${
                                  isActive ? (isError && stepNumber === 3 ? 'text-red-600' : 'text-green-600') : 'text-slate-400'
                                }`}>
                                  {stepNumber === 3 && isError ? 'Rejected' : stepNumber === 3 && isActive ? 'Approved' : step.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
