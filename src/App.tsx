import React from 'react';
import { useEffect } from 'react';
import { useRef } from 'react';
import WebMidi, { InputEventNoteoff, InputEventNoteon } from "webmidi";
import mtof from "mtof";
import { useState } from 'react';
import { Envelope } from "./Envelope";
import { Oscilloscope } from "./Oscilloscope";
import { GainMeter } from "./GainMeter";
import Knob from './Knob';

function App() {
  const [started, setStarted] = useState(false);
  const SynthNode = useRef<any>();
  const CtxRef = useRef<any>();
  const FilterRef = useRef<any>();
  const notesRef = useRef<any>([]);
  const busRef = useRef<any>();
  const [attack, setAttack] = useState(0.01);
  const [decay, setDecay] = useState(0.2);
  const [sustain, setSustain] = useState(1);
  const [release, setRelease] = useState(2.25);
  const [gain, setGain] = useState(1);
  const glide = useRef<any>(0.075);
  const saturation = useRef<any>(0.75);
  const thump = useRef<any>(2);
  const filter = useRef<any>(500);
  const crush = useRef<any>(0);

  function noteOn(e: InputEventNoteon) {
    if (SynthNode.current) {
      const freq = mtof(e.note.number);
      notesRef.current.push(e.note.number);
      SynthNode.current.parameters.get("trigger").value = 1;
      SynthNode.current.parameters.get("frequency").linearRampToValueAtTime(freq, CtxRef.current.currentTime + glide.current);
    }
  }

  function noteOff(e: InputEventNoteoff) {
    if (SynthNode.current) {
      notesRef.current.splice(notesRef.current.indexOf(e.note.number), 1)
      if (notesRef.current.length) {
        const freq = mtof(notesRef.current[notesRef.current.length - 1]);
        SynthNode.current.parameters.get("frequency").linearRampToValueAtTime(freq, CtxRef.current.currentTime + glide.current);
      } else {
        SynthNode.current.parameters.get("trigger").value = 0;
      }
    }
  }

  async function startAudio() {
    if (!SynthNode.current) {
      CtxRef.current = new AudioContext()

      await CtxRef.current.audioWorklet.addModule("worklets/synth.js");
      SynthNode.current = new AudioWorkletNode(CtxRef.current, "synth-processor");
      SynthNode.current.parameters.get("sampleRate").value = CtxRef.current.sampleRate

      FilterRef.current = CtxRef.current.createBiquadFilter();
      FilterRef.current.type = "lowpass";
      FilterRef.current.frequency.value = filter.current;

      const compressor = CtxRef.current.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-10, CtxRef.current.currentTime);
      compressor.knee.setValueAtTime(10, CtxRef.current.currentTime);
      compressor.ratio.setValueAtTime(20, CtxRef.current.currentTime);
      compressor.attack.setValueAtTime(0.01, CtxRef.current.currentTime);
      compressor.release.setValueAtTime(0.25, CtxRef.current.currentTime);

      busRef.current = CtxRef.current.createGain();

      busRef.current.connect(CtxRef.current.destination);
      FilterRef.current.connect(compressor);
      compressor.connect(busRef.current);
      SynthNode.current.connect(FilterRef.current);
      setStarted(true);
    }
  }

  useEffect(() => {
    let input: any;
    WebMidi.enable((e) => {
      console.log(WebMidi.inputs)
      input = WebMidi.getInputByName("VIRTUAL Bus 1");
      if (input) {
        input.addListener('noteon', 'all', noteOn);
        input.addListener('noteoff', 'all', noteOff);
      }
    })
  }, [])

  return (
    <div className="App flex flex-col bg-gray-500 mt-10 divide-y-2 divide-indigo-900 border-indigo-900 border-2">

      <div className="flex flex-row bg-gray-900 p-2">
        <h1 className="font-bold small">Bass Plug</h1>
      </div>
      <div className="flex flex-row divide-x-2 divide-indigo-900">
        <div className="flex flex-1 flex-col bg-gray-900">
          <p className="p-2 text-sm small font-semibold">Amp Envelope</p>
          <div className="flex pl-2 pr-2">
            <Envelope a={attack} d={decay} s={sustain} r={release} height={100} width={384} />
          </div>
          <div className="flex p-2 flex-row items-center justify-around">
            <Knob
              name="Attack"
              min={0.01}
              max={1}
              value={attack}
              onChange={(value: any) => {
                setAttack(value);
                SynthNode.current.parameters.get("attack").value = value;
              }}
            />
            <Knob
              name="Decay"
              min={0.01}
              max={4.9}
              value={decay}
              onChange={(value: any) => {
                setDecay(value);
                SynthNode.current.parameters.get("decay").value = value;
              }}
            />
            <Knob
              name="Sustain"
              min={0}
              max={1}
              value={sustain}
              onChange={(value: any) => {
                setSustain(value);
                SynthNode.current.parameters.get("sustain").value = value;
              }}
            />
            <Knob
              name="Release"
              min={0.01}
              max={5}
              value={release}
              onChange={(value: any) => {
                setRelease(value);
                SynthNode.current.parameters.get("release").value = value;
              }}
            />
          </div>
        </div>
        <div className="flex flex-1 flex-col bg-gray-900">
          <p className="p-2 text-sm small font-semibold">Oscillator</p>
          <div className="flex pl-2 pr-2">
            <Oscilloscope audioCtx={CtxRef} bus={busRef} started={started} height={100} width={384} />
          </div>
          <div className="flex p-2 items-center justify-around">
            <Knob
              name="Glide"
              min={0}
              max={0.5}
              value={glide.current}
              onChange={(value: any) => {
                glide.current = value;
              }}
            />
            <Knob
              name="Saturation"
              min={0}
              max={1}
              value={saturation.current}
              onChange={(value: any) => {
                saturation.current = value;
                SynthNode.current.parameters.get("saturation").value = value;
              }}
            />
            {/* <Knob
              name="Drive"
              min={0}
              max={600}
              value={drive.current}
              onChange={(value: any) => {
                drive.current = value;
                distortionRef.current.curve = makeDistortionCurve(value);
              }}
            /> */}
            <Knob
              name="Thump"
              min={0}
              max={3}
              value={thump.current}
              onChange={(value: any) => {
                thump.current = value;
                SynthNode.current.parameters.get("thump").value = value;
              }}
            />
            <Knob
              name="Crush"
              min={2}
              max={24}
              value={crush.current}
              onChange={(value: any) => {
                const fixed = Number(value.toFixed());
                crush.current = fixed;
                SynthNode.current.parameters.get("crush").value = 26 - fixed;
              }}
            />
            <Knob
              name="Filter"
              min={10}
              max={3000}
              value={filter.current}
              onChange={(value: any) => {

                filter.current = value;
                FilterRef.current.frequency.value = value;
              }}
            />
          </div>
        </div>
        <div className="flex flex-0 flex-col bg-gray-900">
          <p className="p-2 text-sm small font-semibold">Gain</p>
          <div className="flex pl-2 pr-2">
            <GainMeter audioCtx={CtxRef} bus={busRef} started={started} height={100} width={30} />
          </div>
          <div className="flex p-2">
            <Knob
              name="Gain"
              min={0.01}
              max={2}
              value={gain}
              onChange={(value: any) => {
                setGain(value);
                SynthNode.current.parameters.get("gain").value = value;
              }}
            />
          </div>
        </div>
      </div>
      {started ? null : <button onClick={startAudio}>Start Audio</button>}
    </div>
  );
}

export default App;
