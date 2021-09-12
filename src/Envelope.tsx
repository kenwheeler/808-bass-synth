import React from 'react';
import { useEffect } from 'react';
import { useRef } from 'react';

interface Props {
  a: number;
  d: number;
  s: number;
  r: number;
  height: number;
  width: number;
}

export function Envelope({ a, d, s, r, height, width }: Props) {
  const canvasRef = useRef<any>();

  function getPhaseLengths() {
    let total_time = a + d + r;

    //Percent of total envelope time (not counting sustain)
    let relative_a = a / total_time;
    let relative_d = d / total_time;
    let relative_r = r / total_time;

    //The sustain phase always has the same length
    let sustain_width = 10;
    let rem_width = width - sustain_width;

    //Distribute remaining width accoring to the relative lengths of each phase
    let absolute_a = relative_a * rem_width;
    let absolute_d = relative_d * rem_width;
    let absolute_r = relative_r * rem_width;

    return [absolute_a, absolute_d, sustain_width, absolute_r];
  }

  useEffect(() => {
    const ctx: CanvasRenderingContext2D = canvasRef.current.getContext('2d');
    let [attack_width, decay_width, sustain_width, release_width] = getPhaseLengths();

    let widthOffset = 0;

    ctx.fillStyle = "#1a174b";
    ctx.fillRect(0, 0, width, height);

    let grd = ctx.createLinearGradient(0, 0, 0, height);
    grd.addColorStop(0, '#3c36ad');
    grd.addColorStop(1, '#1c1953');

    ctx.strokeStyle = "#4e46e5";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(1, height);
    ctx.lineTo(attack_width, 20);
    widthOffset += attack_width;
    ctx.lineTo(widthOffset + decay_width, height - (s * height) + 20)
    widthOffset += decay_width;
    ctx.lineTo(widthOffset + sustain_width, height - (s * height) + 20);
    widthOffset += sustain_width;
    ctx.lineTo(widthOffset + release_width, height);
    ctx.stroke();
    ctx.moveTo(1, height);
    ctx.closePath();
    ctx.fillStyle = grd;
    ctx.fill();

  }, [a, d, s, r]);
  return <canvas ref={canvasRef} height={height} width={width} />
}