export interface TopicData {
  id: string;
  name: string;
  score: number;
  type: "Opportunity" | "Threat" | "Trend";
  rank: number;
  trend: "up" | "flat" | "down";
  source?: string;
  time?: string;
}

export default function TopicCard({ topic, isActive }: { topic: TopicData; isActive?: boolean }) {
  const tone =
    topic.type === "Opportunity"
      ? { bg: "bg-green-100", text: "text-green-700", label: "기회" }
      : topic.type === "Threat"
        ? { bg: "bg-red-100", text: "text-red-700", label: "위협" }
        : { bg: "bg-blue-100", text: "text-blue-700", label: "트렌드" };
  
  return (
    <div 
      className={`flex-shrink-0 w-[260px] bg-white border-2 p-4 rounded-2xl shadow-sm transition-all ${
        isActive ? "border-primary shadow-md" : "border-slate-100 hover:border-primary/30"
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 text-[8px] font-bold rounded uppercase ${tone.bg} ${tone.text}`}>
              {tone.label}
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{topic.source || "Market AI"}</span>
          </div>
          <span className="text-[8px] text-slate-400 font-medium">{topic.time || "방금"}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-lg font-bold text-navy-custom leading-none">{topic.score}</span>
          <span className="text-[7px] font-bold text-slate-300 uppercase tracking-tighter mt-0.5">SCORE</span>
        </div>
      </div>
      
      <h3 className="text-[13px] font-bold text-navy-custom leading-snug mb-3 h-10 line-clamp-2">
        {topic.name}
      </h3>
      
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1">
          <span className={`material-symbols-outlined text-[16px] ${
            topic.trend === "up" ? "text-green-500" : topic.trend === "down" ? "text-red-500" : "text-slate-400"
          }`}>
            {topic.trend === "up" ? "trending_up" : topic.trend === "down" ? "trending_down" : "trending_flat"}
          </span>
          <svg className="w-12 h-6" viewBox="0 0 48 24">
            <path 
              d={topic.trend === "up" ? "M0 20 Q12 18, 24 10 T48 4" : topic.trend === "down" ? "M0 4 Q12 6, 24 14 T48 20" : "M0 12 Q12 14, 24 12 T48 13"} 
              fill="none" 
              stroke={topic.trend === "up" ? "#22c55e" : topic.trend === "down" ? "#ef4444" : "#94a3b8"} 
              strokeWidth="2"
            />
          </svg>
        </div>
        <span className="text-[9px] font-black text-slate-300 italic">RANK #{topic.rank}</span>
      </div>
    </div>
  );
}
