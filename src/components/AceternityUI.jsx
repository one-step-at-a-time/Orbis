// SOVEREIGN NEXUS — Aceternity Components
// Private AI Command Interface Design System
import React, { useEffect, useRef, useState } from "react";
import { cn } from "../utils/formatters";

/* ─── BackgroundBeams ──────────────────────────────────
   Raios SVG animados de energia no fundo das páginas   */
export function BackgroundBeams({ className }) {
    const paths = [
        "M-380 -189C-380 -189 -312 216 152 343C616 470 684 875 684 875",
        "M-373 -197C-373 -197 -305 208 159 335C623 462 691 867 691 867",
        "M-359 -213C-359 -213 -291 192 173 319C637 446 705 851 705 851",
        "M-345 -229C-345 -229 -277 176 187 303C651 430 719 835 719 835",
        "M-331 -245C-331 -245 -263 160 201 287C665 414 733 819 733 819",
        "M-317 -261C-317 -261 -249 144 215 271C679 398 747 803 747 803",
    ];
    return (
        <div className={cn(className)} style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
            <svg style={{ position: "absolute", width: "100%", height: "100%" }} viewBox="0 0 696 316" fill="none" preserveAspectRatio="xMidYMid slice">
                <defs>
                    {paths.map((_, i) => (
                        <linearGradient key={i} id={`sn-beam-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="transparent" />
                            <stop offset="35%" stopColor={i % 2 === 0 ? "rgba(0,217,255,0.5)" : "rgba(124,58,237,0.35)"} />
                            <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                    ))}
                    <radialGradient id="sn-center" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(59, 89, 255, 0.05)" />
                        <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                </defs>
                {paths.map((path, i) => (
                    <path key={i} d={path} stroke={`url(#sn-beam-${i})`}
                        strokeWidth={i % 2 === 0 ? "1.2" : "0.7"}
                        style={{ animation: `beam-anim ${4.5 + i * 0.6}s ease-in-out infinite alternate`, animationDelay: `${i * 0.3}s` }}
                    />
                ))}
                <ellipse cx="50%" cy="35%" rx="40%" ry="28%" fill="url(#sn-center)" />
            </svg>
        </div>
    );
}

/* ─── Spotlight ────────────────────────────────────────
   Holofote de energia que segue o cursor no elemento pai */
export function Spotlight({ className, fill = "rgba(59, 89, 255, 0.08)" }) {
    const spotRef = useRef(null);
    useEffect(() => {
        const spot = spotRef.current;
        if (!spot) return;
        const parent = spot.parentElement;
        if (!parent) return;
        const handleMove = (e) => {
            const rect = parent.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            spot.style.background = `radial-gradient(700px circle at ${x}px ${y}px, ${fill}, transparent 70%)`;
        };
        parent.addEventListener("mousemove", handleMove);
        return () => parent.removeEventListener("mousemove", handleMove);
    }, [fill]);
    return (
        <div ref={spotRef} className={cn(className)}
            style={{ position: "absolute", inset: 0, pointerEvents: "none", transition: "background 0.08s" }} />
    );
}

/* ─── CornerBrackets ───────────────────────────────────
   Decorações de cantos estilo HUD técnico              */
export function CornerBrackets({ size = 10, color = "rgba(59, 89, 255, 0.5)", animated = false }) {
    const style = (corner) => {
        const base = {
            position: "absolute", width: size, height: size,
            ...(animated && { animation: "corner-pulse 3s ease-in-out infinite" }),
        };
        const corners = {
            tl: { top: 0, left: 0, borderTop: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}`, borderRadius: "2px 0 0 0" },
            tr: { top: 0, right: 0, borderTop: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}`, borderRadius: "0 2px 0 0" },
            bl: { bottom: 0, left: 0, borderBottom: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}`, borderRadius: "0 0 0 2px" },
            br: { bottom: 0, right: 0, borderBottom: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}`, borderRadius: "0 0 2px 0" },
        };
        return { ...base, ...corners[corner] };
    };
    return (
        <>
            <span style={style("tl")} />
            <span style={style("tr")} />
            <span style={style("bl")} />
            <span style={style("br")} />
        </>
    );
}

/* ─── HUDPanel ─────────────────────────────────────────
   Painel de controle com borda de energia e cantos HUD */
export function HUDPanel({ children, className, style, tag, animated = false, ...props }) {
    return (
        <div
            className={cn("hud-panel", className)}
            style={{ position: "relative", ...style }}
            {...props}
        >
            {/* Tag de classificação */}
            {tag && (
                <div style={{
                    position: "absolute", top: -1, left: 12,
                    background: "var(--bg-card)", padding: "0 8px",
                    fontSize: 9, fontFamily: "var(--font-system)",
                    letterSpacing: "0.12em", color: "var(--primary)",
                    textTransform: "uppercase", opacity: 0.8,
                }}>
                    {tag}
                </div>
            )}
            <CornerBrackets animated={animated} />
            {children}
        </div>
    );
}

/* ─── MovingBorder ─────────────────────────────────────
   Borda cônica girando — para elementos de destaque    */
export function MovingBorder({ children, className, containerStyle, duration = 3500 }) {
    return (
        <div style={{ position: "relative", borderRadius: 11, padding: 1, overflow: "hidden", ...containerStyle }}>
            <div style={{
                position: "absolute", inset: "-50%", aspectRatio: "1",
                background: "conic-gradient(from 0deg, transparent 0%, var(--primary) 20%, var(--accent) 50%, transparent 70%)",
                animation: `border-flow ${duration}ms linear infinite`,
                opacity: 0.7,
            }} />
            <div className={cn(className)} style={{ position: "relative", zIndex: 1, borderRadius: 10 }}>
                {children}
            </div>
        </div>
    );
}

/* ─── GlowButton ───────────────────────────────────────
   Botão com energia e feedback visual de sistema       */
export function GlowButton({ children, className, onClick, type = "button", variant = "primary" }) {
    const v = {
        primary: { bg: "linear-gradient(135deg, var(--primary), var(--accent))", shadow: "var(--primary-glow)", text: "white" },
        purple: { bg: "linear-gradient(135deg, #7c3aed, #6d28d9)", shadow: "rgba(124,58,237,0.4)", text: "white" },
        gold: { bg: "linear-gradient(135deg, #f59e0b, #d97706)", shadow: "rgba(245,158,11,0.4)", text: "#030508" },
        ghost: { bg: "rgba(59,89,255,0.08)", shadow: "rgba(59,89,255,0.1)", text: "var(--primary)" },
    }[variant] || {};

    return (
        <button type={type} onClick={onClick}
            className={cn(className)}
            style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                gap: 8, padding: "10px 22px", borderRadius: 8, border: "none",
                fontFamily: "var(--font-interface)", fontWeight: 700, fontSize: 14,
                letterSpacing: "0.03em", cursor: "pointer",
                background: v.bg, color: v.text, boxShadow: `0 4px 20px ${v.shadow}`,
                transition: "all 0.18s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 30px ${v.shadow.replace("0.4", "0.65")}`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 4px 20px ${v.shadow}`; }}
            onMouseDown={e => { e.currentTarget.style.transform = "translateY(0) scale(0.98)"; }}
        >
            {children}
        </button>
    );
}

/* ─── ScanlineOverlay ──────────────────────────────────
   Scanlines sutis de CRT — dão sensação de terminal   */
export function ScanlineOverlay() {
    return (
        <div style={{
            position: "fixed", inset: 0, pointerEvents: "none",
            zIndex: 9997, mixBlendMode: "overlay",
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(59, 89, 255, 0.01) 2px, rgba(59, 89, 255, 0.01) 4px)",
        }} />
    );
}

/* ─── TypewriterText ───────────────────────────────────
   Efeito typewriter para o logo THE SYSTEM             */
export function TypewriterText({ text, delay = 0, speed = 60, className, style }) {
    const [displayed, setDisplayed] = useState("");
    useEffect(() => {
        let i = 0;
        const timer = setTimeout(() => {
            const interval = setInterval(() => {
                setDisplayed(text.slice(0, i + 1));
                i++;
                if (i >= text.length) clearInterval(interval);
            }, speed);
            return () => clearInterval(interval);
        }, delay);
        return () => clearTimeout(timer);
    }, [text, delay, speed]);
    return (
        <span className={cn(className)} style={style}>
            {displayed}
            {displayed.length < text.length && (
                <span style={{ borderRight: "2px solid var(--primary)", marginLeft: 1, animation: "system-pulse 0.7s ease-in-out infinite" }} />
            )}
        </span>
    );
}

/* ─── ShimmerCard ──────────────────────────────────────
   Card com borda shimmer energética                   */
export function ShimmerCard({ children, className, style, ...props }) {
    return (
        <div className={cn(className)} style={{ position: "relative", borderRadius: 10, overflow: "hidden", ...style }} {...props}>
            <div style={{
                position: "absolute", inset: 0, borderRadius: "inherit",
                background: "linear-gradient(135deg, rgba(59, 89, 255, 0.22), rgba(124, 58, 237, 0.15), rgba(59, 89, 255, 0.22))",
                backgroundSize: "200% 200%", animation: "shimmer 4s linear infinite",
                padding: 1, WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                WebkitMaskComposite: "xor", maskComposite: "exclude",
            }} />
            <div style={{ position: "relative", zIndex: 1, height: "100%" }}>{children}</div>
        </div>
    );
}
