import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AUTO_PLAY_MS,
  agendaDescriptions,
  centerData,
  chapterCards,
  playerCards,
  slideMeta,
  stats,
  timelineMilestones,
} from "./presentationData";
import { CoverScene, InkWaveScene, PortraitMonolith } from "./components/VisualScenes";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

const pageVariants = {
  enter: (direction) => ({ opacity: 0, y: direction > 0 ? 70 : -70, scale: 0.97 }),
  center: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] } },
  exit: (direction) => ({ opacity: 0, y: direction > 0 ? -70 : 70, scale: 0.99, transition: { duration: 0.5 } }),
};

const transitionOverlayVariants = {
  initial: (direction) => ({ opacity: 0, x: direction > 0 ? 120 : -120 }),
  animate: {
    opacity: [0, 0.9, 0],
    x: 0,
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1], times: [0, 0.35, 1] },
  },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const spreadSteps = [
  ["中国", "起源与文化根基", "先秦至汉"],
  ["朝鲜半岛", "Baduk 传统逐渐成形", "5 世纪前后"],
  ["日本", "制度与理论高度成熟", "7 世纪之后"],
];

const ruleCards = [
  ["棋盘", "19×19 逐渐固定为正式比赛标准。"],
  ["开局", "从早期座子到现代空枰，布局更自由。"],
  ["计分", "中国偏面积计分，日本偏地域计分。"],
  ["劫", "防止局面无限循环，让棋局可以结束。"],
  ["贴目", "补偿白棋后手，让比赛更公平。"],
];

const ruleTable = [
  ["计分", "面积计分（子+空）", "地域计分（地+提子）"],
  ["贴目", "常见 7.5 目", "常见 6.5 目"],
  ["补棋", "通常不容易吃亏", "补得不对可能损目"],
];

const globalCards = [
  ["1979", "世界业余围棋锦标赛", "国际交流明显增强"],
  ["1982", "国际围棋联盟成立", "全球协作网络逐渐形成"],
  ["79", "公开会员国家和地区", "围棋已走出东亚"],
];

const aiMoments = [
  ["2016", "AlphaGo 4:1 李世石"],
  ["2017", "AlphaGo 3:0 柯洁"],
];

const figureCards = [
  ["本因坊算砂", "制度化", "把围棋推向职业制度与国家支持。"],
  ["吴清源", "现代革命", "以新布局改变了 20 世纪围棋思想。"],
  ["李世石", "AI 分水岭", "与 AlphaGo 的对局成为全球焦点。"],
];

const THEME_OPTIONS = [
  {
    id: "classroom",
    label: "????",
    shortLabel: "??",
    pdfBackground: "#f2e4cf",
  },
  {
    id: "ink",
    label: "????",
    shortLabel: "??",
    pdfBackground: "#1b1512",
  },
];

const DEFAULT_THEME = THEME_OPTIONS[0].id;

function App() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isAutoplay, setIsAutoplay] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? 1600 : window.innerWidth,
    height: typeof window === "undefined" ? 900 : window.innerHeight,
  }));
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    return window.localStorage.getItem("presentation-theme") || DEFAULT_THEME;
  });
  const [selectedCardId, setSelectedCardId] = useState("");
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const lockRef = useRef(false);
  const stageRef = useRef(null);
  const exportPageRefs = useRef([]);
  const controlsHideTimerRef = useRef(null);

  const active = slideMeta[index];
  const progress = useMemo(() => ((index + 1) / slideMeta.length) * 100, [index]);
  const currentTheme = useMemo(
    () => THEME_OPTIONS.find((option) => option.id === theme) || THEME_OPTIONS[0],
    [theme],
  );
  const isCompactViewport = viewport.width <= 1180 || viewport.height <= 760;
  const isMobileViewport = viewport.width <= 900;
  const isPortraitMobile = isMobileViewport && viewport.height > viewport.width;

  const goTo = (next) => {
    if (next === index || next < 0 || next >= slideMeta.length) return;
    setDirection(next > index ? 1 : -1);
    setIndex(next);
  };

  const step = (delta) => {
    const next = Math.min(slideMeta.length - 1, Math.max(0, index + delta));
    goTo(next);
  };

  const clearControlsHideTimer = () => {
    if (controlsHideTimerRef.current) {
      window.clearTimeout(controlsHideTimerRef.current);
      controlsHideTimerRef.current = null;
    }
  };

  const revealControls = (autoHide = false) => {
    setAreControlsVisible(true);
    clearControlsHideTimer();
    if (autoHide) {
      controlsHideTimerRef.current = window.setTimeout(() => {
        setAreControlsVisible(false);
      }, 2200);
    }
  };

  useEffect(() => {
    if (!isAutoplay) return undefined;
    const timer = window.setInterval(() => {
      const next = index === slideMeta.length - 1 ? 0 : index + 1;
      setDirection(next > index ? 1 : -1);
      setIndex(next);
    }, AUTO_PLAY_MS);
    return () => window.clearInterval(timer);
  }, [index, isAutoplay]);

  useEffect(() => {
    const onFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  useEffect(() => () => clearControlsHideTimer(), []);

  useEffect(() => {
    const onResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("presentation-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!isFullscreen) {
      clearControlsHideTimer();
      setAreControlsVisible(true);
      return undefined;
    }

    revealControls(true);

    const onPointerActivity = () => {
      revealControls(true);
    };

    window.addEventListener("mousemove", onPointerActivity, { passive: true });
    window.addEventListener("touchstart", onPointerActivity, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onPointerActivity);
      window.removeEventListener("touchstart", onPointerActivity);
      clearControlsHideTimer();
    };
  }, [isFullscreen]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        step(1);
      }
      if (["ArrowUp", "ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        step(-1);
      }
      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        toggleFullscreen();
      }
      if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        setIsAutoplay((value) => !value);
      }
    };

    const onWheel = (event) => {
      if (lockRef.current || Math.abs(event.deltaY) < 20) return;
      lockRef.current = true;
      step(event.deltaY > 0 ? 1 : -1);
      window.setTimeout(() => {
        lockRef.current = false;
      }, 800);
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("wheel", onWheel);
    };
  }, [index]);

  useEffect(() => {
    const resolveCardId = (node) => {
      let current = node;
      while (current) {
        if (current.dataset && current.dataset.cardId) return current.dataset.cardId;
        current = current.parentElement;
      }
      return "";
    };

    const onSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelectedCardId("");
        return;
      }
      const anchorElement = selection.anchorNode?.nodeType === Node.TEXT_NODE ? selection.anchorNode.parentElement : selection.anchorNode;
      setSelectedCardId(resolveCardId(anchorElement));
    };

    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  const handlePdfExport = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const pages = exportPageRefs.current.filter(Boolean);
      if (!pages.length) {
        throw new Error("未找到可导出的页面节点");
      }

      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1600, 900] });

      for (let i = 0; i < pages.length; i += 1) {
        const canvas = await html2canvas(pages[i], {
          backgroundColor: currentTheme.pdfBackground,
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: 1600,
          windowHeight: 900,
        });

        const image = canvas.toDataURL("image/png", 1);
        if (i > 0) {
          pdf.addPage([1600, 900], "landscape");
        }
        pdf.addImage(image, "PNG", 0, 0, 1600, 900, undefined, "FAST");
      }

      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "围棋发展史-演示稿.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("PDF export failed:", error);
      window.alert(`PDF 导出失败：${error.message || "未知错误"}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleStageClick = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (window.getSelection && !window.getSelection()?.isCollapsed) return;
    if (target.closest("button, a, input, textarea, select, [data-card-id], .control-chip, .theme-control-panel")) return;
    step(1);
  };
  const toggleFullscreen = async () => {
    const stage = stageRef.current;
    if (!stage) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await stage.requestFullscreen();
  };

  return (
    <>
      <div className={`presentation-shell theme-shell theme-${theme} screen-only min-h-screen overflow-hidden bg-ink text-white`}>
        <Backdrop />
        <div className={`presentation-center relative z-10 flex min-h-screen items-center justify-center px-6 py-6 lg:px-10 ${isCompactViewport ? "presentation-center-compact" : ""}`}>
          <div className={`stage-frame presentation-stage-frame relative w-full max-w-[1600px] ${isCompactViewport ? "presentation-stage-frame-compact" : ""}`} ref={stageRef}>
            <div className="top-progress-line pointer-events-none absolute left-3 right-3 top-3 h-[3px] overflow-visible rounded-full bg-white/12">
              <motion.div animate={{ width: `${progress}%` }} className="top-progress-fill h-full rounded-full bg-gradient-to-r from-[var(--paper)] via-[var(--paper)] to-[var(--accent)]" transition={{ duration: 0.6 }} />
            </div>
            <div className={`theme-stage-surface presentation-stage-surface relative aspect-[16/9] overflow-hidden rounded-[36px] border border-white/35 bg-[rgba(176,132,97,0.22)] shadow-glow backdrop-blur-sm ${isCompactViewport ? "presentation-stage-surface-compact" : ""}`} onClick={handleStageClick} role="presentation">
              <StageDecor />
              <GoTransitionLayer slideKey={active.id} direction={direction} />
              <LeftLabel label={active.label} compact={isCompactViewport} />
              <TopInfo active={active} index={index} compact={isCompactViewport} />
              <ControlPanel
                isAutoplay={isAutoplay}
                isFullscreen={isFullscreen}
                onAutoplay={() => setIsAutoplay((value) => !value)}
                onFullscreen={toggleFullscreen}
                onPrint={handlePdfExport}
                isExporting={isExporting}
                theme={theme}
                onThemeChange={setTheme}
                compact={isCompactViewport}
                visible={areControlsVisible}
              />
              <div className={`slide-stage-content absolute inset-0 z-10 pl-20 pr-24 ${isCompactViewport ? "slide-stage-content-compact" : ""}`}>
                <AnimatePresence initial={false} mode="wait" custom={direction}>
                  <motion.div key={active.id} custom={direction} variants={pageVariants} initial="enter" animate="center" exit="exit" className="h-full w-full">
                    <SlideRenderer index={index} selectedCardId={selectedCardId} />
                  </motion.div>
                </AnimatePresence>
              </div>
              <NavigationDots current={index} onSelect={goTo} compact={isCompactViewport} />
            </div>
          </div>
        </div>
        {isPortraitMobile ? (
          <MobileViewportNotice
            active={active}
            current={index}
            total={slideMeta.length}
            onNext={() => step(1)}
            onPrev={() => step(-1)}
          />
        ) : null}
      </div>
      <PrintDeck theme={theme} />
      <PdfCaptureDeck pageRefs={exportPageRefs} theme={theme} />
    </>
  );
}

function PdfCaptureDeck({ pageRefs, theme }) {
  return (
    <div className={`pdf-capture-deck theme-shell theme-${theme}`} aria-hidden="true">
      {slideMeta.map((slide, idx) => (
        <section
          key={`capture-${slide.id}`}
          ref={(node) => {
            pageRefs.current[idx] = node;
          }}
          className="pdf-capture-page"
        >
          <div className="pdf-capture-inner">
            <div className="print-header">
              <span>{slide.kicker}</span>
              <span>{String(idx + 1).padStart(2, "0")} / {String(slideMeta.length).padStart(2, "0")}</span>
            </div>
            <ExportTopInfo active={slide} />
            <div className="absolute inset-0 z-10 pl-20 pr-24">
              <SlideRenderer index={idx} selectedCardId="" exportMode />
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function PrintDeck({ theme }) {
  return (
    <div className={`print-only print-deck theme-shell theme-${theme}`}>
      {slideMeta.map((slide, idx) => (
        <section key={slide.id} className="print-slide">
          <div className="print-slide-inner">
            <div className="print-header">
              <span>{slide.kicker}</span>
              <span>{String(idx + 1).padStart(2, "0")} / {String(slideMeta.length).padStart(2, "0")}</span>
            </div>
            <ExportTopInfo active={slide} />
            <div className="print-frame absolute inset-0 z-10 pl-20 pr-24">
              <SlideRenderer index={idx} selectedCardId="" exportMode />
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function GoTransitionLayer({ slideKey, direction }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={slideKey}
        custom={direction}
        variants={transitionOverlayVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
      >
        <motion.div
          className="go-transition-sweep"
          initial={{ x: direction > 0 ? "-24%" : "24%", opacity: 0 }}
          animate={{ x: direction > 0 ? "118%" : "-118%", opacity: [0, 0.55, 0] }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.div
          className="go-transition-ink"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.2, 0] }}
          transition={{ duration: 0.75, times: [0, 0.35, 1] }}
        />
        <motion.div
          className={`go-transition-stone ${direction > 0 ? "go-transition-stone-forward" : "go-transition-stone-backward"}`}
          initial={{ scale: 0.35, opacity: 0 }}
          animate={{ scale: [0.35, 1.1, 1.75], opacity: [0, 0.95, 0] }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.div
          className={`go-transition-ripple ${direction > 0 ? "go-transition-ripple-forward" : "go-transition-ripple-backward"}`}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: [0.3, 1.2, 2.1], opacity: [0, 0.35, 0] }}
          transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
        />
      </motion.div>
    </AnimatePresence>
  );
}

function Backdrop() {
  return (
    <div className="theme-backdrop pointer-events-none absolute inset-0 overflow-hidden">
      <div className="theme-backdrop-base absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,240,214,0.9),_transparent_36%),radial-gradient(circle_at_78%_26%,_rgba(240,138,93,0.18),_transparent_28%),radial-gradient(circle_at_20%_80%,_rgba(223,244,234,0.42),_transparent_26%),linear-gradient(135deg,_#fffaf1_0%,_#fff1db_48%,_#fde2c3_100%)]" />
      <div className="theme-backdrop-top absolute inset-x-0 top-[-18%] h-[42rem] rounded-full bg-[rgba(255,228,183,0.36)] blur-3xl" />
      <div className="theme-backdrop-bottom absolute bottom-[-20%] right-[-8%] h-[36rem] w-[36rem] rounded-full bg-[rgba(240,138,93,0.18)] blur-3xl" />
    </div>
  );
}

function StageDecor() {
  return (
    <>
      <div className="theme-stage-wash absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),transparent_18%,transparent_82%,rgba(255,255,255,0.12))]" />
      <div className="theme-stage-ring-a absolute right-[12%] top-[12%] h-56 w-56 rounded-full border border-white/40 opacity-25" />
      <div className="theme-stage-ring-b absolute bottom-[10%] left-[10%] h-40 w-40 rounded-full border border-[rgba(240,138,93,0.2)] opacity-40" />
      <div className="theme-stage-glow-a absolute bottom-[-6%] right-[22%] h-56 w-56 rounded-full bg-[rgba(240,138,93,0.15)] blur-3xl" />
      <div className="theme-stage-glow-b absolute left-[15%] top-[18%] h-32 w-32 rounded-full bg-[rgba(223,244,234,0.45)] blur-3xl" />
      <div className="board-pattern absolute bottom-10 right-14 h-40 w-40 opacity-30" />
    </>
  );
}

function LeftLabel({ label, compact = false }) {
  return (
    <div className={`label-rail absolute inset-y-0 left-0 flex items-center justify-center border-r border-white/20 bg-[rgba(255,250,241,0.2)] ${compact ? "w-12" : "w-20"}`}>
      <div className={`label-rail-text flex flex-col items-center text-[10px] uppercase text-[rgba(95,66,48,0.45)] [writing-mode:vertical-rl] ${compact ? "gap-2 tracking-[0.35em]" : "gap-4 tracking-[0.6em]"}`}>
        {!compact ? <span>World History of Go</span> : null}
        <span className="text-[rgba(95,66,48,0.72)]">{label}</span>
      </div>
    </div>
  );
}

function TopInfo({ active, index, compact = false }) {
  return (
    <>
      <div className={`top-info-wrap absolute z-30 ${compact ? "left-14 top-4" : "left-24 top-6"}`}>
        <div className={`top-info-card rounded-[20px] border border-white/40 bg-[rgba(244,231,210,0.88)] shadow-[0_12px_28px_rgba(240,138,93,0.12)] backdrop-blur-md ${compact ? "px-3 py-2" : "px-4 py-2.5"}`}>
          <p className="text-[10px] uppercase tracking-[0.42em] text-[rgba(95,66,48,0.42)]">Now Showing</p>
          <p className={`mt-1.5 font-display text-[rgba(91,61,42,0.9)] ${compact ? "text-[1.1rem]" : "text-[1.6rem]"}`}>{active.kicker}</p>
          <p className={`mt-1.5 text-[rgba(91,61,42,0.62)] ${compact ? "max-w-[14rem] text-[11px] leading-4" : "max-w-[24rem] text-[13px] leading-5"}`}>{active.summary}</p>
        </div>
      </div>
      <div className={`slide-index absolute z-30 text-right ${compact ? "right-4 top-4" : "right-6 top-6"}`}>
        <p className="text-[10px] uppercase tracking-[0.45em] text-[rgba(95,66,48,0.4)]">Slide</p>
        <p className="text-xl font-light text-[rgba(91,61,42,0.88)]">
          {String(index + 1).padStart(2, "0")}
          <span className="ml-1 text-sm text-[rgba(95,66,48,0.36)]">/ {String(slideMeta.length).padStart(2, "0")}</span>
        </p>
      </div>
    </>
  );
}

function ExportTopInfo({ active }) {
  return (
    <>
      <div className="absolute left-24 top-6 z-30">
        <div className="export-top-info-card rounded-[20px] border border-white/40 bg-[rgba(244,231,210,0.9)] px-4 py-2.5 shadow-[0_10px_30px_rgba(240,138,93,0.12)]">
          <p className="text-[10px] uppercase tracking-[0.42em] text-[rgba(95,66,48,0.42)]">Now Showing</p>
          <p className="mt-1.5 font-display text-[1.6rem] text-[rgba(91,61,42,0.9)]">{active.kicker}</p>
          <p className="mt-1.5 max-w-[24rem] text-[13px] leading-5 text-[rgba(91,61,42,0.62)]">{active.summary}</p>
        </div>
      </div>

    </>
  );
}
function ControlPanel({ isAutoplay, isFullscreen, onAutoplay, onFullscreen, onPrint, isExporting, theme, onThemeChange, compact = false, visible = true }) {
  return (
    <div className={`theme-control-panel absolute z-30 flex gap-3 transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"} ${compact ? "left-4 right-4 bottom-4 flex-row flex-wrap items-start justify-start" : "right-6 top-24 flex-col"}`}>
      <button className="control-chip" onClick={onAutoplay} type="button">
        <span className={`status-dot ${isAutoplay ? "status-dot-active" : ""}`} />
        {isAutoplay ? "Pause Auto" : "Auto Play"}
      </button>
      <button className="control-chip" onClick={onFullscreen} type="button">
        {isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
      </button>
      <button className="control-chip" onClick={onPrint} type="button">{isExporting ? "导出中..." : "导出 PDF"}</button>
      <div className="theme-picker rounded-[22px] border border-white/30 bg-white/10 p-3 backdrop-blur-md">
        <p className="theme-picker-label text-[10px] uppercase tracking-[0.32em] text-white/50">风格选择</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.id}
              className={`theme-chip ${theme === option.id ? "theme-chip-active" : ""}`}
              onClick={() => onThemeChange(option.id)}
              type="button"
            >
              <span className={`theme-chip-swatch theme-chip-swatch-${option.id}`} />
              {option.shortLabel}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function NavigationDots({ current, onSelect, compact = false }) {
  return (
    <div className={`navigation-dots absolute z-30 flex gap-3 ${compact ? "bottom-[5.2rem] left-1/2 -translate-x-1/2 flex-row items-center" : "right-7 top-1/2 -translate-y-1/2 flex-col"}`}>
      {slideMeta.map((slide, idx) => (
        <button key={slide.id} aria-label={`jump-${slide.id}`} className="group flex items-center justify-end gap-3" onClick={() => onSelect(idx)} type="button">
          <span className={`text-[10px] uppercase tracking-[0.35em] transition ${compact ? "hidden" : ""} ${current === idx ? "text-[var(--paper)]" : "text-white/0 group-hover:text-white/45"}`}>
            {String(idx + 1).padStart(2, "0")}
          </span>
          <span className={`block rounded-full transition-all duration-300 ${compact ? (current === idx ? "h-[3px] w-7 bg-[var(--paper)] shadow-[0_0_18px_rgba(237,235,237,0.35)]" : "h-[3px] w-3 bg-white/25 group-hover:w-5") : (current === idx ? "h-8 w-[3px] bg-[var(--paper)] shadow-[0_0_24px_rgba(237,235,237,0.4)]" : "h-3 w-[3px] bg-white/25 group-hover:h-5")}`} />
        </button>
      ))}
    </div>
  );
}
function SlideRenderer({ index, selectedCardId, exportMode = false }) {
  switch (index) {
    case 0: return <CoverSlide selectedCardId={selectedCardId} />;
    case 1: return <AgendaSlide selectedCardId={selectedCardId} />;
    case 2: return <OriginSlide />;
    case 3: return <SpreadSlide />;
    case 4: return <TimelineSlide />;
    case 5: return <RulesSlide selectedCardId={selectedCardId} />;
    case 6: return <CentersSlide exportMode={exportMode} />;
    case 7: return <GlobalSlide selectedCardId={selectedCardId} />;
    case 8: return <AiSlide />;
    case 9: return <PlayersSlide selectedCardId={selectedCardId} />;
    case 10: return <FiguresSlide />;
    default: return <EndingSlide />;
  }
}

function SlideFrame({ eyebrow, title, subtitle, children, className = "" }) {
  return (
    <motion.section variants={containerVariants} initial="hidden" animate="show" className={`slide-frame-base flex h-full flex-col px-12 py-12 ${className}`}>
      <motion.div variants={itemVariants} className="slide-frame-header mb-8 mt-20 max-w-4xl">
        {eyebrow ? <p className="mb-3 text-[11px] uppercase tracking-[0.42em] text-[var(--paper)]/75">{eyebrow}</p> : null}
        <h2 className="font-display text-[2.35rem] leading-[1.08] text-white md:text-[2.8rem]">{title}</h2>
        {subtitle ? <p className="mt-3 max-w-[42rem] text-[15px] leading-6 text-white/70">{subtitle}</p> : null}
      </motion.div>
      <div className="flex-1">{children}</div>
    </motion.section>
  );
}

function MobileViewportNotice({ active, current, total, onNext, onPrev }) {
  return (
    <div className="mobile-viewport-notice absolute inset-0 z-40 flex items-center justify-center px-5 py-6">
      <div className="mobile-viewport-card w-full max-w-sm rounded-[28px] border border-white/40 bg-[rgba(255,248,236,0.94)] p-5 shadow-[0_24px_60px_rgba(125,84,57,0.18)] backdrop-blur-xl">
        <p className="text-[11px] uppercase tracking-[0.34em] text-[rgba(95,66,48,0.45)]">Mobile View</p>
        <h3 className="mt-3 font-display text-[1.7rem] leading-tight text-[rgba(91,61,42,0.92)]">??????</h3>
        <p className="mt-3 text-[14px] leading-6 text-[rgba(91,61,42,0.68)]">
          ???? 16:9 ??????? 14 Pro Max ????????????????????? PPT ???
        </p>
        <div className="mt-5 rounded-[22px] border border-[rgba(240,138,93,0.18)] bg-[rgba(255,255,255,0.55)] p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[rgba(95,66,48,0.45)]">????</p>
          <p className="mt-2 text-[1.1rem] font-semibold text-[rgba(91,61,42,0.88)]">{active.kicker}</p>
          <p className="mt-2 text-[13px] leading-5 text-[rgba(91,61,42,0.64)]">{active.summary}</p>
          <p className="mt-3 text-[12px] tracking-[0.2em] text-[rgba(95,66,48,0.42)]">
            {String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="control-chip justify-center" onClick={onPrev} type="button">???</button>
          <button className="control-chip justify-center" onClick={onNext} type="button">???</button>
        </div>
      </div>
    </div>
  );
}

function MediaPlaceholder({ title, caption, accent = "paper" }) {
  return (
    <div className={`media-placeholder media-placeholder-${accent}`}>
      <div className="media-placeholder-grid" />
      <div className="media-placeholder-content">
        <p className="media-placeholder-kicker">可替换素材位</p>
        <h4>{title}</h4>
        <p>{caption}</p>
      </div>
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur">
      <p className="font-display text-[2.1rem] text-[var(--paper)]">{value}</p>
      <p className="mt-1.5 text-[11px] tracking-[0.16em] text-white/46">{label}</p>
    </div>
  );
}

function CoverSlide({ selectedCardId }) {
  return (
    <SlideFrame eyebrow="Classroom Presentation" title="围棋发展史" subtitle="一枚黑子、一枚白子，走过中国起源、日本制度化、韩国竞技崛起，再走向全球与 AI 共学的新时代。" className="justify-between">
      <div className="grid h-full grid-cols-[1.1fr_0.9fr] gap-10">
        <motion.div variants={itemVariants} className="flex flex-col justify-between pb-6">
          <div className="space-y-5">
            <p className="max-w-[38rem] text-[16px] leading-7 text-white/76">这是一场面向高年级小学生的 12 页沉浸式课堂演示，像看一场发布会一样，认识古老而常新的东方智慧。</p>
            <div className="grid max-w-2xl grid-cols-2 gap-4">{stats.map((stat) => <StatCard key={stat.label} value={stat.value} label={stat.label} />)}</div>
          </div>
          <div className="flex items-center gap-5 text-[12px] text-white/48">
            <span>主题风格：东方美学</span>
            <span>展示场景：课堂汇报</span>
            <span>主要受众：高年级小学生</span>
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="relative flex items-center justify-center"><CoverScene /></motion.div>
      </div>
    </SlideFrame>
  );
}

function AgendaSlide({ selectedCardId }) {
  return (
    <SlideFrame eyebrow="" title="12 页看懂围棋发展主线" subtitle="先记住五个章节，再进入后面的详细内容。">
      <div className="grid h-full grid-cols-[0.86fr_1.14fr] gap-5">
        <motion.div variants={itemVariants} className={`selectable-card flex flex-col justify-between rounded-[28px] border border-white/10 bg-white/5 p-6 ${selectedCardId === "agenda-overview" ? "selected-card" : ""}`} data-card-id="agenda-overview">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-[var(--paper)]/70">五个章节</p>
            <div className="mt-5 space-y-4">
              {chapterCards.map(([title, desc], idx) => (
                <div key={title} className="flex gap-3">
                  <span className="mt-1 text-[11px] text-[var(--paper)]/75">0{idx + 1}</span>
                  <div>
                    <p className="text-[16px] font-medium text-white">{title}</p>
                    <p className="mt-1 text-[13px] leading-[1.45] text-white/55">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="max-w-sm text-[12px] leading-5 text-white/40">这一页不展示全部 12 屏细节，而是先建立课堂叙事结构。</p>
        </motion.div>
        <motion.div variants={itemVariants} className="grid h-full grid-cols-2 gap-3">
          {chapterCards.map(([title, desc], idx) => (
            <div key={title} data-card-id={`agenda-chapter-${idx}`} className={`selectable-card group relative min-h-[8.4rem] overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br from-white/8 to-white/0 p-4 ${selectedCardId === `agenda-chapter-${idx}` ? "selected-card" : ""}`}>
              <div className="absolute inset-0 translate-y-full bg-gradient-to-t from-[rgba(99,70,47,0.18)] to-transparent transition duration-500 group-hover:translate-y-0" />
              <div className="relative">
                <p className="text-[11px] tracking-[0.35em] text-white/35">{String(idx + 1).padStart(2, "0")}</p>
                <h3 className="mt-2 font-display text-[1.2rem] leading-tight text-white">{title}</h3>
                <p className="mt-1 text-[13px] leading-[1.45] text-white/55">{desc}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </SlideFrame>
  );
}

function OriginSlide() {
  return (
    <SlideFrame eyebrow="" title="围棋起源于中国，但传说和史实要分开看" subtitle="“尧造围棋教子”很有名，但更可靠的说法是：至少在春秋时期，围棋已经存在。">
      <div className="grid h-full grid-cols-[1fr_1fr] gap-6">
        <motion.div variants={itemVariants} className="rounded-[30px] border border-[rgba(237,235,237,0.16)] bg-[linear-gradient(180deg,rgba(237,235,237,0.1),rgba(255,255,255,0.03))] p-8">
          <p className="text-[11px] uppercase tracking-[0.4em] text-[var(--paper)]/75">传说层</p>
          <h3 className="mt-6 font-display text-3xl text-white">尧造围棋教子</h3>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-white/70">这说明古人愿意把围棋和教育、修养联系在一起，但它更像文化故事，不是已经被直接证明的历史事实。</p>
        </motion.div>
        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/5 p-8">
          <div className="absolute inset-0 opacity-80"><InkWaveScene /></div>
          <div className="relative">
            <p className="text-[11px] uppercase tracking-[0.4em] text-[var(--paper)]/75">史实层</p>
            <h3 className="mt-6 font-display text-3xl text-white">至少可追到春秋时期</h3>
            <div className="mt-5 space-y-4 text-[14px] leading-6 text-white/70">
              <p>《左传》等古籍里，已经能看到早期弈棋线索。</p>
              <p>先秦两汉以后，围棋从贵族娱乐变成士人修养的一部分。</p>
              <p>后来它与琴、书、画并称，成为中国传统文化身份的一部分。</p>
            </div>
          </div>
        </motion.div>
      </div>
    </SlideFrame>
  );
}

function SpreadSlide() {
  return (
    <SlideFrame eyebrow="" title="一项中国游戏，慢慢长成东亚共同文化" subtitle="围棋每到一个地方，都会和当地的制度、审美和教育方式结合。">
      <div className="grid h-full grid-cols-[1.2fr_0.8fr] gap-6">
        <motion.div variants={itemVariants} className="relative rounded-[30px] border border-white/10 bg-white/5 p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(237,235,237,0.08),transparent_55%)]" />
          <div className="relative flex h-full items-center justify-between px-6">
            {spreadSteps.map(([title, desc, year], idx) => (
              <div key={title} className="relative flex w-[30%] flex-col items-center text-center">
                <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full border border-[rgba(237,235,237,0.2)] bg-black/30 font-display text-2xl text-white">{title}</div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--paper)]/65">{year}</p>
                <p className="mt-2 text-xs leading-5 text-white/58">{desc}</p>
                {idx < 2 ? <div className="absolute left-[78%] top-12 h-px w-[68%] bg-gradient-to-r from-[rgba(237,235,237,0.85)] to-transparent" /> : null}
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="grid gap-5">
          <MediaPlaceholder title="东亚传播地图" caption="这里可以替换成中国、朝鲜半岛、日本之间的地图动画或课堂插图。" accent="paper" />
          <div className="rounded-[26px] border border-white/10 bg-black/18 p-4">
            <h3 className="font-display text-[1.4rem] text-white">17×17 到 19×19</h3>
            <p className="mt-3 text-sm leading-7 text-white/60">早期棋盘并不完全统一，到唐代前后 19 路逐渐成为主流。</p>
          </div>
        </motion.div>
      </div>
    </SlideFrame>
  );
}
function TimelineSlide() {
  return (
    <SlideFrame eyebrow="" title="把三千多年历史压缩成一条会发光的时间线" subtitle="只要记住这些关键年份，就能快速把握围棋发展的大方向。">
      <div className="relative mt-3 h-full rounded-[34px] border border-white/10 bg-white/5 p-7">
        <div className="absolute left-12 right-12 top-1/2 h-px bg-gradient-to-r from-transparent via-[rgba(237,235,237,0.76)] to-transparent" />
        <div className="relative grid h-full grid-cols-4 gap-x-5 gap-y-6">
          {timelineMilestones.map((item, idx) => (
            <motion.div key={item.year} variants={itemVariants} className={`relative rounded-[22px] border p-4 ${idx % 2 === 0 ? "self-start border-[rgba(237,235,237,0.18)] bg-[rgba(237,235,237,0.06)]" : "self-end border-white/10 bg-black/18"}`}>
              <div className={`absolute left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border ${idx % 2 === 0 ? "-bottom-7 border-[var(--paper)] bg-[var(--paper)]" : "-top-7 border-white/60 bg-white/70"}`} />
              <p className="text-sm uppercase tracking-[0.28em] text-[var(--paper)]/72">{item.year}</p>
              <p className="mt-3 text-[13px] leading-6 text-white/68">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </SlideFrame>
  );
}

function RulesSlide({ selectedCardId }) {
  return (
    <SlideFrame eyebrow="" title="围棋规则，怎样一步步变得更公平" subtitle="先抓住三个关键变化，再看中国和日本规则的主要差别。">
      <div className="grid h-full grid-cols-[0.92fr_1.08fr] gap-6">
        <motion.div variants={itemVariants} className="grid grid-rows-3 gap-3">
          {ruleCards.slice(0, 3).map(([title, desc]) => (
            <div key={title} data-card-id={`rules-${title}`} className={`selectable-card rounded-[24px] border border-white/10 bg-white/5 p-4 ${selectedCardId === `rules-${title}` ? "selected-card" : ""}`}>
              <p className="text-[10px] uppercase tracking-[0.32em] text-[var(--paper)]/68">{title}</p>
              <p className="mt-2 font-display text-[1.1rem] text-white">规则升级</p>
              <p className="mt-2 text-[11px] leading-5 text-white/58">{desc}</p>
            </div>
          ))}
        </motion.div>
        <motion.div variants={itemVariants} className={`selectable-card rounded-[30px] border border-white/10 bg-black/20 p-5 ${selectedCardId === "rules-table" ? "selected-card" : ""}`} data-card-id="rules-table">
          <h3 className="font-display text-[1.55rem] leading-tight text-white">中国规则 vs 日本规则</h3>
          <div className="mt-4 grid gap-2 text-[11px] leading-5">
            {ruleTable.map(([k, left, right]) => (
              <div key={k} className="grid grid-cols-[0.22fr_0.39fr_0.39fr] overflow-hidden rounded-2xl border border-white/8">
                <div className="bg-white/6 px-3 py-2.5 text-white/75">{k}</div>
                <div className="bg-[rgba(237,235,237,0.1)] px-3 py-2.5 text-white/72">{left}</div>
                <div className="bg-[rgba(99,70,47,0.18)] px-3 py-2.5 text-white/72">{right}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] leading-5 text-white/56">
            <div className="rounded-2xl border border-white/8 bg-white/5 p-3">劫规则的目标是避免无限循环。</div>
            <div className="rounded-2xl border border-white/8 bg-white/5 p-3">贴目制度让先后手更接近平衡。</div>
          </div>
        </motion.div>
      </div>
    </SlideFrame>
  );
}

function CentersSlide({ exportMode = false }) {
  return (
    <SlideFrame eyebrow="" title="三大中心如何接力推动围棋" subtitle="中国重起源，日本重制度，韩国重竞技。">
      <div className="grid h-full grid-cols-[0.9fr_1.1fr] gap-5">
        <motion.div variants={itemVariants} className="rounded-[30px] border border-white/10 bg-white/5 p-5">
          {exportMode ? (
            <div className="mt-3 flex h-[18.5rem] items-end gap-6 px-4 pb-4">
              {centerData.map((item) => (
                <div key={item.name} className="flex flex-1 flex-col items-center gap-3">
                  <div className="w-full rounded-[18px] border border-white/10 bg-black/18 p-2">
                    <div className="flex h-52 items-end rounded-[14px] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] px-3 pb-3">
                      <div className="w-full rounded-[12px] bg-[linear-gradient(180deg,#edebed_0%,#63462f_100%)]" style={{ height: `${item.value}%` }} />
                    </div>
                  </div>
                  <p className="text-center text-[12px] tracking-[0.08em] text-white/64">{item.name}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 h-[18.5rem] w-full">
              <ResponsiveContainer>
                <BarChart data={centerData}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={{ background: "rgba(32,24,19,0.95)", border: "1px solid rgba(237,235,237,0.16)", borderRadius: 16 }} />
                  <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="url(#barGradient)" />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#edebed" />
                      <stop offset="100%" stopColor="#63462f" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
        <motion.div variants={itemVariants} className="grid gap-3">
          {centerData.map((item) => (
            <div key={item.name} className="rounded-[26px] border border-white/10 bg-black/18 p-4">
              <div className="flex items-end justify-between gap-6">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">{item.role}</p>
                  <h3 className="mt-2 font-display text-[1.6rem] text-white">{item.name}</h3>
                </div>
                <p className="font-display text-[2.5rem] text-[var(--paper)]/90">{item.value}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </SlideFrame>
  );
}

function GlobalSlide({ selectedCardId }) {
  return (
    <SlideFrame eyebrow="" title="围棋怎样走向全球" subtitle="三个关键数字，加上一张世界传播主视觉，就能看懂这一页。">
      <div className="grid h-full grid-cols-[0.82fr_1.18fr] gap-5">
        <motion.div variants={itemVariants} className="grid gap-3">
          {globalCards.map(([num, title, desc]) => (
            <div key={title} data-card-id={`global-${num}`} className={`selectable-card rounded-[26px] border border-white/10 bg-white/5 p-4 ${selectedCardId === `global-${num}` ? "selected-card" : ""}`}>
              <p className="font-display text-[2.3rem] leading-none text-[var(--paper)]">{num}</p>
              <h3 className="mt-2 text-base text-white">{title}</h3>
              <p className="mt-1 text-[11px] leading-5 text-white/56">{desc}</p>
            </div>
          ))}
        </motion.div>
        <motion.div variants={itemVariants} className={`selectable-card relative overflow-hidden rounded-[34px] border border-white/10 bg-black/20 p-5 ${selectedCardId === "global-media" ? "selected-card" : ""}`} data-card-id="global-media">
          <div className="relative flex h-full flex-col justify-between gap-3">
            <h3 className="font-display text-[1.5rem] leading-tight text-white">从东亚经典技艺到全球认知训练工具</h3>
            <MediaPlaceholder title="世界围棋地图 / 国际赛事图片" caption="可替换为国际围棋联盟、世界业余锦标赛或海外围棋课堂图片。" accent="accent" />
          </div>
        </motion.div>
      </div>
    </SlideFrame>
  );
}

function AiSlide() {
  return (
    <SlideFrame eyebrow="" title="2016 年之后，围棋不再只是人与人的学习系统" subtitle="AlphaGo 先后击败樊麾、李世石、柯洁，人们发现：机器不只会下棋，还会重新定义什么是好棋。">
      <div className="grid h-full grid-cols-[1fr_1fr] gap-6">
        <motion.div variants={itemVariants} className="rounded-[30px] border border-[rgba(237,235,237,0.18)] bg-[linear-gradient(180deg,rgba(237,235,237,0.1),rgba(255,255,255,0.02))] p-6">
          <div className="mt-6 space-y-4">
            {aiMoments.map(([year, title]) => (
              <div key={title} className="rounded-[22px] border border-white/10 bg-black/18 p-4">
                <p className="font-display text-[2rem] text-white">{year}</p>
                <h3 className="mt-2 text-[1rem] text-white">{title}</h3>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="grid gap-3">
          <MediaPlaceholder title="AlphaGo 对局截图 / 视频封面" caption="这里可以替换成李世石第 4 局、柯洁乌镇对局等经典画面。" accent="paper" />
          <div className="rounded-[26px] border border-white/10 bg-white/5 p-4">
            <h3 className="font-display text-[1.4rem] text-white">训练方式被改变</h3>
            <p className="mt-3 text-[13px] leading-6 text-white/58">职业棋手开始大量使用 AI 复盘、备战、研究布局，很多旧判断被重新评估。</p>
          </div>
        </motion.div>
      </div>
    </SlideFrame>
  );
}

function PlayersSlide({ selectedCardId }) {
  const featuredPlayers = playerCards.slice(0, 4);

  return (
    <SlideFrame eyebrow="" title="这些棋手，像一面围棋名人墙" subtitle="这一页只保留四位代表人物，突出制度、革新、复兴与崛起。">
      <div className="grid h-full grid-cols-[0.56fr_1.44fr] gap-4">
        <motion.div variants={itemVariants} data-card-id="players-monolith" className={`selectable-card overflow-hidden rounded-[30px] ${selectedCardId === "players-monolith" ? "selected-card" : ""}`}>
          <PortraitMonolith />
        </motion.div>
        <div className="grid h-full grid-cols-2 gap-3">
          {featuredPlayers.map(([name, title, desc]) => (
            <motion.div key={name} data-card-id={`player-${name}`} variants={itemVariants} className={`selectable-card group player-wall-card relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-5 ${selectedCardId === `player-${name}` ? "selected-card" : ""}`}>
              <div className="relative flex h-full flex-col justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.34em] text-white/38">Featured</p>
                  <h3 className="mt-3 font-display text-[1.35rem] leading-tight text-white">{name}</h3>
                  <p className="mt-2 text-sm text-[var(--paper)]/82">{title}</p>
                </div>
                <p className="text-[11px] leading-5 text-white/56">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </SlideFrame>
  );
}

function FiguresSlide() {
  return (
    <SlideFrame eyebrow="" title="三位关键人物，看懂围棋历史的三个转折点" subtitle="算砂代表制度化，吴清源代表现代革命，李世石代表 AI 分水岭。">
      <div className="grid h-full grid-cols-3 gap-6">
        {figureCards.map(([name, tag, desc], idx) => (
          <motion.div key={name} variants={itemVariants} className="relative overflow-hidden rounded-[30px] border border-white/10 bg-black/18 p-5">
            <div className={`absolute inset-x-0 top-0 h-1 ${idx === 0 ? "bg-[var(--paper)]" : idx === 1 ? "bg-white/70" : "bg-[var(--accent)]"}`} />
            <p className="text-[11px] uppercase tracking-[0.35em] text-white/38">{tag}</p>
            <h3 className="mt-6 font-display text-[2rem] leading-tight text-white">{name}</h3>
            <p className="mt-4 text-[13px] leading-6 text-white/60">{desc}</p>
          </motion.div>
        ))}
      </div>
    </SlideFrame>
  );
}

function EndingSlide() {
  return (
    <SlideFrame eyebrow="" title="一句话记住整段历史" subtitle="围棋起源于中国，在日本完成近世制度化，在韩国和中国的现代竞争中走向世界高峰，并在 AI 时代进入全新研究范式。" className="justify-between">
      <div className="grid h-full grid-cols-[1.08fr_0.92fr] gap-6">
        <motion.div variants={itemVariants} className="flex flex-col justify-between rounded-[32px] border border-white/10 bg-white/5 p-7">
          <div className="mt-4 space-y-3 text-[15px] leading-6 text-white/70">
            <p>从不统一的古代棋盘，到标准化的 19 路。</p>
            <p>从旧式座子开局，到今天常见的空枰对弈。</p>
            <p>从传统师徒经验，到 AI 辅助研究和复盘。</p>
          </div>
          <p className="font-display text-[2.1rem] leading-tight text-white">围棋不只是会不会走，也是人类怎样思考的一部历史。</p>
        </motion.div>
        <motion.div variants={itemVariants} className="relative flex items-center justify-center overflow-hidden rounded-[32px] border border-[rgba(237,235,237,0.18)] bg-[linear-gradient(180deg,rgba(237,235,237,0.12),rgba(255,255,255,0.02))] p-8">
          <div className="relative text-center">
            <p className="text-[11px] uppercase tracking-[0.42em] text-white/45">Thank You</p>
            <h3 className="mt-5 font-display text-[3.4rem] leading-none text-white">落子<span className="block text-[var(--paper)]">见世界</span></h3>
          </div>
        </motion.div>
      </div>
    </SlideFrame>
  );
}

export default App;


























































