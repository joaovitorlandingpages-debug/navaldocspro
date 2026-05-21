import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, Search, Filter, 
  Clock, CheckCircle2, AlertTriangle,
  User, Building, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function AdminSupport() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          profiles(full_name),
          companies(name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const filteredTickets = tickets?.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.companies?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-black text-navy uppercase tracking-tight">Suporte & Tickets</h1>
          <p className="text-slate-500 font-medium">Gestão de chamados, bugs e solicitações de usuários.</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar chamado ou empresa..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-white border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <Button variant="outline" className="h-12 w-12 p-0 rounded-2xl border-slate-100 bg-white">
            <Filter className="h-5 w-5 text-slate-400" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          [1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)
        ) : (
          filteredTickets?.map((ticket) => (
            <Card key={ticket.id} className="border-slate-100 shadow-sm hover:shadow-md transition-all rounded-3xl overflow-hidden group">
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row items-center p-6 gap-6">
                  <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-all">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-lg font-black text-navy uppercase tracking-tight truncate">{ticket.title}</h4>
                      <Badge className={`uppercase text-[9px] font-black tracking-widest ${
                        ticket.priority === 'high' ? 'bg-red-50 text-red-600' :
                        ticket.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {ticket.priority}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                        <Building className="h-3 w-3" /> {ticket.companies?.name}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                        <User className="h-3 w-3" /> {ticket.profiles?.full_name || 'Usuário'}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                        <Clock className="h-3 w-3" /> Criado em {new Date(ticket.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-4 lg:pt-0">
                    <div className="text-right hidden xl:block">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Status</p>
                      <div className="flex items-center gap-2 justify-end">
                        <div className={`h-2 w-2 rounded-full ${ticket.status === 'open' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                        <span className="text-[10px] font-black text-navy uppercase tracking-widest">{ticket.status}</span>
                      </div>
                    </div>
                    <Button size="sm" className="bg-navy text-white rounded-xl font-bold gap-2 text-[10px] uppercase tracking-widest px-6 h-10 shadow-lg shadow-navy/20">
                      Gerenciar <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
