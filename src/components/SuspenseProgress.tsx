import { useEffect, useState } from 'react';

const SuspenseProgress = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Start animation immediately
    setProgress(20);
    
    const timer1 = setTimeout(() => setProgress(40), 100);
    const timer2 = setTimeout(() => setProgress(60), 300);
    const timer3 = setTimeout(() => setProgress(80), 600);
    const timer4 = setTimeout(() => setProgress(90), 1000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-transparent">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default SuspenseProgress;
