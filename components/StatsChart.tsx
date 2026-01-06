import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { QuestionAnalysis } from '../types';

interface StatsChartProps {
  questions: QuestionAnalysis[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const StatsChart: React.FC<StatsChartProps> = ({ questions }) => {
  const data = React.useMemo(() => {
    const counts: Record<string, number> = {};
    questions.forEach(q => {
      counts[q.category] = (counts[q.category] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key]
    }));
  }, [questions]);

  if (data.length === 0) return null;

  return (
    <div className="h-64 w-full bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
      <h3 className="text-sm font-semibold text-slate-500 mb-2 w-full text-right">توزيع أنواع الأسئلة</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            fill="#8884d8"
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};