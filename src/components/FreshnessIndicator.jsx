'use client';

import Tooltip from './Tooltip';

export default function FreshnessIndicator({ age, ttl, fieldName }) {
  const get = () => {
    if (age < 60) return { icon: '🟢', label: 'Fresh', color: 'text-green-400' };
    if (age < 300) return { icon: '🟡', label: 'Warm', color: 'text-yellow-400' };
    if (age < 600) return { icon: '🟠', label: 'Stale', color: 'text-orange-400' };
    return { icon: '🔴', label: 'Old', color: 'text-red-400' };
  };
  
  const fmt = (s) => {
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    return `${Math.floor(s / 3600)}h`;
  };
  
  const i = get();
  
  return (
    <Tooltip content={
      <div className="space-y-1 font-mono">
        <div className="font-bold">{fieldName}</div>
        <div>Actualizado: {fmt(age)}</div>
        <div>TTL: {fmt(ttl)}</div>
        <div>Estado: {i.label}</div>
      </div>
    }>
      <span className={`text-xs ${i.color} cursor-help`}>{i.icon}</span>
    </Tooltip>
  );
}

export function FreshnessDisplay({ metadata }) {
  if (!metadata?.fieldAges) return null;
  
  const fields = Object.entries(metadata.fieldAges);
  
  return (
    <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
      <div className="text-sm font-bold mb-2 text-gray-300 font-mono">📊 DATA FRESHNESS</div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
        {fields.map(([field, data]) => (
          <div key={field} className="flex items-center gap-2 font-mono">
            <FreshnessIndicator age={data.age} ttl={data.ttl} fieldName={field} />
            <span className="text-gray-500 truncate">{field}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500 font-mono">
        Cache hit: <span className="text-green-400 font-bold">{metadata.cacheHitPercent}%</span>
      </div>
    </div>
  );
}
