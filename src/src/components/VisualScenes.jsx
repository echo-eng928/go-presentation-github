export function CoverScene() {
  return (
    <div className="scene-orbit relative flex h-full items-center justify-center">
      <div className="scene-ring scene-ring-1" />
      <div className="scene-ring scene-ring-2" />
      <div className="scene-ring scene-ring-3" />
      <div className="absolute left-[14%] top-[14%] h-16 w-16 rounded-full bg-[rgba(255,214,153,0.8)] blur-xl" />
      <div className="absolute right-[16%] top-[22%] h-12 w-12 rounded-full bg-[rgba(223,244,234,0.9)] blur-lg" />
      <div className="absolute bottom-[18%] left-[16%] h-10 w-10 rounded-full bg-[rgba(240,138,93,0.35)] blur-md" />
      <div className="go-board relative h-[28rem] w-[28rem] rounded-[42px] p-8 shadow-[0_30px_80px_rgba(240,138,93,0.18)]">
        <div className="board-grid h-full w-full rounded-[30px]">
          <div className="stone stone-black left-[22%] top-[28%]" />
          <div className="stone stone-white left-[64%] top-[26%]" />
          <div className="stone stone-black left-[36%] top-[58%]" />
          <div className="stone stone-white left-[70%] top-[66%]" />
          <div className="stone stone-black left-[53%] top-[45%]" />
          <div className="absolute left-[18%] top-[18%] h-3 w-3 rounded-full bg-[rgba(240,138,93,0.8)]" />
          <div className="absolute right-[18%] top-[18%] h-3 w-3 rounded-full bg-[rgba(240,138,93,0.8)]" />
          <div className="absolute left-[18%] bottom-[18%] h-3 w-3 rounded-full bg-[rgba(240,138,93,0.8)]" />
          <div className="absolute right-[18%] bottom-[18%] h-3 w-3 rounded-full bg-[rgba(240,138,93,0.8)]" />
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(240,138,93,0.8)]" />
        </div>
      </div>
      <div className="scene-caption">PLAYFUL STRATEGY, BRIGHT CLASSROOM ENERGY</div>
    </div>
  );
}

export function InkWaveScene() {
  return (
    <div className="ink-scene">
      <svg viewBox="0 0 800 540" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="inkGlow" cx="50%" cy="36%" r="55%">
            <stop offset="0%" stopColor="rgba(255,236,190,0.8)" />
            <stop offset="100%" stopColor="rgba(255,236,190,0)" />
          </radialGradient>
          <linearGradient id="inkStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.72)" />
            <stop offset="100%" stopColor="rgba(240,138,93,0.45)" />
          </linearGradient>
        </defs>
        <circle cx="420" cy="170" r="170" fill="url(#inkGlow)" />
        <path d="M40 390 C180 300, 240 490, 420 400 S650 310, 760 390" fill="none" stroke="url(#inkStroke)" strokeWidth="4" strokeLinecap="round" />
        <path d="M60 340 C170 290, 270 220, 370 260 S590 360, 720 250" fill="none" stroke="rgba(255,255,255,0.34)" strokeWidth="2" strokeLinecap="round" />
        <path d="M150 110 C230 150, 230 230, 140 260 C250 280, 320 230, 320 170 C320 80, 220 50, 150 110Z" fill="rgba(255,255,255,0.12)" />
        <circle cx="150" cy="110" r="20" fill="rgba(223,244,234,0.55)" />
        <circle cx="660" cy="140" r="14" fill="rgba(240,138,93,0.28)" />
      </svg>
    </div>
  );
}

export function PortraitMonolith() {
  return (
    <div className="portrait-monolith">
      <div className="portrait-column portrait-column-1" />
      <div className="portrait-column portrait-column-2" />
      <div className="portrait-column portrait-column-3" />
      <div className="portrait-glow" />
      <div className="portrait-overlay">
        <p>可替换素材位</p>
        <h4>棋手肖像 / 名局截图</h4>
        <span>更适合明亮课堂风格的照片墙、贴纸感人物卡与赛事海报</span>
      </div>
    </div>
  );
}
