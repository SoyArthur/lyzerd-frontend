'use client';
import Tooltip from './Tooltip';

const getSeverityColor = (severity, isDark) => {
  const colors = {
    high: isDark ? 'text-red-400 border-red-500/50' : 'text-red-600 border-red-400',
    medium: isDark ? 'text-yellow-400 border-yellow-500/50' : 'text-yellow-600 border-yellow-400',
    low: isDark ? 'text-cyan-400 border-cyan-500/50' : 'text-cyan-600 border-cyan-400',
  };
  return colors[severity] || colors.low;
};

export default function MetricTooltip({ children, scenario, isDark = true, position = 'top' }) {
  if (!scenario) return children;
  
  const severityColor = getSeverityColor(scenario.severity, isDark);
  
  const content = (
    <div className="space-y-2">
      <div className={`font-bold text-sm ${severityColor} border-l-2 pl-2`}>
        {scenario.impact}
      </div>
      
      <div className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
        {scenario.detail}
      </div>
      
      <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-600'} space-y-1 pt-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
        <div><span className="font-bold">Trigger:</span> {scenario.trigger}</div>
        <div><span className="font-bold">Timeframe:</span> {scenario.timeframe}</div>
      </div>
      
      {scenario.ratio !== undefined && (
        <div className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-500'} pt-1 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
          Ratio: {typeof scenario.ratio === 'number' ? scenario.ratio.toFixed(3) : scenario.ratio}
        </div>
      )}
    </div>
  );
  
  return (
    <Tooltip content={content} pos={position}>
      <span className="cursor-help border-b border-dashed border-current opacity-80 hover:opacity-100 transition-opacity">
        {children}
      </span>
    </Tooltip>
  );
}
