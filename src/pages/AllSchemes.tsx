import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SchemeCard from "@/components/SchemeCard";
import { useSchemes } from "@/hooks/useSchemes";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { Scheme } from "@/data/schemes";

const AllSchemes = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce the search query to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: schemes = [], isLoading: schemesLoading, isFetching } = useSchemes(
    debouncedQuery ? { search: debouncedQuery } : undefined
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Navbar />
      
      <div className="container mx-auto px-6 py-24 max-w-6xl mt-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
            Explore <span className="text-[#F97316]">All Schemes</span>
          </h1>
          <p className="text-[#94A3B8] text-xl leading-relaxed max-w-2xl mx-auto">
            Browse through our comprehensive database of over 1,250+ verified government schemes.
          </p>
        </div>

        <div className="relative max-w-2xl mx-auto mb-12">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8]" />
          <Input 
            placeholder="Search schemes by name, category, or tags..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-12 pr-12 h-14 bg-[#0F172A] border-white/10 text-white rounded-2xl focus:border-[#F97316]/50 transition-colors text-base shadow-xl"
          />
          {isFetching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#F97316] animate-spin" />
          )}
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-300 ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
          {schemesLoading && !schemes.length ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-[#94A3B8]">
              <Loader2 className="h-8 w-8 animate-spin text-[#F97316] mb-4" />
              <p className="text-lg font-medium">Loading schemes...</p>
            </div>
          ) : schemes.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-[#0F172A] rounded-3xl border border-white/5">
              <p className="text-[#94A3B8] text-lg font-medium">No schemes found matching "{debouncedQuery}"</p>
              <button 
                onClick={() => setSearchQuery("")} 
                className="mt-4 text-[#F97316] font-bold hover:underline"
              >
                Clear Search
              </button>
            </div>
          ) : (
            schemes.map((scheme: Scheme) => (
              <SchemeCard 
                key={scheme.id} 
                scheme={scheme} 
              />
            ))
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AllSchemes;
