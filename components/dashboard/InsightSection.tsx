export interface ActionItem {
  id: string;
  title: string;
  description: string;
}

export interface InsightData {
  title: string;
  relevance: number;
  summary: string;
  relatedIntelligence: {
    title: string;
    source: string;
    time: string;
    type: "primary" | "secondary";
  }[];
  strategicActions: ActionItem[];
}

export default function InsightSection({ data }: { data: InsightData }) {
  return (
    <div className="bg-[#1e293b] text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1 pr-4">
            <h2 className="text-xl font-bold leading-tight">{data.title}</h2>
            <p className="text-slate-400 text-xs font-medium mt-1">전략 심층 분석</p>
          </div>
          <div className="flex flex-col items-center bg-slate-800/50 px-3 py-2 rounded-xl">
            <div className="text-[8px] uppercase font-bold tracking-tighter text-slate-400 mb-1">RELEVANCE</div>
            <div className="text-3xl font-bold text-primary">{data.relevance}</div>
          </div>
        </div>
        
        <div className="mb-8">
          <p className="text-sm text-slate-300 leading-relaxed font-medium">
            {data.summary}
          </p>
        </div>

        {data.relatedIntelligence.length > 0 && (
          <div className="space-y-4 mb-8">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">관련 인텔리전스</h4>
            <div className="space-y-3">
              {data.relatedIntelligence.map((item, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className={`w-1 h-8 rounded-full ${item.type === "primary" ? "bg-primary" : "bg-slate-600"}`}></div>
                  <div>
                    <p className="text-[11px] font-bold line-clamp-1">{item.title}</p>
                    <p className="text-[9px] text-slate-500 uppercase font-semibold">{item.source} • {item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.strategicActions.length > 0 && (
          <div className="pt-6 border-t border-slate-700/50">
            <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-4">전략적 행동</h4>
            <div className="grid grid-cols-2 gap-3">
              {data.strategicActions.slice(0, 2).map((action, idx) => (
                <div key={action.id} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                  <p className="text-[10px] text-slate-400 font-bold mb-1">{String(idx + 1).padStart(2, '0')}. {action.title}</p>
                  <p className="text-[11px] font-medium leading-tight">{action.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
