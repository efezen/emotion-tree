import React, { useState, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import './index.css';

const DUYGU_REHBERI = {
  isyan:       { renk: '#FF3B30', etiket: 'İSYAN' },
  huzur:       { renk: '#4CD964', etiket: 'HUZUR' },
  karamsarlik: { renk: '#007AFF', etiket: 'KARAMSARLIK' },
  coskun:      { renk: '#FFCC00', etiket: 'COŞKUN' },
  melankoli:   { renk: '#AF52DE', etiket: 'MELANKOLİ' },
  ofke:        { renk: '#FF4500', etiket: 'ÖFKE' },
  kaygi:       { renk: '#FF8C00', etiket: 'KAYGI' },
  umut:        { renk: '#00FF7F', etiket: 'UMUT' },
};

const normalize = (str) =>
  (str || '').toLowerCase()
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ö/g, 'o')
    .replace(/ç/g, 'c').replace(/ü/g, 'u').replace(/ğ/g, 'g').trim();

const CANVAS_W = 1600;
const CANVAS_H = 1200;
const KOK_X = CANVAS_W / 2;
const KOK_Y = CANVAS_H - 80;

const sinirla = (aci) => {
  if (aci <= -180) return -170 + Math.random() * 10;
  if (aci >= 0)    return -10  - Math.random() * 10;
  return aci;
};

const App = () => {
  const [input, setInput]     = useState('');
  const [dallar, setDallar]   = useState([]);
  const [govde, setGovde]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [ozet, setOzet]       = useState(null);
  const [tooltip, setTooltip] = useState(null); // { x, y, dal }
  const uclarRef = useRef([]);

  const temizle = () => {
    setDallar([]);
    setGovde(null);
    setOzet(null);
    setTooltip(null);
    uclarRef.current = [];
  };

  const analizVeFilizlendir = async () => {
    if (!input || loading) return;
    setLoading(true);
    setOzet(null);
    setDallar([]);
    setGovde(null);
    setTooltip(null);
    uclarRef.current = [];

    try {
      const res  = await axios.post('http://localhost:8000/analiz', { metin: input });
      const veri = res.data;

      if (veri.hata) {
        setOzet({ baskin: 'HATA', mesaj: veri.hata });
        setLoading(false);
        return;
      }

      const baskinKey  = normalize(veri.baskin);
      const baskinRenk = DUYGU_REHBERI[baskinKey]?.renk || '#888888';
      const govdeBitisY = KOK_Y - 220;

      setGovde({
        x1: KOK_X, y1: KOK_Y,
        cx: KOK_X + (Math.random() * 20 - 10), cy: KOK_Y - 110,
        x2: KOK_X, y2: govdeBitisY,
        renk: baskinRenk,
        kalinlik: 26,
      });

      setOzet({
        baskin: veri.baskin || 'BİLİNMİYOR',
        mesaj:  veri.ozet   || 'Sayı doğrusu büküldü ama kelimeler yetersiz.',
      });

      uclarRef.current = [
        { x: KOK_X, y: govdeBitisY, angle: -130, depth: 1 },
        { x: KOK_X, y: govdeBitisY, angle: -50,  depth: 1 },
      ];

      if (veri.cumleler?.length > 0) {
        for (let idx = 0; idx < veri.cumleler.length; idx++) {
          const satir      = veri.cumleler[idx];
          const duyguKey   = normalize(satir.duygu);
          const branchRenk = DUYGU_REHBERI[duyguKey]?.renk || '#555555';
          const egim       = Number(satir.egim) || (Math.random() * 30 - 15);
          const momentum   = Math.min(Math.max(Number(satir.momentum) || 0.5, 0.15), 1.0);
          const branchSay  = Math.random() > 0.45 ? 2 : 1;

          const snapshot  = [...uclarRef.current];
          const yeniUclar = [];

          for (let i = 0; i < branchSay; i++) {
            const havuz  = snapshot.slice(-Math.min(6, snapshot.length));
            const parent = havuz[Math.floor(Math.random() * havuz.length)];
            if (!parent) continue;

            const yon     = i === 0 ? -1 : 1;
            const sapma   = yon * (15 + Math.abs(egim) * 0.8 + Math.random() * 20);
            const yeniAci = sinirla(parent.angle + sapma);

            const uzunluk = (momentum * 130) / (parent.depth * 0.22 + 1) + Math.random() * 30 + 15;
            const rad     = (yeniAci * Math.PI) / 180;
            const x2      = parent.x + uzunluk * Math.cos(rad);
            const y2      = parent.y + uzunluk * Math.sin(rad);

            if (y2 > KOK_Y - 50) continue;

            const ortaRad = ((parent.angle + yeniAci) / 2) * Math.PI / 180;
            const cx = parent.x + (uzunluk * 0.4) * Math.cos(ortaRad) + (Math.random() * 24 - 12);
            const cy = parent.y + (uzunluk * 0.4) * Math.sin(ortaRad) + (Math.random() * 12 - 6);

            if (isNaN(x2) || isNaN(y2)) continue;

            const dal = {
              x1: parent.x, y1: parent.y,
              cx, cy, x2, y2,
              renk:     branchRenk,
              duygu:    DUYGU_REHBERI[duyguKey]?.etiket || satir.duygu,
              cumle:    satir.cumle || '',
              neden:    satir.neden || '',
              kalinlik: Math.max(1.2, 18 - parent.depth * 1.8),
              depth:    parent.depth + 1,
              angle:    yeniAci,
              id:       `${idx}-${i}-${Math.random()}`,
            };

            setDallar(prev => [...prev, dal]);
            yeniUclar.push({ x: x2, y: y2, angle: yeniAci, depth: parent.depth + 1 });
          }

          uclarRef.current = [...snapshot, ...yeniUclar];
          await new Promise(r => setTimeout(r, 270));
        }
      }

    } catch (e) {
      console.error('Hata:', e);
      setOzet({ baskin: 'ÇÖKÜŞ', mesaj: 'Sunucuyla iletişim koptu.' });
    }

    setInput('');
    setLoading(false);
  };

  const handleMouseEnter = (e, dal) => {
    setTooltip({ x: e.clientX, y: e.clientY, dal });
  };

const handleMouseMove = (e) => {
    // KUSURSUZ KORUMA: prev (önceki state) varsa koordinat güncelle, yoksa null bırak.
    setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
  };

  const handleMouseLeave = () => setTooltip(null);

  return (
    <div className="app-container">
      <aside className="sidebar">
        <h2 className="text-white font-bold tracking-[0.2em] opacity-80 mb-8 text-sm uppercase">
          DUYGU DAMARLARI
          <span className="text-[10px] opacity-30 italic font-light ml-2">FRAKTAL</span>
        </h2>

        <div className="legend-grid">
          {Object.entries(DUYGU_REHBERI).map(([key, val]) => (
            <div key={key} className="legend-item" style={{ color: val.renk }}>
              <span className="text-[8px] opacity-50">●</span> {val.etiket}
            </div>
          ))}
        </div>

        <textarea
          className="manifesto-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Manifestonu dök, sayı doğrusu bükülsün..."
        />

        <div className="flex gap-2">
          <button className="btn-filizlendir flex-1" onClick={analizVeFilizlendir} disabled={loading}>
            {loading ? 'DÜŞÜNCELER SÜZÜLÜYOR...' : 'FİLİZLENDİR'}
          </button>
          <button
            className="w-12 h-12 rounded-full border border-white/10 hover:bg-white/5 transition-all text-lg flex items-center justify-center"
            onClick={temizle}
          >↺</button>
        </div>

        <AnimatePresence>
          {ozet && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="summary-card"
              style={{ borderColor: DUYGU_REHBERI[normalize(ozet.baskin)]?.renk || '#fff' }}
            >
              <h4
                className="text-[9px] font-black tracking-widest mb-2 uppercase opacity-40"
                style={{ color: DUYGU_REHBERI[normalize(ozet.baskin)]?.renk || '#fff' }}
              >
                Baskın Akış: {ozet.baskin}
              </h4>
              <p className="text-[13px] italic text-white/90 leading-relaxed font-light">
                "{ozet.mesaj}"
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>

      <main className="canvas-area" onMouseMove={handleMouseMove} onTouchStart={(e) => {
          // Eğer dokunulan yerde dal yoksa (arka plansa) tooltip'i gizle
          if (e.target.tagName === 'svg' || e.target.tagName === 'DIV') {
            setTooltip(null);
          }
        }}>
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '100px 100px',
          }}
        />

        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          preserveAspectRatio="xMidYMax meet"
        >
          <defs>
            <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {govde && (
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              d={`M ${govde.x1} ${govde.y1} Q ${govde.cx} ${govde.cy} ${govde.x2} ${govde.y2}`}
              stroke={govde.renk}
              strokeWidth={govde.kalinlik}
              fill="transparent"
              strokeLinecap="round"
              filter="url(#glow)"
            />
          )}

          {dallar.map((d) => (
            <g key={d.id}>
              {/* Görünmez kalın hit alanı — hover kolaylaşsın */}
              <path
                d={`M ${d.x1} ${d.y1} Q ${d.cx} ${d.cy} ${d.x2} ${d.y2}`}
                stroke="transparent"
                strokeWidth={Math.max(d.kalinlik + 12, 18)}
                fill="transparent"
                strokeLinecap="round"
                style={{ cursor: d.cumle ? 'crosshair' : 'default' }}
                onMouseEnter={(e) => d.cumle && handleMouseEnter(e, d)}
                onMouseLeave={handleMouseLeave}
                onTouchStart={(e) => {
                  if (d.cumle) {
                    setTooltip({ 
                      x: e.touches[0].clientX, 
                      y: e.touches[0].clientY, 
                      dal: d 
                    });
                  }
                }}
              />
              {/* Görsel dal */}
              <motion.path
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.9 }}
                transition={{ duration: 1.0, ease: 'easeOut' }}
                d={`M ${d.x1} ${d.y1} Q ${d.cx} ${d.cy} ${d.x2} ${d.y2}`}
                stroke={d.renk}
                strokeWidth={d.kalinlik}
                fill="transparent"
                strokeLinecap="round"
                filter="url(#glow)"
                style={{ pointerEvents: 'none' }}
              />
            </g>
          ))}
        </svg>

        {/* TOOLTIP */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 6 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed',
                left: tooltip.x + 18,
                top: tooltip.y - 10,
                maxWidth: 280,
                pointerEvents: 'none',
                zIndex: 100,
              }}
            >
              <div
                style={{
                  background: 'rgba(6,6,6,0.93)',
                  border: `1px solid ${tooltip.dal.renk}55`,
                  borderLeft: `3px solid ${tooltip.dal.renk}`,
                  borderRadius: 10,
                  padding: '12px 16px',
                  backdropFilter: 'blur(12px)',
                }}
              >
                {/* Duygu etiketi */}
                <div style={{
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: tooltip.dal.renk,
                  marginBottom: 6,
                  opacity: 0.9,
                }}>
                  {tooltip.dal.duygu}
                </div>

                {/* Orijinal cümle */}
                <p style={{
                  fontSize: 13,
                  fontStyle: 'italic',
                  color: 'rgba(255,255,255,0.92)',
                  lineHeight: 1.6,
                  margin: '0 0 8px 0',
                }}>
                  "{tooltip.dal.cumle}"
                </p>

                {/* Neden */}
                {tooltip.dal.neden && (
                  <p style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.4)',
                    lineHeight: 1.5,
                    margin: 0,
                  }}>
                    {tooltip.dal.neden}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;