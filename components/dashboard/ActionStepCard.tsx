export interface ActionStep {
  id: string;
  title: string;
  problem: string;
  proposal: string;
  impact: string;
  tags: string[];
  icon: string;
  impactColor?: string;
}

function formatImpact(impact: string): { text: string; isPositive: boolean } {
  const positiveKeywords = ["+", "증가", "성장", "확대", "향상", "개선", "절감", "단축"];
  const isPositive = positiveKeywords.some(kw => impact.includes(kw));
  return { text: impact, isPositive };
}

export default function ActionStepCard({ step }: { step: ActionStep }) {
  const impactInfo = formatImpact(step.impact);

  return (
    <div
      className="flex-shrink-0 w-[300px] bg-white rounded-2xl p-5 border border-slate-200 shadow-sm transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <h4 className="text-sm font-bold text-navy-custom">{step.title}</h4>
        <span className="material-symbols-outlined text-primary text-xl">{step.icon}</span>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-[9px] text-slate-400 uppercase font-bold">문제</p>
          <p className="text-xs text-slate-600 font-medium leading-snug">{step.problem}</p>
        </div>
        <div>
          <p className="text-[9px] text-slate-400 uppercase font-bold">제안</p>
          <p className="text-xs text-slate-600 font-medium leading-snug">{step.proposal}</p>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {step.tags.map(tag => (
            <span key={tag} className="text-[9px] bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-500">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
        <span className="text-[10px] font-bold text-slate-400 uppercase">영향</span>
        <span className={`text-xs font-bold ${impactInfo.isPositive ? "text-green-600" : step.impactColor || "text-primary"}`}>
          {impactInfo.text}
        </span>
      </div>
    </div>
  );
}
