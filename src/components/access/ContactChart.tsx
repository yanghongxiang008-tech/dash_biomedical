import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';
import type { Contact } from './types';
import { useI18n } from '@/i18n';

interface ContactChartProps {
  contacts: Contact[];
}

const ContactChart: React.FC<ContactChartProps> = ({ contacts }) => {
  const { t } = useI18n();
  const chartData = useMemo(() => {
    // Last 30 days
    const endDate = new Date();
    const startDate = subDays(endDate, 29);
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Count contacts created each day
    const dailyCounts = days.map(day => {
      const dayStart = startOfDay(day);
      const count = contacts.filter(c => {
        const created = startOfDay(new Date(c.created_at));
        return created.getTime() === dayStart.getTime();
      }).length;
      
      return {
        date: format(day, 'MMM d'),
        count,
      };
    });
    
    // Calculate cumulative
    let cumulative = contacts.filter(c => new Date(c.created_at) < startDate).length;
    return dailyCounts.map(d => {
      cumulative += d.count;
      return { ...d, total: cumulative };
    });
  }, [contacts]);

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis 
            tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              fontSize: '11px',
            }}
            formatter={(value: number) => [value, t('Total')]}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            fillOpacity={1}
            fill="url(#colorTotal)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ContactChart;
