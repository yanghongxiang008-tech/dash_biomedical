import { useEffect, useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';

const GlobalLoadingBar = () => {
  const isFetching = useIsFetching();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isFetching > 0) {
      setVisible(true);
      setProgress(20);
      
      const timer1 = setTimeout(() => setProgress(40), 100);
      const timer2 = setTimeout(() => setProgress(60), 300);
      const timer3 = setTimeout(() => setProgress(80), 600);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    } else {
      setProgress(100);
      const hideTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
      return () => clearTimeout(hideTimer);
    }
  }, [isFetching]);

  if (!visible && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-transparent">
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ 
          width: `${progress}%`,
          opacity: visible ? 1 : 0
        }}
      />
    </div>
  );
};

export default GlobalLoadingBar;
