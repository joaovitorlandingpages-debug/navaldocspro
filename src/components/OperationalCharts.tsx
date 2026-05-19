import { Card } from "@/components/ui/card";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';

const data = [
  { name: 'Seg', procs: 12, auto: 8 },
  { name: 'Ter', procs: 19, auto: 15 },
  { name: 'Qua', procs: 15, auto: 12 },
  { name: 'Qui', procs: 22, auto: 18 },
  { name: 'Sex', procs: 30, auto: 25 },
  { name: 'Sáb', procs: 10, auto: 8 },
  { name: 'Dom', procs: 5, auto: 4 },
];

const pieData = [
  { name: 'Em Aberto', value: 40, color: '#0F172A' },
  { name: 'Aguardando Protocolo', value: 30, color: '#0EA5E9' },
  { name: 'Concluído', value: 30, color: '#10B981' },
];

export function OperationalCharts() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Produtividade Temporal */}
      <Card className="p-6 border-none shadow-sm rounded-[2.5rem] bg-white">
        <div className="mb-6">
          <h4 className="text-xs font-black uppercase tracking-widest text-navy">Fluxo de Produtividade</h4>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Processos vs Automações</p>
        </div>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorProcs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0F172A" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#0F172A" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAuto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fontWeight: 'bold', fill: '#94A3B8'}} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fontWeight: 'bold', fill: '#94A3B8'}} 
              />
              <Tooltip 
                contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
              />
              <Area type="monotone" dataKey="procs" stroke="#0F172A" strokeWidth={3} fillOpacity={1} fill="url(#colorProcs)" />
              <Area type="monotone" dataKey="auto" stroke="#0EA5E9" strokeWidth={3} fillOpacity={1} fill="url(#colorAuto)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Distribuição de Status */}
      <Card className="p-6 border-none shadow-sm rounded-[2.5rem] bg-white">
        <div className="mb-6">
          <h4 className="text-xs font-black uppercase tracking-widest text-navy">Distribuição Operacional</h4>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Status por Processo</p>
        </div>
        <div className="h-[250px] w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={8}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute flex flex-col items-center justify-center">
             <span className="text-2xl font-black text-navy">100%</span>
             <span className="text-[8px] font-black uppercase text-slate-400">Atividade</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
           {pieData.map((item, idx) => (
             <div key={idx} className="flex flex-col items-center">
                <div className="h-1.5 w-8 rounded-full mb-1" style={{backgroundColor: item.color}}></div>
                <span className="text-[8px] font-bold text-slate-500 uppercase text-center leading-tight">{item.name}</span>
             </div>
           ))}
        </div>
      </Card>
    </div>
  );
}
