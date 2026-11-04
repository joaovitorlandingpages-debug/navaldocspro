import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Edit3,
  CheckCircle2,
  ShieldCheck,
  Ship,
  QrCode,
  X,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { buildBrandedDocumentPdf } from "@/services/brandedPdfBuilder";

export interface OfficialPreviewDocInfo {
  id?: string;
  name: string;
  serviceName?: string;
  officialSource?: string;
  jurisdiction?: string;
  documentType?: string;
  signersRole?: string;
  legalPurpose?: string;
  contentTemplate?: string;
  templates?: Array<{ name: string; templateCode: string; status?: string }>;
}

interface OfficialDocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentInfo: OfficialPreviewDocInfo | null;
}

// Cenários de simulação realistas para conferência do Engenheiro Naval
type ScenarioId = "lancha_esporte" | "moto_aquatica" | "barco_comercial" | "placeholders";

interface ScenarioData {
  id: ScenarioId;
  label: string;
  icon: string;
  client: {
    name: string;
    doc: string;
    rg: string;
    phone: string;
    email: string;
    address: string;
    cityState: string;
    cep: string;
  };
  vessel: {
    name: string;
    registration: string;
    type: string;
    activity: string;
    navigationArea: string;
    hullMaterial: string;
    hullId: string;
    year: string;
    builder: string;
    length: string;
    boca: string;
    pontal: string;
    calado: string;
    grossTonnage: string;
    capacity: string;
    engines: {
      brand: string;
      model: string;
      serial: string;
      power: string;
      fuel: string;
      count: string;
    };
  };
  engineer: {
    name: string;
    crea: string;
    art: string;
  };
}

const SCENARIOS: Record<ScenarioId, ScenarioData> = {
  lancha_esporte: {
    id: "lancha_esporte",
    label: "Lancha Esporte & Recreio (Coral 26ft · Mercury 250 HP)",
    icon: "🚤",
    client: {
      name: "Dr. Carlos Eduardo de Alencar",
      doc: "348.912.871-00",
      rg: "12.847.912-4 SSP/RJ",
      phone: "(21) 98844-3211",
      email: "carlos.alencar@marina-exemplo.com.br",
      address: "Av. Pref. Silvio Picanço, 1420, Apto 802 - Charitas",
      cityState: "Niterói / RJ",
      cep: "24370-001",
    },
    vessel: {
      name: "MAR AZUL IV",
      registration: "381P2023004812",
      type: "Lancha / Embarcação de Esporte e Recreio (E&R)",
      activity: "Esporte e Recreio - Náutica de Lazer",
      navigationArea: "Mar Aberto - Costeira (até 20 milhas)",
      hullMaterial: "Fibra de Vidro (PRFV)",
      hullId: "BR-CRL26048B323",
      year: "2023",
      builder: "Estaleiro Coral Yachts do Brasil Ltda",
      length: "8,20 m (26,9 pés)",
      boca: "2,65 m",
      pontal: "1,25 m",
      calado: "0,55 m",
      grossTonnage: "4,20 AB",
      capacity: "1 + 9 (10 pessoas a bordo)",
      engines: {
        brand: "MERCURY MARINE",
        model: "Verado 250 V8 FourStroke",
        serial: "2B789412",
        power: "250 HP (186,4 kW)",
        fuel: "Gasolina Náutica",
        count: "01 (Motor de Popa)",
      },
    },
    engineer: {
      name: "Eng. Naval Marcos Vinicius Bastos",
      crea: "CREA-RJ 201814982/D",
      art: "ART/CONFEA nº 2026110488219",
    },
  },
  moto_aquatica: {
    id: "moto_aquatica",
    label: "Moto Aquática / Jet Ski (Sea-Doo GTX 300 · Rotax)",
    icon: "🌊",
    client: {
      name: "Mariana Siqueira Fontes",
      doc: "419.823.107-55",
      rg: "24.912.003-8 DETRAN/RJ",
      phone: "(21) 99122-8877",
      email: "mariana.fontes@jetski-club.com",
      address: "Estrada da Barra da Tijuca, 500, Bloco 2 - Barra",
      cityState: "Rio de Janeiro / RJ",
      cep: "22611-000",
    },
    vessel: {
      name: "SEA WARRIOR",
      registration: "381M2024001920",
      type: "Moto Aquática (MTA / Jet Ski)",
      activity: "Esporte e Recreio",
      navigationArea: "Navegação Interior / Áreas Abrigadas",
      hullMaterial: "Polytec / PRFV Reforçado",
      hullId: "CA-YDV38910H324",
      year: "2024",
      builder: "BRP Bombardier Recreational Products Inc.",
      length: "3,45 m",
      boca: "1,25 m",
      pontal: "0,80 m",
      calado: "0,30 m",
      grossTonnage: "0,85 AB",
      capacity: "1 + 2 (3 pessoas)",
      engines: {
        brand: "ROTAX / BRP",
        model: "1630 ACE - 300 Supercharged",
        serial: "M1630A90841",
        power: "300 HP (217 kW)",
        fuel: "Gasolina Premium",
        count: "01 (Hidrojato)",
      },
    },
    engineer: {
      name: "Eng. Mecânico/Naval Douglas M. Vieira",
      crea: "CREA-SP 506941289/D",
      art: "ART nº 20260401889",
    },
  },
  barco_comercial: {
    id: "barco_comercial",
    label: "Embarcação Comercial / Turismo (Catamarã 42ft · Parelha Diesel)",
    icon: "🚢",
    client: {
      name: "Mar Azul Turismo & Navegação Náutica Ltda",
      doc: "28.491.802/0001-94",
      rg: "Insc. Estadual: 87.412.091",
      phone: "(24) 3365-1020",
      email: "contato@marazulturismo.com.br",
      address: "Cais dos Pescadores, s/n - Centro Histórico",
      cityState: "Paraty / RJ",
      cep: "23970-000",
    },
    vessel: {
      name: "ESTRELA DE PARATY",
      registration: "382C2021000844",
      type: "Catamarã de Passageiros / Turismo Náutico",
      activity: "Comercial de Passageiros / Turismo",
      navigationArea: "Mar Aberto - Costeira e Baías Abrigadas",
      hullMaterial: "Alumínio Naval 5083-H116",
      hullId: "BR-PAR42011K121",
      year: "2021",
      builder: "Estaleiro Alunaval Ilha Grande Ltda",
      length: "12,80 m (42 pés)",
      boca: "4,90 m",
      pontal: "1,80 m",
      calado: "0,95 m",
      grossTonnage: "19,80 AB",
      capacity: "2 tripulantes + 48 passageiros (50 pessoas)",
      engines: {
        brand: "VOLVO PENTA",
        model: "D4-300 Common Rail",
        serial: "VP20219401 / VP20219402",
        power: "2x 300 HP (600 HP Total)",
        fuel: "Óleo Diesel Marítimo",
        count: "02 (Parelha Centro Linha de Eixo)",
      },
    },
    engineer: {
      name: "Eng. Naval e Oceânico Renato Saldanha",
      crea: "CREA-RJ 199920141/D",
      art: "ART nº 20260098412",
    },
  },
  placeholders: {
    id: "placeholders",
    label: "Modo Variáveis Estruturais (Tags {{cliente.*}} / {{embarcacao.*}})",
    icon: "📋",
    client: {
      name: "{{cliente.nome}}",
      doc: "{{cliente.cpf_cnpj}}",
      rg: "{{cliente.rg}}",
      phone: "{{cliente.telefone}}",
      email: "{{cliente.email}}",
      address: "{{cliente.endereco_completo}}",
      cityState: "{{cliente.cidade_uf}}",
      cep: "{{cliente.cep}}",
    },
    vessel: {
      name: "{{embarcacao.nome}}",
      registration: "{{embarcacao.numero_inscricao}}",
      type: "{{embarcacao.tipo}}",
      activity: "{{embarcacao.atividade}}",
      navigationArea: "{{embarcacao.area_navegacao}}",
      hullMaterial: "{{embarcacao.material_casco}}",
      hullId: "{{embarcacao.numero_casco_hin}}",
      year: "{{embarcacao.ano_construcao}}",
      builder: "{{embarcacao.estaleiro_construtor}}",
      length: "{{embarcacao.comprimento_total}}",
      boca: "{{embarcacao.boca_moldada}}",
      pontal: "{{embarcacao.pontal_moldado}}",
      calado: "{{embarcacao.calado_maximo}}",
      grossTonnage: "{{embarcacao.arqueacao_bruta}}",
      capacity: "{{embarcacao.lotacao_passageiros}}",
      engines: {
        brand: "{{motor.marca}}",
        model: "{{motor.modelo}}",
        serial: "{{motor.numero_serie}}",
        power: "{{motor.potencia_hp}}",
        fuel: "{{motor.combustivel}}",
        count: "{{motor.quantidade}}",
      },
    },
    engineer: {
      name: "{{engenheiro.nome_responsavel}}",
      crea: "{{engenheiro.crea_numero}}",
      art: "{{engenheiro.art_numero}}",
    },
  },
};

export function OfficialDocumentPreviewModal({
  isOpen,
  onClose,
  documentInfo,
}: OfficialDocumentPreviewModalProps) {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioId>("lancha_esporte");
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [customNotes, setCustomNotes] = useState("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const scenario = SCENARIOS[selectedScenario];

  // Documentos/templates associados
  const templatesList = useMemo(() => {
    if (documentInfo?.templates && documentInfo.templates.length > 0) {
      return documentInfo.templates;
    }
    return [
      {
        name: documentInfo?.name || "Requerimento Oficial Padronizado DPC",
        templateCode: "DPC_REQ_OFICIAL_01",
        status: "ready",
      },
    ];
  }, [documentInfo]);

  const currentTemplate = templatesList[selectedTemplateIndex] || templatesList[0];

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(150, Math.max(50, prev + delta)));
  };

  const handlePrint = () => {
    toast.info("Preparando documento para impressão A4...");
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    const printContent = document.getElementById("official-a4-sheet")?.innerHTML || "";
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${documentInfo?.name || "Documento Oficial Marinha"} - NavalDocs Pro</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 0; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: bold; }
            .no-print { display: none !important; }
            .header-emblem { text-align: center; margin-bottom: 15px; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .border-box { border: 1px solid #0f172a; padding: 8px; margin-bottom: 10px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    const toastId = toast.loading("Gerando PDF com certificação oficial DPC...");
    try {
      const docTitle = currentTemplate?.name || documentInfo?.name || "Requerimento_Oficial";
      const cleanContent = `
        DOCUMENTO OFICIAL DA MARINHA DO BRASIL
        DIRETORIA DE PORTOS E COSTAS (DPC)
        
        ${docTitle.toUpperCase()}
        Base Legal: ${documentInfo?.officialSource || "NORMAM-211/DPC"}
        
        REQUERENTE / TITULAR:
        Nome: ${scenario.client.name}
        CPF/CNPJ: ${scenario.client.doc}
        RG: ${scenario.client.rg}
        Endereço: ${scenario.client.address} - ${scenario.client.cityState}
        
        DADOS DA EMBARCAÇÃO:
        Nome: ${scenario.vessel.name}
        Nº de Inscrição: ${scenario.vessel.registration}
        Classificação: ${scenario.vessel.type}
        Comprimento: ${scenario.vessel.length} | Boca: ${scenario.vessel.boca} | Pontal: ${scenario.vessel.pontal}
        Arqueação Bruta: ${scenario.vessel.grossTonnage} | Lotação: ${scenario.vessel.capacity}
        Casco/HIN: ${scenario.vessel.hullId} | Ano: ${scenario.vessel.year}
        
        PROPULSÃO E MOTORES:
        Motor: ${scenario.vessel.engines.brand} ${scenario.vessel.engines.model}
        Potência: ${scenario.vessel.engines.power} | Série: ${scenario.vessel.engines.serial}
        Quantidade: ${scenario.vessel.engines.count} | Combustível: ${scenario.vessel.engines.fuel}
        
        DECLARAÇÃO LEGAL:
        Declaro, sob as penas do Artigo 299 do Código Penal Brasileiro (Falsidade Ideológica), que as informações prestadas são a expressão da verdade.
        
        RESPONSABILIDADE TÉCNICA / HOMOLOGAÇÃO:
        ${scenario.engineer.name} - ${scenario.engineer.crea}
        ${scenario.engineer.art}
      `;

      const result = await buildBrandedDocumentPdf({
        docName: docTitle,
        content: cleanContent,
        branding: null,
        signerName: scenario.client.name,
        signerRole: documentInfo?.signersRole || "Proprietário / Requerente Legal",
        isOfficialForm: true,
      });

      const blob = new Blob([result.bytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Amostra_Oficial_${docTitle.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.dismiss(toastId);
      toast.success("PDF oficial de homologação baixado com sucesso!");
    } catch (err: any) {
      console.error("[previewModal] Erro ao gerar PDF:", err);
      toast.dismiss(toastId);
      toast.error("Erro ao gerar PDF de amostra: " + (err?.message || "falha interna"));
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (!documentInfo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`bg-slate-900 border-slate-800 text-white p-0 flex flex-col gap-0 overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? "fixed inset-0 w-screen h-screen max-w-none rounded-none z-50"
            : "max-w-6xl h-[92vh] rounded-2xl shadow-2xl"
        }`}
      >
        {/* BARRA SUPERIOR DE FERRAMENTAS DO ENGENHEIRO */}
        <div className="bg-slate-950/90 border-b border-slate-800/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Lado Esquerdo: Identificação do Documento */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-blue-600/20 text-[#075BFF] flex items-center justify-center border border-blue-500/30 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate max-w-md">
                  {currentTemplate.name}
                </h3>
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold shrink-0">
                  Padrão NORMAM/DPC
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Serviço: <span className="text-slate-300 font-semibold">{documentInfo.serviceName || "Geral Náutico"}</span> ·{" "}
                Base: <span className="font-mono text-blue-400">{documentInfo.officialSource || "NORMAM-211"}</span>
              </p>
            </div>
          </div>

          {/* Lado Central: Seletor de Modelo (quando há múltiplos) & Cenários Náuticos */}
          <div className="flex items-center gap-2 flex-wrap">
            {templatesList.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1">
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={selectedTemplateIndex}
                  onChange={(e) => setSelectedTemplateIndex(Number(e.target.value))}
                  className="bg-transparent text-xs text-white border-none focus:outline-none cursor-pointer pr-2 font-medium"
                  title="Alternar entre modelos emitidos por este serviço"
                >
                  {templatesList.map((tpl, i) => (
                    <option key={i} value={i} className="bg-slate-900 text-white">
                      Modelo {i + 1}: {tpl.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Seletor de Cenário / Embarcação Realista */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1">
              <Ship className="h-3.5 w-3.5 text-blue-400" />
              <select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value as ScenarioId)}
                className="bg-transparent text-xs text-white border-none focus:outline-none cursor-pointer pr-2 font-medium"
                title="Alternar dados de simulação náutica"
              >
                <option value="lancha_esporte" className="bg-slate-900 text-white">
                  🚤 Lancha Coral 26ft (Esporte & Recreio)
                </option>
                <option value="moto_aquatica" className="bg-slate-900 text-white">
                  🌊 Jet Ski Sea-Doo 300HP (Moto Aquática)
                </option>
                <option value="barco_comercial" className="bg-slate-900 text-white">
                  🚢 Catamarã 42ft (Turismo Comercial)
                </option>
                <option value="placeholders" className="bg-slate-900 text-white">
                  📋 Variáveis Estruturais (Tags Nativas)
                </option>
              </select>
            </div>
          </div>

          {/* Lado Direito: Ações (Zoom, Imprimir, Baixar PDF, Fullscreen, Fechar) */}
          <div className="flex items-center gap-1.5">
            {/* Controles de Zoom */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleZoom(-15)}
                className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                title="Reduzir Zoom"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[11px] font-mono font-semibold px-1.5 text-slate-300">
                {zoomLevel}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleZoom(15)}
                className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                title="Aumentar Zoom"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Caneta do Engenheiro / Observações */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingNotes(!isEditingNotes)}
              className={`h-8 rounded-xl text-xs font-semibold gap-1.5 border-slate-800 cursor-pointer ${
                isEditingNotes ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
              title="Adicionar ou editar cláusulas e observações no documento"
            >
              <Edit3 className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">Caneta Engenharia</span>
            </Button>

            {/* Imprimir */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 gap-1.5 cursor-pointer"
              title="Imprimir documento em formato A4"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Imprimir A4</span>
            </Button>

            {/* Baixar PDF */}
            <Button
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="h-8 rounded-xl text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white gap-1.5 shadow-md cursor-pointer"
              title="Baixar arquivo PDF de amostra com validação"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isDownloadingPdf ? "Gerando..." : "Baixar PDF"}</span>
            </Button>

            {/* Fullscreen Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer"
              title={isFullscreen ? "Sair da Tela Cheia" : "Modo Tela Cheia"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>

            {/* Fechar */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer ml-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ÁREA PRINCIPAL: MESA TÉCNICA E FOLHA A4 */}
        <div className="flex-1 overflow-auto bg-slate-950 p-4 sm:p-8 flex justify-center items-start relative select-text">
          {/* PAINEL LATERAL DE EDIÇÃO RÁPIDA (CANETA DO ENGENHEIRO) */}
          {isEditingNotes && (
            <div className="absolute top-4 left-4 z-20 w-80 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-left-4 duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Edit3 className="h-3.5 w-3.5" />
                  Observações e Despacho Técnico
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(false)}
                  className="text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                Insira ressalvas regulamentares, protocolo da Capitania ou parecer do engenheiro que aparecerão no rodapé deste documento.
              </p>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Ex: Embarcação vistoriada em seco conforme NORMAM-211 Art. 2.14. Termo de Responsabilidade Técnica expedido sob ART nº 20261104..."
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />
              <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-800">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCustomNotes("")}
                  className="text-[11px] text-slate-400 hover:text-slate-200 h-7 px-2 cursor-pointer"
                >
                  Limpar
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    toast.success("Observações aplicadas na folha de visualização!");
                    setIsEditingNotes(false);
                  }}
                  className="h-7 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 rounded-lg cursor-pointer"
                >
                  Aplicar na Folha
                </Button>
              </div>
            </div>
          )}

          {/* FOLHA A4 OFICIAL (210mm x 297mm / ~794px base) */}
          <div
            id="official-a4-sheet"
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: "top center",
              transition: "transform 0.15s ease",
              width: "794px",
              minHeight: "1123px",
            }}
            className="bg-white text-slate-900 rounded-sm shadow-2xl p-10 sm:p-14 flex flex-col justify-between shrink-0 font-sans border border-slate-200 relative mb-12"
          >
            {/* MARCA D'ÁGUA SUAVE DE HOMOLOGAÇÃO NAVAL NO FUNDO */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] select-none">
              <span className="text-8xl font-black text-slate-900 rotate-[-35deg] tracking-widest uppercase">
                MARINHA DO BRASIL
              </span>
            </div>

            {/* PARTE SUPERIOR DO DOCUMENTO */}
            <div className="space-y-4">
              {/* CABEÇALHO OFICIAL: BRASÃO + DPC / MARINHA */}
              <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                {/* Brasão das Armas Nacionais da República */}
                <div className="mx-auto flex justify-center mb-1">
                  <div className="h-14 w-14 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shadow-xs">
                    <span className="text-2xl" role="img" aria-label="Brasão das Armas">
                      ⚓
                    </span>
                  </div>
                </div>

                <h1 className="text-sm font-extrabold tracking-wider text-slate-950 uppercase font-sans">
                  MARINHA DO BRASIL
                </h1>
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  DIRETORIA DE PORTOS E COSTAS
                </h2>
                <p className="text-[10px] font-semibold text-slate-600 uppercase">
                  CAPITANIA DOS PORTOS / DELEGACIA / AGÊNCIA REGULADORA JURISDICIONANTE
                </p>
              </div>

              {/* TÍTULO DO DOCUMENTO E ENQUADRAMENTO REGULAMENTAR */}
              <div className="text-center py-2 bg-slate-50 border border-slate-200 rounded-lg">
                <h3 className="text-sm font-black text-slate-950 uppercase tracking-wide">
                  {currentTemplate.name}
                </h3>
                <p className="text-[10px] font-mono text-slate-600 mt-0.5">
                  BASE LEGAL: <span className="font-bold text-slate-800">{documentInfo.officialSource || "NORMAM-211/DPC"}</span> ·{" "}
                  FINALIDADE: <span className="font-medium">{documentInfo.legalPurpose || "Instrução e Averbação Cadastral"}</span>
                </p>
              </div>

              {/* QUADRO 1: DADOS DO REQUERENTE / TITULAR */}
              <div className="border border-slate-300 rounded-lg overflow-hidden text-[11px]">
                <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 font-bold text-slate-900 text-[10px] uppercase flex items-center justify-between">
                  <span>1. Identificação do Requerente / Outorgante</span>
                  <span className="font-mono text-slate-500 font-normal">Papel: {documentInfo.signersRole || "Titular Proprietário"}</span>
                </div>
                <div className="p-3 grid grid-cols-12 gap-2 text-slate-800">
                  <div className="col-span-8">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Nome Completo / Razão Social:</span>
                    <span className="font-semibold">{scenario.client.name}</span>
                  </div>
                  <div className="col-span-4">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">CPF / CNPJ:</span>
                    <span className="font-mono font-semibold">{scenario.client.doc}</span>
                  </div>

                  <div className="col-span-4">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Documento de Identidade (RG):</span>
                    <span className="font-semibold">{scenario.client.rg}</span>
                  </div>
                  <div className="col-span-4">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Telefone / Celular:</span>
                    <span className="font-semibold">{scenario.client.phone}</span>
                  </div>
                  <div className="col-span-4">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">E-mail:</span>
                    <span className="font-semibold truncate block">{scenario.client.email}</span>
                  </div>

                  <div className="col-span-8">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Endereço Residencial / Domicílio Cadastrado:</span>
                    <span className="font-semibold">{scenario.client.address}</span>
                  </div>
                  <div className="col-span-4">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Município / UF — CEP:</span>
                    <span className="font-semibold">{scenario.client.cityState} — {scenario.client.cep}</span>
                  </div>
                </div>
              </div>

              {/* QUADRO 2: DADOS TÉCNICOS DA EMBARCAÇÃO */}
              <div className="border border-slate-300 rounded-lg overflow-hidden text-[11px]">
                <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 font-bold text-slate-900 text-[10px] uppercase">
                  2. Características e Dados Técnicos da Embarcação
                </div>
                <div className="p-3 grid grid-cols-12 gap-2 text-slate-800">
                  <div className="col-span-5">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Nome da Embarcação:</span>
                    <span className="font-extrabold uppercase text-slate-950">{scenario.vessel.name}</span>
                  </div>
                  <div className="col-span-4">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Nº de Inscrição (TIE / TIEM):</span>
                    <span className="font-mono font-bold text-blue-900">{scenario.vessel.registration}</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Ano de Construção:</span>
                    <span className="font-semibold">{scenario.vessel.year}</span>
                  </div>

                  <div className="col-span-6">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Tipo / Classificação:</span>
                    <span className="font-semibold">{scenario.vessel.type}</span>
                  </div>
                  <div className="col-span-6">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Área de Navegação Autorizada:</span>
                    <span className="font-semibold">{scenario.vessel.navigationArea}</span>
                  </div>

                  <div className="col-span-6">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Estaleiro / Construtor:</span>
                    <span className="font-semibold">{scenario.vessel.builder}</span>
                  </div>
                  <div className="col-span-6">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Identificador do Casco / Chassi (HIN/MIC):</span>
                    <span className="font-mono font-semibold">{scenario.vessel.hullId}</span>
                  </div>

                  <div className="col-span-12 grid grid-cols-6 gap-2 pt-1 border-t border-slate-200 mt-1">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Comprimento:</span>
                      <span className="font-semibold">{scenario.vessel.length}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Boca:</span>
                      <span className="font-semibold">{scenario.vessel.boca}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Pontal:</span>
                      <span className="font-semibold">{scenario.vessel.pontal}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Calado:</span>
                      <span className="font-semibold">{scenario.vessel.calado}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Arqueação (AB):</span>
                      <span className="font-semibold">{scenario.vessel.grossTonnage}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Lotação Total:</span>
                      <span className="font-semibold">{scenario.vessel.capacity}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* QUADRO 3: DADOS DE PROPULSÃO E MOTORES */}
              <div className="border border-slate-300 rounded-lg overflow-hidden text-[11px]">
                <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 font-bold text-slate-900 text-[10px] uppercase">
                  3. Dados do(s) Motor(es) e Sistema Propulsor
                </div>
                <div className="p-3 grid grid-cols-12 gap-2 text-slate-800">
                  <div className="col-span-3">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Fabricante do Motor:</span>
                    <span className="font-semibold">{scenario.vessel.engines.brand}</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Modelo do Propulsor:</span>
                    <span className="font-semibold">{scenario.vessel.engines.model}</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Nº de Série do Motor:</span>
                    <span className="font-mono font-bold text-slate-950">{scenario.vessel.engines.serial}</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Potência Registrada:</span>
                    <span className="font-bold text-blue-900">{scenario.vessel.engines.power}</span>
                  </div>

                  <div className="col-span-6">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Quantidade de Propulsores:</span>
                    <span className="font-semibold">{scenario.vessel.engines.count}</span>
                  </div>
                  <div className="col-span-6">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Combustível Utilizado:</span>
                    <span className="font-semibold">{scenario.vessel.engines.fuel}</span>
                  </div>
                </div>
              </div>

              {/* QUADRO 4: TERMO DECLARATÓRIO SOB AS PENAS DA LEI */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[10px] text-slate-700 leading-relaxed text-justify">
                <p>
                  <strong>DECLARAÇÃO FORMAL DE VERACIDADE (Art. 299 do Código Penal):</strong> O requerente e os signatários abaixo identificados
                  declaram expressamente, sob as penas da Lei e nos termos das normas em vigor da Diretoria de Portos e Costas (DPC / NORMAM), que todos os
                  dados e características técnicas supramencionados correspondem fielmente à realidade física e documental da embarcação, cientes de que a
                  falsidade em documento público sujeita os infratores às sanções cíveis, administrativas e penais cabíveis.
                </p>

                {customNotes && (
                  <div className="mt-2 pt-2 border-t border-slate-300 text-amber-900 bg-amber-50/80 p-2 rounded font-medium">
                    <strong>Ressalva / Despacho do Engenheiro:</strong> {customNotes}
                  </div>
                )}
              </div>
            </div>

            {/* PARTE INFERIOR: ASSINATURAS, RESPONSABILIDADE TÉCNICA E TARJA GOV.BR */}
            <div className="pt-6 space-y-5 border-t border-slate-300 mt-6">
              {/* BLOCO DE ASSINATURAS */}
              <div className="grid grid-cols-2 gap-8 text-center text-[10px]">
                {/* Assinatura do Requerente */}
                <div className="space-y-1">
                  <div className="border-b border-slate-900 pb-1">
                    <span className="font-serif italic text-xs text-blue-950 font-bold block">
                      {scenario.client.name}
                    </span>
                  </div>
                  <p className="font-bold text-slate-900 uppercase">{scenario.client.name}</p>
                  <p className="text-slate-500 font-mono text-[9px]">CPF: {scenario.client.doc}</p>
                  <p className="text-[9px] text-slate-400">Requerente / Outorgante</p>
                </div>

                {/* Assinatura do Responsável Técnico / Engenheiro Naval */}
                <div className="space-y-1">
                  <div className="border-b border-slate-900 pb-1">
                    <span className="font-serif italic text-xs text-slate-800 font-bold block">
                      {scenario.engineer.name}
                    </span>
                  </div>
                  <p className="font-bold text-slate-900 uppercase">{scenario.engineer.name}</p>
                  <p className="text-slate-600 font-mono text-[9px]">{scenario.engineer.crea} · {scenario.engineer.art}</p>
                  <p className="text-[9px] text-slate-400">Responsável Técnico / Engenheiro Naval</p>
                </div>
              </div>

              {/* TARJA OFICIAL DE VALIDAÇÃO DIGITAL GOV.BR */}
              <div className="border-2 border-slate-300 rounded-lg p-2.5 bg-slate-50 flex items-center justify-between text-[9px] font-mono text-slate-600">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-white border border-slate-300 rounded flex items-center justify-center p-1 shrink-0">
                    <QrCode className="h-8 w-8 text-slate-900" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900 font-sans text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 inline" />
                      Documento Assinado Digitalmente em conformidade com a MP nº 2.200-2/2001 e Lei nº 14.063/2020.
                    </p>
                    <p className="text-slate-500 truncate max-w-lg">
                      Hash de Autenticidade SHA-256: <code>d9a48b19e27c0301ff82194b8301ec7491028391740918471029831920</code>
                    </p>
                    <p className="text-[8px] text-slate-400">
                      Validação pública em: https://verificador.gov.br ou https://marinha.mil.br/dpc/autenticidade
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-2 border-l border-slate-300">
                  <span className="font-bold text-slate-800 block">NAVALDOCS PRO</span>
                  <span className="text-[8px] text-slate-400">Emissão Homologada</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
