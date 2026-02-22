'use client';

import { useState, useRef, useEffect } from 'react';

export default function Tooltip({ children, content, pos = 'top' }) {
  const [show, setShow] = useState(false);
  const [mobile, setMobile] = useState(false);
  const ref = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!mobile || !show) return;
    const close = (e) => ref.current && !ref.current.contains(e.target) && setShow(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [mobile, show]);

  const enter = () => {
    if (mobile) return;
    timer.current && clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(true), 200);
  };

  const leave = () => {
    if (mobile) return;
    timer.current && clearTimeout(timer.current);
    setShow(false);
  };

  const click = (e) => {
    if (!mobile) return;
    e.stopPropagation();
    setShow(!show);
  };

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div ref={ref} className="relative inline-flex" onMouseEnter={enter} onMouseLeave={leave} onClick={click}>
      {children}
      {show && (
        <div className={`absolute z-50 ${positions[pos]} bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 shadow-xl max-w-[280px] md:max-w-[320px] whitespace-normal animate-fadeIn`}>
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}
