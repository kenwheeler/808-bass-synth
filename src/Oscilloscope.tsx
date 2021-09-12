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

export function Oscilloscope({ audioCtx, bus, started, height, width }: Props) {
  const canvasRef = useRef<any>();

  useEffect(() => {
    const ctx: CanvasRenderingContext2D = canvasRef.current.getContext('2d');
    let analyser: AnalyserNode;
    let arr: Uint8Array;
    ctx.fillStyle = "#1a174b";
    ctx.strokeStyle = "#4e46e5";
    ctx.lineWidth = 2;
    function draw() {
      analyser.getByteTimeDomainData(arr);

      ctx.fillRect(0, 0, width, height);

      let sliceWidth = width * 1.0 / arr.length;
      let x = 0;

      ctx.beginPath();
      for (let i = 0; i < arr.length; i++) {
        let v = arr[i] / 128.0;
        let y = v * height / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += sliceWidth;
      }
      ctx.stroke();
      requestAnimationFrame(draw);
    }
    if (audioCtx.current && started) {
      analyser = audioCtx.current.createAnalyser();
      bus.current.connect(analyser)
      analyser.fftSize = 2048;
      arr = new Uint8Array(2048);
      draw();
    }
  }, [audioCtx, bus, height, started, width]);
  return <canvas ref={canvasRef} height={height} width={width} />
}