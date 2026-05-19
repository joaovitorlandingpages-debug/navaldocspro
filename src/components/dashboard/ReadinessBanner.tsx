import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export function ReadinessBanner() {
  const { data: scores, isLoading } = useQuery({
    queryKey: ["system-readiness-scores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_readiness_scores")
        .select("*")
        .order("category");
      if (error) throw error;
      return data;
    }
  });

  const averageScore = scores 
    ? Math.round(scores.reduce((acc: number, curr: any) => acc + curr.score, 0) / scores.length) 
    : 0;

  if (isLoading) return <Skeleton className="h-40 w-full rounded-[2.5rem]" />;

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-8 animate-in fade-in duration-700">
       <div className="relative h-32 w-32 flex-shrink-0">
          <svg className="h-full w-full" viewBox="0 0 100 100">
             <circle className="text-slate-100" strokeWidth="8" stroke="currentColor" fill="transparent" r="42" cx="50" cy="50" />
             <circle 
                className="text-primary transition-all duration-1000 ease-out" 
                strokeWidth="8" 
                strokeDasharray="264" 
                strokeDashoffset={264 - (264 * averageScore / 100)} 
                strokeLinecap="round" 
                stroke="currentColor" 
                fill="transparent" 
                r="42" 
                cx="50" 
                cy="50" 
             />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
             <span className="text-3xl font-black text-navy">{averageScore}</span>
             <span className="text-[8px] font-black uppercase text-slate-400">Readiness</span>
          </div>
       </div>
       <div className="flex-grow grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
          {scores?.map((s: any) => (
             <div key={s.id} className="text-center group">
                <p className="text-[8px] font-black uppercase text-slate-400 mb-2 truncate group-hover:text-primary transition-colors">{s.category}</p>
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                   <div 
                      className={`h-full transition-all duration-1000 ${s.score > 90 ? 'bg-emerald-500' : s.score > 70 ? 'bg-primary' : 'bg-amber-500'}`} 
                      style={{ width: `${s.score}%` }} 
                   />
                </div>
                <p className="text-[10px] font-black text-navy mt-1">{s.score}%</p>
             </div>
          ))}
       </div>
    </div>
  );
}
