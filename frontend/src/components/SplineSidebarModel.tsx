import { useState, useEffect, useRef } from 'react';
import { Sprout, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';

const SPLINE_VIEWER_SCRIPT_URL = 'https://cdn.spline.design/@splinetool/viewer@2.0.75/build/spline-viewer.js';
const SPLINE_SCENE_URL = 'https://prod.spline.design/s1iD7wDE6BfWvJXq/scene.splinecode';

// Singleton promise to ensure script is injected only once across the application lifecycle
let splineScriptLoadingPromise: Promise<void> | null = null;

function loadSplineScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (window.customElements && window.customElements.get('spline-viewer')) {
    return Promise.resolve();
  }

  if (!splineScriptLoadingPromise) {
    splineScriptLoadingPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${SPLINE_VIEWER_SCRIPT_URL}"]`
      );

      if (existingScript) {
        if (window.customElements && window.customElements.get('spline-viewer')) {
          resolve();
        } else {
          existingScript.addEventListener('load', () => resolve(), { once: true });
          existingScript.addEventListener('error', () => reject(new Error('Failed to load Spline script')), { once: true });
        }
        return;
      }

      const script = document.createElement('script');
      script.type = 'module';
      script.src = SPLINE_VIEWER_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        splineScriptLoadingPromise = null;
        reject(new Error('Failed to load Spline 3D viewer script'));
      };
      document.head.appendChild(script);
    });
  }

  return splineScriptLoadingPromise;
}

// React 19 JSX intrinsic elements declaration for custom element <spline-viewer>
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'spline-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          url?: string;
          'loading-anim'?: boolean;
          style?: React.CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'spline-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          url?: string;
          'loading-anim'?: boolean;
          style?: React.CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}

interface SplineSidebarModelProps {
  className?: string;
}

export default function SplineSidebarModel({ className = '' }: SplineSidebarModelProps) {
  const [scriptLoaded, setScriptLoaded] = useState<boolean>(() => {
    return typeof window !== 'undefined' && Boolean(window.customElements?.get('spline-viewer'));
  });
  const [modelReady, setModelReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function init() {
      setLoadError(null);
      try {
        await loadSplineScript();
        if (active) {
          setScriptLoaded(true);
        }
      } catch (err: any) {
        if (active) {
          setLoadError(err.message || 'Unable to load 3D graphics viewer');
        }
      }
    }

    init();

    return () => {
      active = false;
    };
  }, [retryCount]);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current) return;

    const viewer = containerRef.current.querySelector('spline-viewer');
    if (!viewer) return;

    const removeBadge = () => {
      try {
        if (viewer.shadowRoot) {
          const logo = viewer.shadowRoot.querySelector('#logo') as HTMLElement | null;
          if (logo) {
            logo.style.display = 'none';
          }
        }
      } catch {
        // Safe fallback
      }
    };

    const handleLoad = () => {
      setModelReady(true);
      removeBadge();
    };

    const handleError = () => {
      setLoadError('Failed to render 3D scene');
    };

    viewer.addEventListener('load-complete', handleLoad);
    viewer.addEventListener('load', handleLoad);
    viewer.addEventListener('splineerror', handleError);

    // Initial check and periodic cleanup of the viewer badge
    removeBadge();
    const badgeInterval = setInterval(removeBadge, 500);

    // Safety timeout in case events are missed or already completed
    const timer = setTimeout(() => {
      setModelReady(true);
      removeBadge();
    }, 4000);

    return () => {
      viewer.removeEventListener('load-complete', handleLoad);
      viewer.removeEventListener('load', handleLoad);
      viewer.removeEventListener('splineerror', handleError);
      clearInterval(badgeInterval);
      clearTimeout(timer);
    };
  }, [scriptLoaded]);

  const handleRetry = () => {
    splineScriptLoadingPromise = null;
    setModelReady(false);
    setScriptLoaded(false);
    setRetryCount(c => c + 1);
  };

  const handleRotateClick = () => {
    if (containerRef.current) {
      const viewer = containerRef.current.querySelector('spline-viewer') as HTMLElement | null;
      viewer?.focus();
    }
  };

  return (
    <div
      role="region"
      aria-label="Interactive 3D agricultural digital twin in sidebar"
      className={`relative w-full rounded-2xl overflow-hidden border border-emerald-900/50 bg-[#0a2015] shadow-inner text-white select-none transition-all ${className}`}
    >
      {/* Subtle ambient glow matching dark forest-green sidebar */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/40 via-transparent to-emerald-950/70 pointer-events-none" />
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Mini Header Badge - AGRI-AVATAR 3D */}
      <div className="absolute top-2.5 left-3 z-20 flex items-center gap-1.5 pointer-events-none">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider text-emerald-300 bg-emerald-950/90 backdrop-blur-xs px-2 py-0.5 rounded-md border border-emerald-700/50 uppercase">
          <Sparkles size={11} className="text-emerald-400" />
          Agri-Avatar 3D
        </span>
      </div>

      {/* Clickable Rotate 3D Control */}
      <button
        type="button"
        onClick={handleRotateClick}
        aria-label="Rotate 3D avatar"
        className="absolute bottom-2.5 right-2.5 z-30 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-emerald-950/90 hover:bg-emerald-900 active:scale-95 px-2 py-0.5 rounded-md border border-emerald-700/60 shadow-xs transition-all cursor-pointer"
      >
        <span>Rotate 3D</span>
      </button>

      {/* 3D Viewport Area with overflow cropping and 1.3x Zoom & Centering */}
      <div
        ref={containerRef}
        className="w-full h-[200px] sm:h-[220px] md:h-[240px] relative overflow-hidden flex items-center justify-center"
      >
        {/* Loading Skeleton */}
        {(!scriptLoaded || !modelReady) && !loadError && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0a2015] p-3 text-center pointer-events-none"
            aria-live="polite"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-900/60 border border-emerald-700/40 flex items-center justify-center shadow-md animate-pulse mb-2">
              <Sprout size={20} className="text-emerald-400" />
            </div>
            <p className="text-xs font-semibold text-emerald-200">Loading 3D Twin…</p>
            <p className="text-[10px] text-emerald-400/70 mt-0.5">Initializing spatial scene</p>
          </div>
        )}

        {/* Graceful Fallback */}
        {loadError && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0a2015] p-3 text-center"
            role="alert"
          >
            <AlertCircle size={20} className="text-amber-400 mb-1.5" />
            <p className="text-xs font-semibold text-amber-200">3D Scene Unavailable</p>
            <p className="text-[10px] text-amber-300/70 mt-0.5 leading-tight">
              WebGL or network restricted.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-[10px] font-medium text-white transition-colors cursor-pointer border border-emerald-600/50"
            >
              <RefreshCw size={10} />
              Retry
            </button>
          </div>
        )}

        {/* Spline Viewer Custom Element with moderate 1.3x Zoom and Centered Repositioning */}
        {scriptLoaded && !loadError && (
          <spline-viewer
            url={SPLINE_SCENE_URL}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              background: 'transparent',
              transform: 'scale(1.3) translateY(6px)',
              transformOrigin: 'center center',
            }}
          />
        )}
      </div>
    </div>
  );
}
