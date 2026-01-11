import React, { useEffect, useRef, useState } from 'react';
import { Phase, AnimationEvent } from '../types';
import { REAL_AUDIO_ASSETS } from '../constants';

interface SoundManagerProps {
    phase: Phase;
    animation: AnimationEvent | null;
    isMuted: boolean; 
}

// ==========================================
// 🎹 Web Audio API 合成器 (核心魔法)
// ==========================================
const sfxSynthesizer = {
    ctx: null as AudioContext | null,

    init() {
        if (!this.ctx) {
            // @ts-ignore
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    },

    // 🔫 猎人开枪：爆破音
    playShoot() {
        const ctx = this.init();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    },

    // 🐺 狼人袭击：低沉噪音/撕裂感
    playClaw() {
        const ctx = this.init();
        if (!ctx) return;
        const bufferSize = ctx.sampleRate * 0.5; // 0.5秒
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1; // 白噪音
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = ctx.createGain();
        
        // 低通滤波，模拟沉闷的撕咬声
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        gain.gain.setValueAtTime(0.8, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

        noise.start();
    },

    // 🧪 女巫药水：神秘滑音
    playMagic() {
        const ctx = this.init();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.6); // 频率爬升

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
    },

    // 🗳️ 投票/点击：清脆短音
    playBlip() {
        const ctx = this.init();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
    },

    // 🔮 预言家：高频共鸣
    playPing() {
        const ctx = this.init();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1500, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    }
};

const SoundManager: React.FC<SoundManagerProps> = ({ phase, animation, isMuted }) => {
    const bgmRef = useRef<HTMLAudioElement | null>(null);
    const [hasInteracted, setHasInteracted] = useState(false); 

    // 1. 初始化 BGM (这里继续用你本地的 MP3 文件，因为 BGM 很难合成)
    useEffect(() => {
        const audio = new Audio();
        audio.loop = true;
        // 极低音量背景
        audio.volume = 0.01; 
        bgmRef.current = audio;

        const unlockAudio = () => {
            if (!hasInteracted) {
                console.log("[SoundManager] 交互解锁 AudioContext & BGM");
                setHasInteracted(true);
                sfxSynthesizer.init(); // 🔥 预热合成器
                
                if (bgmRef.current && bgmRef.current.src && bgmRef.current.paused) {
                    bgmRef.current.play().catch(e => console.warn("[BGM] 恢复播放失败:", e));
                }
            }
        };

        window.addEventListener('click', unlockAudio);
        window.addEventListener('keydown', unlockAudio);

        return () => { 
            audio.pause(); 
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
        };
    }, [hasInteracted]);

    // 2. BGM 切换逻辑 (保持不变，稳健)
    useEffect(() => {
        if (isMuted || !bgmRef.current) {
            bgmRef.current?.pause();
            return;
        }

        const playBGM = async (url: string) => {
            if (!bgmRef.current) return;
            if (bgmRef.current.src.includes(url) && !bgmRef.current.paused) return;

            if (!hasInteracted) {
                bgmRef.current.src = url;
                return; 
            }

            // 淡出旧的
            const fadeOut = setInterval(() => {
                if (bgmRef.current && bgmRef.current.volume > 0.002) {
                    bgmRef.current.volume -= 0.002;
                } else {
                    clearInterval(fadeOut);
                    if (bgmRef.current) {
                        bgmRef.current.src = url;
                        bgmRef.current.play().then(() => {
                            // 淡入新的
                            let v = 0.0;
                            const fadeIn = setInterval(() => {
                                v += 0.001; 
                                if (v >= 0.01) { 
                                    v = 0.01;
                                    clearInterval(fadeIn);
                                }
                                if(bgmRef.current) bgmRef.current.volume = v;
                            }, 200);
                        }).catch(e => console.warn(e));
                    }
                }
            }, 50);
        };

        if (phase.includes('NIGHT')) {
            playBGM(REAL_AUDIO_ASSETS.BGM.NIGHT);
        } else if (phase.includes('DAY')) {
            playBGM(REAL_AUDIO_ASSETS.BGM.DAY);
        } else {
            bgmRef.current.pause(); 
        }

    }, [phase, isMuted, hasInteracted]);

    // 3. 🔥 SFX 触发逻辑：改用合成器！
    useEffect(() => {
        if (!animation || isMuted || !hasInteracted) return;

        console.log(`[SFX] Playing synthesized sound for: ${animation.type}`);

        switch (animation.type) {
            case 'CLAW': 
                sfxSynthesizer.playClaw(); // 狼抓：撕裂噪音
                break;
            case 'GUN': 
                sfxSynthesizer.playShoot(); // 猎人：射击音
                break;
            case 'POTION': 
                sfxSynthesizer.playMagic(); // 女巫：魔法音
                break;
            case 'VOTE': 
                sfxSynthesizer.playBlip(); // 投票：短促提示
                break;
            case 'SHERIFF': 
                sfxSynthesizer.playBlip(); // 警长：短促提示
                break;
            case 'SEER':
                sfxSynthesizer.playPing(); // 预言家：高频探测
                break;
            case 'DAY_NIGHT': 
                // 转场音效可以用魔法音代替，或者做一个更长的
                sfxSynthesizer.playMagic(); 
                break;
            default:
                break;
        }
    }, [animation, isMuted, hasInteracted]);

    return null;
};

export default SoundManager;