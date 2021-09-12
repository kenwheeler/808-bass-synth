import React from 'react';
import { useEffect } from 'react';
import { useRef } from 'react';

interface Props {
  audioCtx: any;
  bus: any;
  height: number;
  width: number;
  started: boolean;
}

export function GainMeter({ audioCtx, bus, started, height, width }: Props) {
  const canvasRef = useRef<any>();

  useEffect(() => {
    const ctx: CanvasRenderingContext2D = canvasRef.current.getContext('2d');
    let analyser: AnalyserNode;
    let arr: Uint8Array;

    let grd = ctx.createLinearGradient(0, 0, 0, height);
    grd.addColorStop(0, '#4e46e5');
    grd.addColorStop(1, '#1c1953');

    ctx.lineWidth = 2;
    function draw() {
      analyser.getByteTimeDomainData(arr);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, width, height);

      let value = 0;
      ctx.fillStyle = "#1a174b";

      for (let i = 0; i < arr.length; i++) {
        value = Math.max(value, arr[i]);
      }

      let level = (value / 128);

      ctx.fillRect(0, height - (height * level), width, height);
      requestAnimationFrame(draw);
    }
    if (audioCtx.current && started) {
      analyser = audioCtx.current.createAnalyser();
      bus.current.connect(analyser)
      analyser.fftSize = 1024;
      arr = new Uint8Array(1024);
      analyser.getByteFrequencyData(arr);
      draw();
    }
  }, [audioCtx, bus, height, started, width]);
  return <canvas ref={canvasRef} height={height} width={width} />
}