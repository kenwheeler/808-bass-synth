import React from 'react';
import { Knob, Arc } from 'rc-knob';

interface Props {
  name: string;
  min: number;
  max: number;
  steps?: number;
  value: number;
  onChange: (value: number) => void;
}

function UIKnob({ name, min, max, value, steps, onChange }: Props) {
  return (
    <div className="flex flex-col items-center">
      <label className="text-xs small mb-2 text-indigo-500 text-center">{name}</label>
      <Knob
        size={30}
        angleOffset={220}
        angleRange={280}
        min={min}
        max={max}
        snap={true}
        steps={steps}
        value={value}
        onChange={onChange}
      >
        <Arc
          arcWidth={5}
          color="#4e46e5"
          background="#272370"
        />
      </Knob>
    </div>
  )
}

export default UIKnob;