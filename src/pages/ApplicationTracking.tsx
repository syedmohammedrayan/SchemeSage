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
      <div className="min-h-screen flex items-center justify-center bg-[#030712]">
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-5 w-5 text-slate-500 animate-pulse" />
          <p className="text-slate-500 text-sm font-medium animate-pulse tracking-widest uppercase">Loading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 font-sans selection:bg-[#F97316]/20 pb-32">
      <header className="pt-24 pb-16 px-6 border-b border-slate-800/60 relative">
        <div className="container mx-auto max-w-4xl relative z-10">
          <h1 className="text-3xl font-semibold text-slate-100 tracking-tight mb-4">
            Application Tracking
          </h1>
          <p className="text-slate-400 max-w-xl text-sm leading-relaxed">
            Monitor the progress of your government scheme applications in real-time. Whether self-applied or agent-assisted, stay updated at every step.
          </p>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-6 pt-12">
        {activeApps.length === 0 ? (
          <div className="border border-slate-800/60 rounded-xl p-12 text-center flex flex-col items-center justify-center">
            <h2 className="text-lg font-semibold text-slate-300 mb-2">No Active Applications</h2>
            <p className="text-slate-500 text-sm max-w-sm mb-8">
              You haven't submitted any scheme applications yet. Discover schemes you're eligible for and apply today.
            </p>
            <button 
              onClick={() => navigate('/dashboard')} 
              className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-2"
            >
              <Search className="h-4 w-4" /> Browse Schemes
            </button>
          </div>
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
                  <div className="border border-slate-800/60 rounded-xl bg-[#0F172A]/30 overflow-hidden group hover:border-slate-700 transition-colors">
                    <div className="p-6 md:p-8">
                      {/* Header */}
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 border-b border-slate-800/60 pb-8">
                        <div>
                          <div className="flex items-center gap-3 mb-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-widest uppercase bg-slate-800 text-slate-400">
                              ID: {app.trackingId || app.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-widest uppercase ${
                              isAssisted ? 'bg-purple-900/30 text-purple-400 border border-purple-800/50' : 'bg-blue-900/30 text-blue-400 border border-blue-800/50'
                            }`}>
                              {isAssisted ? 'Assisted' : 'Manual'}
                            </span>
                          </div>
                          <h3 className="text-xl font-semibold text-slate-100 group-hover:text-[#F97316] transition-colors">
                            {app.schemeName}
                          </h3>
                        </div>
                        <Link 
                          to={`/tracking/${app.id}`}
                          className="shrink-0 text-sm font-medium text-slate-400 hover:text-white flex items-center gap-2 transition-colors border border-slate-800/60 rounded-lg px-4 py-2 hover:bg-slate-800/50"
                        >
                          View Details <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-6">
                        <div className="flex flex-col gap-1">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Submitted</p>
                          <p className="text-sm font-medium text-slate-300">
                            {new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Status</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium capitalize ${
                              isError ? 'text-red-400' : currentStep === 3 ? 'text-emerald-400' : 'text-[#F97316]'
                            }`}>
                              {app.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Last Updated</p>
                          <p className="text-sm font-medium text-slate-300">
                            {new Date(app.updatedAt || app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>

                        {isAssisted && (
                          <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Agent</p>
                            <p className="text-sm font-medium text-slate-300 flex items-center gap-2">
                              {app.agentDetails ? app.agentDetails.fullName : 'Pending Assignment'}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Tracking Stepper */}
                      <div className="relative mt-12 mb-4 px-2">
                        <div className="absolute top-2 left-6 right-6 h-[2px] bg-slate-800/60 -z-10" />
                        <div 
                          className={`absolute top-2 left-6 h-[2px] transition-all duration-1000 ease-out -z-10 ${isError ? 'bg-red-500' : 'bg-[#F97316]'}`}
                          style={{ width: `calc(${(Math.max(0, currentStep - 1) / (steps.length - 1)) * 100}% - 3rem)` }}
                        />
                        
                        <div className="flex justify-between">
                          {steps.map((step, index) => {
                            const stepNumber = index + 1;
                            const isActive = currentStep >= stepNumber;
                            const isCurrent = currentStep === stepNumber || (currentStep === 3 && stepNumber === 3);
                            const isRejected = isError && stepNumber === 3;
                            
                            let circleColor = "border-slate-800 bg-[#030712] text-slate-600";
                            if (isActive) {
                              if (isRejected) circleColor = "border-red-500 bg-red-500/10 text-red-500";
                              else circleColor = "border-[#F97316] bg-[#F97316]/10 text-[#F97316]";
                            }

                            return (
                              <div key={step.id} className="flex flex-col items-center gap-3">
                                <div className={`h-4 w-4 rounded-full border-[2px] transition-colors duration-500 ${circleColor} ${isCurrent ? 'ring-4 ring-[#F97316]/20' : ''}`} />
                                <span className={`text-[10px] font-semibold tracking-widest uppercase transition-colors duration-300 ${isActive ? (isRejected ? 'text-red-400' : 'text-slate-300') : 'text-slate-600'}`}>
                                  {stepNumber === 3 && isError ? 'Rejected' : stepNumber === 3 && isActive ? 'Approved' : step.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
