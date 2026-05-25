"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Crosshair, RotateCcw, Volume2 } from "lucide-react";
import {
  Player,
  Turn,
  average,
  applyTurn,
  checkoutPercentage,
  checkoutSuggestion,
  initialPlayers,
  scoreFromHit,
  DartScore,
  SegmentType
} from "@/lib/darts";
import { defaultCalibration, mockDetectDart } from "@/lib/vision";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraStatus, setCameraStatus] = useState("Camera niet gestart");
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [active, setActive] = useState(0);
  const [turnDarts, setTurnDarts] = useState<DartScore[]>([]);
  const [history, setHistory] = useState<Turn[]>([]);
  const [calibration, setCalibration] = useState(defaultCalibration);
  const [voice, setVoice] = useState(true);
  const [manualType, setManualType] = useState<SegmentType>("S");
  const [manualNumber, setManualNumber] = useState(20);

  const activePlayer = players[active];
  const suggestion = useMemo(() => checkoutSuggestion(activePlayer.remaining), [activePlayer.remaining]);

  useEffect(() => {
    const saved = localStorage.getItem("darts501-state");
    if (saved) {
      const parsed = JSON.parse(saved);
      setPlayers(parsed.players ?? initialPlayers());
      setActive(parsed.active ?? 0);
      setHistory(parsed.history ?? []);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("darts501-state", JSON.stringify({ players, active, history }));
  }, [players, active, history]);

  useEffect(() => {
    let animation = 0;
    function drawOverlay() {
      const canvas = overlayRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const cx = rect.width * calibration.centerX;
      const cy = rect.height * calibration.centerY;
      const radius = Math.min(rect.width, rect.height) * calibration.radius;

      ctx.strokeStyle = calibration.calibrated ? "#3ddc84" : "rgba(255,255,255,.45)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255,255,255,.25)";
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2 + (calibration.rotationDeg * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
        ctx.stroke();
      }
      animation = requestAnimationFrame(drawOverlay);
    }
    drawOverlay();
    return () => cancelAnimationFrame(animation);
  }, [calibration]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraStatus("Live camera actief");
    } catch {
      setCameraStatus("Camera kon niet worden gestart");
    }
  }

  function speak(text: string) {
    if (!voice || typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "nl-NL";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function addDart(dart: DartScore) {
    const next = [...turnDarts, dart].slice(0, 3);
    setTurnDarts(next);
    speak(`${dart.label}, ${dart.points}`);
    if (next.length === 3) commitTurn(next);
  }

  function detectDart() {
    const result = mockDetectDart();
    if (result.dart) addDart(result.dart);
  }

  function commitTurn(darts = turnDarts) {
    if (darts.length === 0) return;
    const current = players[active];
    const { player, turn } = applyTurn(current, darts);
    const nextPlayers = [...players];
    nextPlayers[active] = player;

    const completedTurn: Turn = {
      ...turn,
      playerName: current.name,
      createdAt: new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    };

    setPlayers(nextPlayers);
    setHistory([completedTurn, ...history].slice(0, 100));
    setTurnDarts([]);
    setActive((active + 1) % players.length);

    if (completedTurn.checkout) speak(`${current.name} finisht de leg`);
    else if (completedTurn.bust) speak("Bust");
    else speak(`${completedTurn.total} gescoord`);
  }

  function undoLastTurn() {
    const last = history[0];
    if (!last) return;
    const restored = players.map(p => {
      if (p.id !== last.playerId) return p;
      return {
        ...p,
        remaining: last.previousRemaining,
        dartsThrown: Math.max(0, p.dartsThrown - last.darts.length),
        totalScored: Math.max(0, p.totalScored - (last.bust ? 0 : last.total)),
        count180: Math.max(0, p.count180 - (last.total === 180 ? 1 : 0)),
        legsWon: Math.max(0, p.legsWon - (last.checkout ? 1 : 0)),
        checkouts: Math.max(0, p.checkouts - (last.checkout ? 1 : 0)),
        highestFinish: last.checkout ? 0 : p.highestFinish
      };
    });
    setPlayers(restored);
    setHistory(history.slice(1));
    setActive(players.findIndex(p => p.id === last.playerId));
  }

  function resetMatch() {
    setPlayers(initialPlayers());
    setActive(0);
    setTurnDarts([]);
    setHistory([]);
    localStorage.removeItem("darts501-state");
  }

  function calibrate() {
    setCalibration({
      calibrated: true,
      centerX: 0.5,
      centerY: 0.5,
      radius: 0.43,
      rotationDeg: -9
    });
    speak("Dartbord gekalibreerd");
  }

  return (
    <main className="app">
      <header className="header">
        <div className="logo">
          <div className="logo-mark">501</div>
          <div>
            <h1>Darts Vision 501</h1>
            <p className="subtitle">Automatische darts scoring via smartphonecamera</p>
          </div>
        </div>
        <span className="badge">{calibration.calibrated ? "Bord gekalibreerd" : "Kalibratie nodig"}</span>
      </header>

      <section className="grid">
        <div className="card">
          <div className="camera-wrap">
            <video ref={videoRef} playsInline muted />
            <canvas ref={overlayRef} className="overlay" />
            <div className="camera-status"><Camera size={14} /> {cameraStatus}</div>
          </div>

          <div className="controls">
            <button className="btn primary" onClick={startCamera}><Camera size={16} /> Start camera</button>
            <button className="btn" onClick={calibrate}><Crosshair size={16} /> Kalibreer bord</button>
            <button className="btn" onClick={detectDart}>Detecteer dart</button>
            <button className="btn" onClick={() => setVoice(!voice)}><Volume2 size={16} /> Voice {voice ? "aan" : "uit"}</button>
          </div>
        </div>

        <div className="card">
          <div className="players">
            {players.map((p, i) => (
              <div className={`player ${i === active ? "active" : ""}`} key={p.id}>
                <div className="player-name">
                  <span>{p.name}</span>
                  <span>{p.legsWon} legs</span>
                </div>
                <div className="score">{p.remaining}</div>
                <div className="checkout">Checkout: {checkoutSuggestion(p.remaining)}</div>
              </div>
            ))}
          </div>

          <div className="turn">
            {[0, 1, 2].map(i => (
              <div className="dart" key={i}>{turnDarts[i]?.label ?? `Dart ${i + 1}`}</div>
            ))}
          </div>

          <div className="manual">
            <select className="input" value={manualType} onChange={e => setManualType(e.target.value as SegmentType)}>
              <option value="S">Single</option>
              <option value="D">Double</option>
              <option value="T">Triple</option>
              <option value="BULL">Bull</option>
              <option value="MISS">Miss</option>
            </select>
            <input className="input" type="number" min="1" max="20" value={manualNumber} onChange={e => setManualNumber(Number(e.target.value))} />
            <button className="btn primary" onClick={() => addDart(scoreFromHit(manualType, manualNumber))}>Voeg toe</button>
          </div>

          <div className="controls">
            <button className="btn" onClick={() => commitTurn()}>Beurt opslaan</button>
            <button className="btn" onClick={undoLastTurn}>Correctie: laatste beurt terug</button>
            <button className="btn danger" onClick={resetMatch}><RotateCcw size={16} /> Reset match</button>
          </div>
        </div>

        <div className="card">
          <h2>Statistieken</h2>
          <div className="meta-grid">
            {players.map(p => (
              <div className="metric" key={p.id}>
                <b>{average(p)}</b><span>{p.name} gemiddelde</span>
              </div>
            ))}
            {players.map(p => (
              <div className="metric" key={`${p.id}-co`}>
                <b>{checkoutPercentage(p)}</b><span>{p.name} checkout%</span>
              </div>
            ))}
            {players.map(p => (
              <div className="metric" key={`${p.id}-180`}>
                <b>{p.count180}</b><span>{p.name} 180’s</span>
              </div>
            ))}
            {players.map(p => (
              <div className="metric" key={`${p.id}-finish`}>
                <b>{p.highestFinish}</b><span>{p.name} hoogste finish</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Matchgeschiedenis</h2>
          <div className="history">
            {history.length === 0 && <p className="subtitle">Nog geen beurten opgeslagen.</p>}
            {history.map((h, idx) => (
              <div className="history-row" key={idx}>
                <span>{h.createdAt} · {h.playerName} · {h.darts.map(d => d.label).join(", ")}</span>
                <strong>{h.bust ? "BUST" : h.checkout ? "FINISH" : h.total}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
