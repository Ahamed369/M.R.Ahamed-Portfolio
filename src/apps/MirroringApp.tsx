import { useEffect, useRef, useState } from 'react';
import { DragBar, Lights } from '../components/Window';
import { deviceUrl } from '../components/FramedDevice';

/**
 * v10.1 — iPhone Mirroring: the iPhone version of this portfolio in a Mac
 * window (a live copy that shares the same notes, messages and settings).
 */
export default function MirroringApp() {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.7);
  const [src] = useState(() => deviceUrl('iphone', '#/'));
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, (el.clientHeight - 16) / 874, (el.clientWidth - 16) / 402)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="mir">
      <DragBar className="mir-bar">
        <Lights />
        <b>iPhone Mirroring</b>
      </DragBar>
      <div className="mir-stage" ref={box}>
        <div className="mir-phone" style={{ width: 402 * scale, height: 874 * scale }}>
          <iframe title="iPhone" src={src} style={{ transform: `scale(${scale})` }} allow="camera; microphone; geolocation; clipboard-read; clipboard-write; autoplay" />
        </div>
      </div>
      <p className="mir-note">Your iPhone view of this portfolio — notes, messages and settings are shared with the Mac.</p>
    </div>
  );
}
