import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SchemeCard from "@/components/SchemeCard";
import { useSchemes } from "@/hooks/useSchemes";
import { Search, FileCheck, CheckCircle, ArrowRight, Users, Building2, TrendingUp } from "lucide-react";

const steps = [
  { icon: Users, title: "Enter Details", desc: "Fill in your basic details like age, income, occupation and state to help us match schemes." },
  { icon: Search, title: "Find Schemes", desc: "Our AI matches your profile with eligible government schemes instantly." },
  { icon: FileCheck, title: "Apply Easily", desc: "Get documents checklist, eligibility details and direct application links." },
];

const stats = [
  { value: "500+", label: "Schemes Listed" },
  { value: "28", label: "States Covered" },
  { value: "1L+", label: "Citizens Helped" },
  { value: "50+", label: "Ministries" },
];

const Landing = () => {
  const { data: schemes = [], isLoading } = useSchemes();
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-hero text-primary-foreground py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, hsl(24 90% 50% / 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(200 80% 50% / 0.2) 0%, transparent 50%)" }} />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-heading font-extrabold text-4xl md:text-5xl lg:text-6xl leading-tight mb-6">
              Discover Government Schemes{" "}
              <span className="text-accent">You Deserve</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              AI-powered platform that matches your profile with eligible welfare schemes from central and state governments. Simple, fast, and free.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/discover">
                <Button variant="hero" size="xl">
                  Find Your Schemes <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <a href="#schemes">
                <Button variant="hero-outline" size="xl">
                  Explore Schemes
                </Button>
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-3xl mx-auto">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-heading font-extrabold text-3xl text-accent">{s.value}</div>
                <div className="text-sm text-primary-foreground/60 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground">How It Works</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">Three simple steps to find schemes you're eligible for</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, i) => (
              <div key={step.title} className="text-center group">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mx-auto mb-4 group-hover:bg-accent group-hover:text-accent-foreground transition-colors duration-300">
                  <step.icon className="h-7 w-7" />
                </div>
                <div className="text-xs font-bold text-accent mb-2">STEP {i + 1}</div>
                <h3 className="font-heading font-bold text-lg text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Schemes */}
      <section id="schemes" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="font-heading font-bold text-3xl text-foreground">Popular Schemes</h2>
              <p className="text-muted-foreground mt-1">Most viewed government welfare schemes</p>
            </div>
            <Link to="/discover">
              <Button variant="outline" className="hidden md:flex">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <p className="text-muted-foreground text-center col-span-full">Loading schemes...</p>
            ) : schemes.length === 0 ? (
              <p className="text-muted-foreground text-center col-span-full">No schemes available yet.</p>
            ) : (
              schemes.slice(0, 6).map((scheme: any) => (
                <SchemeCard key={scheme.id} scheme={scheme} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <Building2 className="h-12 w-12 text-accent mx-auto mb-4" />
          <h2 className="font-heading font-bold text-3xl md:text-4xl mb-4">
            Don't Miss Schemes You're Eligible For
          </h2>
          <p className="text-primary-foreground/70 max-w-lg mx-auto mb-8">
            Join thousands of citizens who have discovered welfare benefits they never knew existed.
          </p>
          <Link to="/discover">
            <Button variant="hero" size="xl">
              Explore Now <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Landing;
