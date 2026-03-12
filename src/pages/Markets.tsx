import { useState, useMemo, useEffect, useRef } from 'react';
import { RefreshCcw, TrendingUp, TrendingDown } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const metals = [
 { name: 'Gold (24K, 10g)', price: 62450, change: 0.45, up: true },
 { name: 'Silver (999, 1kg)', price: 74200, change: -0.28, up: false },
 { name: 'Copper Cathode (1kg)', price: 850, change: 1.2, up: true },
 { name: 'Bronze (1kg)', price: 720, change: 0.8, up: true },
];

const timeframes = ['1D', '1W', '1M', '3M', '1Y', '5Y'];

function genData(tf: string) {
 const labels: string[] = [];
 const data: number[] = [];
 let base = 58000;
 const n = tf === '1D' ? 24 : tf === '1W' ? 7 : tf === '1M' ? 30 : tf === '3M' ? 12 : tf === '1Y' ? 12 : 60;
 const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
 for (let i = 0; i < n; i++) {
 base += (Math.random() - 0.45) * 800;
 labels.push(tf === '1D' ? `${i}:00` : tf === '1W' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i] : tf === '1M' ? `${i + 1}` : tf === '3M' ? months[i % 12] : tf === '1Y' ? months[i % 12] : `${2021 + Math.floor(i / 12)}`);
 data.push(Math.round(base));
 }
 return { labels, data };
}

export default function Markets() {
 const [tf, setTf] = useState('1M');
 const [now] = useState(new Date());
 const chartInfo = useMemo(() => genData(tf), [tf]);

 const chartData = {
 labels: chartInfo.labels,
 datasets: [{
 data: chartInfo.data,
 borderColor: '#10B981',
 backgroundColor: (ctx: any) => {
 const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200);
 g.addColorStop(0, 'rgba(16,185,129,0.3)');
 g.addColorStop(1, 'rgba(16,185,129,0)');
 return g;
 },
 borderWidth: 2,
 fill: true,
 tension: 0.4,
 pointRadius: 0,
 pointHitRadius: 10,
 }],
 };

 const chartOpts: any = {
 responsive: true, maintainAspectRatio: false,
 scales: { x: { display: true, grid: { display: false }, ticks: { color: '#6B7280', font: { size: 10 }, maxTicksLimit: 6 } }, y: { display: false } },
 plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1E293B', titleColor: '#F8FAFC', bodyColor: '#F8FAFC', borderColor: '#334155', borderWidth: 1, cornerRadius: 8, padding: 8, callbacks: { label: (c: any) => `₹${c.parsed.y.toLocaleString('en-IN')}` } } },
 interaction: { intersect: false, mode: 'index' },
 };

 return (
 <div className="px-4 pt-14 animate-fade-in">
 <div className="flex items-start justify-between mb-2">
 <div><h1 className="text-2xl font-bold text-foreground">Metal Prices</h1><p className="text-muted-foreground text-sm mt-1">Gold, Silver, Copper & Bronze</p></div>
 <button className="p-2.5 rounded-xl bg-card border border-border"><RefreshCcw size={18} className="text-muted-foreground" /></button>
 </div>
 <div className="flex items-center gap-2 mb-6">
 <span className="w-2 h-2 bg-brand-green rounded-full animate-pulse" /><span className="text-muted-foreground text-xs">Live</span>
 <span className="text-slate-600 text-xs ml-auto">Updated {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
 </div>

 {/* Metal Cards */}
 <div className="space-y-3 mb-6">
 {metals.map((m) => (
 <div key={m.name} className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border">
 <div><p className="text-xs text-muted-foreground">{m.name}</p><p className="text-lg font-bold text-foreground mt-0.5">₹{m.price.toLocaleString('en-IN')}</p></div>
 <div className={`flex items-center gap-1 ${m.up ? 'text-brand-green' : 'text-brand-red'}`}>
 {m.up ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
 <span className="text-sm font-semibold">{m.change > 0 ? '+' : ''}{m.change}%</span>
 </div>
 </div>
 ))}
 </div>

 {/* Chart */}
 <div className="p-5 rounded-2xl bg-card border border-border mb-6">
 <div className="flex items-start justify-between mb-1">
 <div><h2 className="text-foreground font-semibold">Gold Price</h2><p className="text-muted-foreground text-xs mt-0.5">10 grams, 24K</p></div>
 <div className="text-right"><p className="text-foreground font-bold text-lg">₹62,450</p><p className="text-brand-green text-xs font-medium">+0.45%</p></div>
 </div>
 <div className="flex gap-1.5 my-4">
 {timeframes.map((t) => (
 <button key={t} onClick={() => setTf(t)}
 className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${tf === t ? 'bg-brand-green text-white' : 'bg-background text-muted-foreground'}`}>{t}</button>
 ))}
 </div>
 <div className="h-48"><Line data={chartData} options={chartOpts} /></div>
 </div>
 </div>
 );
}
