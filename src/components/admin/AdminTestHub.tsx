import { useState, useMemo, useTransition } from "react";
import {
  INITIAL_SYSTEM_TESTS,
  SystemTestCase,
  TestCategory,
  TestStatus,
  executeSingleTest,
} from "@/services/testing/systemTestEngine";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  Copy,
  Check,
  ShieldCheck,
  FileCode,
  Zap,
  Terminal,
  Activity,
  Layers,
  Wrench,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export function AdminTestHub() {
  const [tests, setTests] = useState<SystemTestCase[]>(INITIAL_SYSTEM_TESTS);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedReport, setCopiedReport] = useState(false);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  // Estatísticas calculadas
  const stats = useMemo(() => {
    const total = tests.length;
    const passed = tests.filter((t) => t.status === "passed").length;
    const failed = tests.filter((t) => t.status === "failed").length;
    const warning = tests.filter((t) => t.status === "warning").length;
    const idle = tests.filter((t) => t.status === "idle").length;
    const totalDuration = tests.reduce((acc, t) => acc + (t.durationMs || 0), 0);
    const progressPercent = total > 0 ? Math.round(((total - idle) / total) * 100) : 0;

    return { total, passed, failed, warning, idle, totalDuration, progressPercent };
  }, [tests]);

  // Lista de categorias distintas
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    tests.forEach((t) => map.set(t.category, t.categoryLabel));
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [tests]);

  // Filtros aplicados
  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      const matchCat = selectedCategory === "all" || t.category === selectedCategory;
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      const matchSearch =
        !searchQuery ||
        t.buttonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.actionDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.componentPath.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.functionName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchStatus && matchSearch;
    });
  }, [tests, selectedCategory, statusFilter, searchQuery]);

  // Executar teste individual
  const runTest = async (testId: string) => {
    setRunningTestId(testId);
    setTests((prev) =>
      prev.map((t) => (t.id === testId ? { ...t, status: "running" as TestStatus } : t))
    );

    const result = await executeSingleTest(testId);

    setTests((prev) =>
      prev.map((t) => (t.id === testId ? { ...t, ...result } : t))
    );
    setRunningTestId(null);

    if (result.status === "passed") {
      toast.success(`Teste aprovado: ${testId}`);
    } else if (result.status === "failed") {
      toast.error(`Falha no teste: ${testId} - ${result.errorMessage}`);
    }
  };

  // Executar todos os testes em sequência
  const runAllTests = async () => {
    setIsRunningAll(true);
    toast.info("Iniciando bateria completa de testes em todos os botões...");

    for (const test of tests) {
      setRunningTestId(test.id);
      setTests((prev) =>
        prev.map((t) => (t.id === test.id ? { ...t, status: "running" as TestStatus } : t))
      );

      // Pequeno delay para efeito visual agradável de varredura
      await new Promise((r) => setTimeout(r, 60));
      const result = await executeSingleTest(test.id);

      setTests((prev) =>
        prev.map((t) => (t.id === test.id ? { ...t, ...result } : t))
      );
    }

    setRunningTestId(null);
    setIsRunningAll(false);
    toast.success("Bateria de testes concluída!");
  };

  // Resetar todos os testes
  const resetTests = () => {
    setTests(INITIAL_SYSTEM_TESTS);
    toast.info("Resultados de testes resetados.");
  };

  // Copiar relatório em Markdown para correção
  const copyReportMarkdown = () => {
    const failedTests = tests.filter((t) => t.status === "failed");
    const passedTests = tests.filter((t) => t.status === "passed");

    let md = `# 🧪 Relatório de Auditoria e Testes de Botões · NavalDocs Pro\n`;
    md += `**Data/Hora:** ${new Date().toLocaleString("pt-BR")}\n`;
    md += `**Total Testado:** ${stats.total} botões e funções\n`;
    md += `**Aprovados:** ${stats.passed} | **Falhas:** ${stats.failed} | **Duração Total:** ${stats.totalDuration}ms\n\n`;

    if (failedTests.length > 0) {
      md += `## ❌ Botões com Falha que Precisam de Correção:\n`;
      failedTests.forEach((t) => {
        md += `### [${t.buttonName}] (${t.componentPath})\n`;
        md += `- **Função:** \`${t.functionName}\`\n`;
        md += `- **Erro:** ${t.errorMessage}\n`;
        md += `- **Sugestão de Correção:** ${t.suggestedFix}\n\n`;
      });
    } else {
      md += `## ✅ Todos os ${passedTests.length} botões e funções testadas foram 100% aprovados!\n\n`;
    }

    navigator.clipboard.writeText(md);
    setCopiedReport(true);
    toast.success("Relatório de diagnóstico copiado em formato Markdown!");
    setTimeout(() => setCopiedReport(false), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Cabeçalho de Destaque */}
      <div className="bg-gradient-to-r from-[#020D1D] via-[#0A2540] to-[#020D1D] rounded-2xl p-6 sm:p-8 text-white border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Terminal className="h-48 w-48 text-primary" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 text-xs font-bold uppercase tracking-wider">
              <Zap className="h-3.5 w-3.5 animate-pulse" />
              Automated Button & Function Stress Hub
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Central de Testes de Botões & Funções
            </h2>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Módulo interativo de varredura ponta a ponta. Executa, estressa e diagnostica
              cada botão, formulário, validação fiscal, compilação de PDFs, OCR e Edge Functions do NavalDocs Pro.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={runAllTests}
              disabled={isRunningAll}
              className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/30 h-11 px-6 rounded-xl flex items-center gap-2"
            >
              <Play className={`h-4 w-4 ${isRunningAll ? "animate-spin" : ""}`} />
              {isRunningAll ? "Testando Sistema..." : "Executar Todos os Testes"}
            </Button>

            <Button
              variant="outline"
              onClick={copyReportMarkdown}
              className="bg-white/5 border-white/20 hover:bg-white/10 text-white h-11 px-4 rounded-xl flex items-center gap-2"
            >
              {copiedReport ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {copiedReport ? "Copiado!" : "Copiar Relatório"}
            </Button>

            <Button
              variant="ghost"
              onClick={resetTests}
              disabled={isRunningAll}
              className="text-slate-400 hover:text-white hover:bg-white/5 h-11 px-3 rounded-xl"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Barra de Progresso Global */}
        <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
          <div className="flex justify-between items-center text-xs font-medium text-slate-300">
            <span>Progresso da Bateria de Testes</span>
            <span className="font-mono text-primary font-bold">{stats.progressPercent}% Concluído</span>
          </div>
          <Progress value={stats.progressPercent} className="h-2 bg-white/10" />
        </div>
      </div>

      {/* Cards de Métricas em Tempo Real */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total de Ações</span>
            <Layers className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.total}</p>
          <span className="text-[11px] text-slate-400">Botões e funções mapeadas</span>
        </Card>

        <Card className="bg-emerald-50/50 border-emerald-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Aprovados</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">{stats.passed}</p>
          <span className="text-[11px] text-emerald-600">100% operacionais</span>
        </Card>

        <Card className="bg-rose-50/50 border-rose-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Falhas</span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-700 mt-2">{stats.failed}</p>
          <span className="text-[11px] text-rose-600">Requerem correção</span>
        </Card>

        <Card className="bg-amber-50/50 border-amber-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pendentes</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">{stats.idle}</p>
          <span className="text-[11px] text-amber-600">Não executados ainda</span>
        </Card>

        <Card className="bg-slate-50 border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Latência Média</span>
            <Activity className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {stats.passed > 0 ? Math.round(stats.totalDuration / (stats.passed + stats.failed)) : 0}ms
          </p>
          <span className="text-[11px] text-slate-400">Tempo de resposta</span>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="p-4 bg-white border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row items-center gap-4">
          <div className="relative flex-grow w-full lg:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por botão, função, componente ou arquivo..."
              className="pl-9 h-10 rounded-xl"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
            >
              <option value="all">Todos os Status</option>
              <option value="passed">✅ Aprovados</option>
              <option value="failed">❌ Falhas</option>
              <option value="idle">⚪ Pendentes</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Lista de Casos de Teste */}
      <div className="space-y-3">
        {filteredTests.map((test) => {
          const isExpanded = expandedTestId === test.id;
          const isThisRunning = runningTestId === test.id;

          return (
            <Card
              key={test.id}
              className={`transition-all border ${
                test.status === "failed"
                  ? "border-rose-300 bg-rose-50/20"
                  : test.status === "passed"
                  ? "border-emerald-200 hover:border-emerald-300"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-grow">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-slate-100">
                      {test.categoryLabel}
                    </Badge>
                    <span className="text-xs font-mono text-slate-400">#{test.id}</span>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    {test.buttonName}
                  </h4>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {test.actionDescription}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 font-mono pt-1">
                    <span className="flex items-center gap-1">
                      <FileCode className="h-3 w-3 text-slate-400" />
                      {test.componentPath}
                    </span>
                    <span className="flex items-center gap-1">
                      <Terminal className="h-3 w-3 text-slate-400" />
                      {test.functionName}
                    </span>
                    {test.durationMs > 0 && (
                      <span className="flex items-center gap-1 font-bold text-slate-700">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {test.durationMs}ms
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  {/* Status Badge */}
                  {test.status === "passed" && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Aprovado
                    </Badge>
                  )}

                  {test.status === "failed" && (
                    <Badge className="bg-rose-100 text-rose-800 border-rose-200 flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5 text-rose-600" />
                      Falhou
                    </Badge>
                  )}

                  {test.status === "running" && (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1 animate-pulse">
                      <Activity className="h-3.5 w-3.5 text-blue-600 animate-spin" />
                      Testando...
                    </Badge>
                  )}

                  {test.status === "idle" && (
                    <Badge variant="outline" className="text-slate-500 border-slate-300">
                      Não Executado
                    </Badge>
                  )}

                  {/* Botão de Ação Individual */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runTest(test.id)}
                    disabled={isThisRunning || isRunningAll}
                    className="h-8 px-3 rounded-lg text-xs font-semibold"
                  >
                    <Play className={`h-3 w-3 mr-1 ${isThisRunning ? "animate-spin" : ""}`} />
                    {isThisRunning ? "Testando" : "Testar"}
                  </Button>

                  {/* Botão de Detalhes */}
                  {(test.errorMessage || test.suggestedFix) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                      className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      {isExpanded ? "Ocultar Erro" : "Ver Detalhes do Erro"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Detalhes de Erro & Sugestão Técnica de Correção */}
              {isExpanded && test.errorMessage && (
                <div className="border-t border-rose-200 bg-rose-50/50 p-4 rounded-b-xl space-y-3 animate-in fade-in">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-rose-800 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                      Erro Encontrado na Execução:
                    </span>
                    <p className="text-xs font-mono text-rose-900 bg-white/80 p-2.5 rounded border border-rose-200 break-all">
                      {test.errorMessage}
                    </p>
                  </div>

                  {test.suggestedFix && (
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <Wrench className="h-3.5 w-3.5 text-primary" />
                        Sugestão Técnica de Correção:
                      </span>
                      <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 leading-relaxed">
                        {test.suggestedFix}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}

        {filteredTests.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500">
            <Search className="h-8 w-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold">Nenhum botão ou teste encontrado para este filtro.</p>
          </div>
        )}
      </div>
    </div>
  );
}
