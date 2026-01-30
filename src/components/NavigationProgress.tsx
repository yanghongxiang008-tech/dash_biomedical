import { useEffect, useState } from 'react';
import { useNavigation } from 'react-router-dom';

const NavigationProgress = () => {
  const navigation = useNavigation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (navigation.state === 'loading') {
      setVisible(true);
      setProgress(0);
      
      // Animate progress
      const timer1 = setTimeout(() => setProgress(30), 50);
      const timer2 = setTimeout(() => setProgress(60), 200);
      const timer3 = setTimeout(() => setProgress(80), 500);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    } else {
      if (visible) {
        setProgress(100);
        const timer = setTimeout(() => {
          setVisible(false);
          setProgress(0);
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [navigation.state, visible]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-transparent">
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default NavigationProgress;
