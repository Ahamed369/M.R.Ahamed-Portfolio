import { useEffect, useRef, useState } from 'react';
import { notify } from '../system/notify';
import { cv, personal } from '../data/portfolio';

/**
 * Preview-style document viewer for the CV. Pages are pre-rendered images of
 * the supplied PDF (so they display on every device); the original PDF can be
 * opened or downloaded from the toolbar.
 */
export default function PreviewApp() {
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    notify({ app: 'Preview', icon: 'preview', title: `${personal.name} CV opened`, body: cv.displayName });
  }, []);

  const goTo = (i: number) => {
    const n = Math.max(0, Math.min(cv.pages.length - 1, i));
    setPage(n);
    pageRefs.current[n]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onScroll = () => {
    const sc = scrollRef.current;
    if (!sc) return;
    const mid = sc.scrollTop + sc.clientHeight / 3;
    let cur = 0;
    pageRefs.current.forEach((el, i) => {
      if (el && el.offsetTop <= mid) cur = i;
    });
    if (cur !== page) setPage(cur);
  };

  return (
    <div className="preview">
      <div className="pv-toolbar">
        <div className="pv-group">
          <button type="button" className="pv-btn" onClick={() => goTo(page - 1)} disabled={page === 0} aria-label="Previous page">
            ‹
          </button>
          <span className="pv-page">
            Page {page + 1} of {cv.pages.length}
          </span>
          <button type="button" className="pv-btn" onClick={() => goTo(page + 1)} disabled={page === cv.pages.length - 1} aria-label="Next page">
            ›
          </button>
        </div>
        <div className="pv-group hide-xs">
          <button type="button" className="pv-btn" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))} aria-label="Zoom out">
            −
          </button>
          <span className="pv-page">{Math.round(zoom * 100)}%</span>
          <button type="button" className="pv-btn" onClick={() => setZoom((z) => Math.min(2, +(z + 0.15).toFixed(2)))} aria-label="Zoom in">
            +
          </button>
        </div>
        <span className="pv-spacer" />
        <a className="pv-btn wide" href={cv.url} target="_blank" rel="noopener noreferrer">
          Open PDF
        </a>
        <a className="pv-btn wide primary" href={cv.url} download={cv.fileName}>
          Download
        </a>
      </div>
      <div className="pv-body">
        <div className="pv-thumbs hide-sm">
          {cv.pages.map((src, i) => (
            <button key={src} type="button" className={`pv-thumb ${i === page ? 'on' : ''}`} onClick={() => goTo(i)} aria-label={`Page ${i + 1}`}>
              <img src={src} alt="" loading="lazy" />
              <span>{i + 1}</span>
            </button>
          ))}
        </div>
        <div className="pv-scroll scroll-smooth" ref={scrollRef} onScroll={onScroll}>
          {cv.pages.map((src, i) => (
            <div
              key={src}
              className="pv-sheet"
              ref={(el) => {
                pageRefs.current[i] = el;
              }}
              style={{ width: `${zoom * 100}%` }}
            >
              <img src={src} alt={`${personal.name} CV — page ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
