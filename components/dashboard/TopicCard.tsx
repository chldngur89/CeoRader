export interface TopicData {
  id: string;
  name: string;
  score: number;
  type: "Opportunity" | "Threat";
  rank: number;
  trend: "up" | "flat" | "down";
}

export default function TopicCard({ topic, isActive }: { topic: TopicData; isActive?: boolean }) {
  const isOpportunity = topic.type === "Opportunity";
  
  return (
    <div 
      className={`flex-shrink-0 w-[240px] bg-white border-2 p-4 rounded-2xl shadow-sm transition-all cursor-pointer active:scale-95 ${
        isActive ? "border-primary shadow-md" : "border-slate-100 hover:border-primary/30"
      }`}
      onClick={() => alert(`${topic.name} 상세 분석 페이지로 이동합니다 (준비 중)`)}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
          isOpportunity ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
        }`}>
          {topic.type}
        </span>
        <span className="text-lg font-bold text-navy-custom">{topic.score}</span>
      </div>
      <h3 className="text-sm font-bold text-navy-custom leading-tight mb-3 h-10 line-clamp-2">
        {topic.name}
      </h3>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className={`material-symbols-outlined text-sm ${
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
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">RANK #{topic.rank}</span>
      </div>
    </div>
  );
}
