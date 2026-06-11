import { Link, useNavigate } from "react-router-dom";
import { useSavedSchemes, useSaveScheme } from "@/hooks/useSchemes";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Building2, Search, Trash2, ArrowRight, Activity } from "lucide-react";
import { motion } from "framer-motion";

export default function SavedSchemes() {
  const { data, isLoading } = useSavedSchemes();
  const { mutate: toggleSave } = useSaveScheme();
  const navigate = useNavigate();

  const schemes = data || [];

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-muted/30">
        <Activity className="h-10 w-10 text-accent animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-slate-50 pb-20">
      <header className="bg-[#020617] text-white pt-16 pb-12 px-4 shadow-xl border-b border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent pointer-events-none" />
        <div className="container mx-auto max-w-5xl relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Bookmark className="h-6 w-6 text-blue-400" />
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-400/20 px-3 py-1 uppercase tracking-[0.2em] text-[10px] font-black backdrop-blur-sm">
              Bookmarks
            </Badge>
          </div>
          <h1 className="font-heading font-black text-3xl md:text-5xl tracking-tight mb-3">
            Saved <span className="text-blue-400">Schemes</span>
          </h1>
          <p className="text-slate-400 max-w-xl leading-relaxed">
            Review and apply for the government schemes you've bookmarked for later.
          </p>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 -mt-6">
        {schemes.length === 0 ? (
          <Card className="shadow-2xl border-white/10 bg-card p-12 text-center flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="h-24 w-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
              <Bookmark className="h-10 w-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No saved schemes yet</h2>
            <p className="text-muted-foreground max-w-sm mb-8">
              Save schemes to review them later. Start exploring the portal to find schemes you're eligible for.
            </p>
            <Button size="lg" onClick={() => navigate('/discover')} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Search className="h-4 w-4" /> Browse Schemes
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schemes.map((scheme: any, idx: number) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: idx * 0.1 }}
                key={scheme.id}
              >
                <Card className="h-full flex flex-col hover:shadow-xl transition-all duration-300 border-0 ring-1 ring-slate-200">
                  <CardHeader className="bg-white pb-4 border-b border-slate-100 flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 uppercase text-[10px] tracking-wider font-bold">
                        {scheme.category || 'General'}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => toggleSave(scheme.id)}
                        className="text-red-400 hover:text-red-500 hover:bg-red-50 -mt-2 -mr-2"
                        title="Remove Bookmark"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardTitle className="text-xl font-bold line-clamp-2 leading-tight mb-2">
                      {scheme.title}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <Building2 className="h-3.5 w-3.5" />
                      <span className="truncate">{scheme.ministry || scheme.department}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 flex-grow-0">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Key Benefits</p>
                    <p className="text-sm font-medium text-slate-700 line-clamp-3">
                      {scheme.benefits || scheme.description}
                    </p>
                  </CardContent>
                  <CardFooter className="p-5 pt-0 mt-auto flex flex-col gap-2">
                    <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 group">
                      <Link to={`/apply/${scheme.id}`}>Apply Now <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" /></Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link to={`/schemes/${scheme.id}`}>View Details</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
