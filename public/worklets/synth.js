/**
 * Todo
 * - Add portamento
 * - Add ui for sliders
 * - Add track on off notes
 * - Add bitcrusher
 * - Add compressor
 * - Add Filter
 * - Add Oscilloscope
 */

const pitchEnvelopeOptions = {
  attack: 0.01,
  decay: 0.16,
  sustain: 0,
  release: 0,
}

class Envelope {
  currentLevel = 0.001;
  currentStage = 'off';
  sampleRate = 44100;
  multiplier = 1.0;
  minimumLevel = 0.0001;
  currentSampleIndex = 0;
  nextSampleIndex = 0;
  stageOrder = ['off', 'attack', 'decay', 'sustain', 'release'];
  constructor(sr) {
    this.sampleRate = sr;
  }

  calculateMultiplier(start, end, length) {
    this.multiplier = 1.0 + (Math.log(end) - Math.log(start)) / length;
  }

  enterStage(stage, options) {
    this.currentStage = stage;
    this.currentSampleIndex = 0;

    if (this.currentStage === 'off' || this.currentStage === 'sustain') {
      this.nextSampleIndex = 0;
    } else {
      this.nextSampleIndex = options[this.currentStage] * this.sampleRate;
    }

    switch (stage) {
      case 'off': {
        this.currentLevel = 0;
        this.multiplier = 1.0;
        break;
      }
      case 'attack': {
        this.currentLevel = this.minimumLevel;
        this.calculateMultiplier(this.currentLevel, 1.0, this.nextSampleIndex);
        break;
      }
      case 'decay': {
        this.currentLevel = 1.0;
        this.calculateMultiplier(this.currentLevel, Math.max(options.sustain, this.minimumLevel), this.nextSampleIndex);
        break;
      }
      case 'sustain': {
        this.currentLevel = options.sustain;
        this.multiplier = 1.0
        break;
      }
      case 'release': {
        this.calculateMultiplier(this.currentLevel, this.minimumLevel, this.nextSampleIndex);
        break;
      }
      default: {
        break;
      }
    }
  }

  getMultiplier(options) {
    if (this.currentStage !== 'off' && this.currentStage !== 'sustain') {
      if (this.currentSampleIndex >= this.nextSampleIndex) {
        const currentIndex = this.stageOrder.indexOf(this.currentStage);
        const nextIndex = currentIndex === this.stageOrder.length - 1 ? 0 : currentIndex + 1;
        this.enterStage(this.stageOrder[nextIndex], options);
      }
      this.currentLevel *= this.multiplier;
      this.currentSampleIndex++;
    }
    return this.currentLevel;
  }
}

class Bitcrusher {
  downSampling = 64;
  counter = 0;
  lastSample = 0;
  bitcrush(input, parameters) {
    const bd = parameters.crush[0] - 1;
    let i = Math.floor(input * (-2) ** bd * (-1));
    if (input >= 1) {
      i = 2 ** bd - 1;
    } else if (input <= (-1)) {
      i = (-2) ** bd;
    };

    return i / (-2) ** bd * (-1);
  }
  process(input, parameters) {
    this.counter = this.counter + 1;
    let output = 0;
    if (this.counter < this.downSampling) {
      output = this.lastSample;
    } else {
      const sample = this.bitcrush(input, parameters);
      this.lastSample = sample;
      output = sample;
    }
    return output
  }
}

class Sine {
  sampleRate = 0;
  currentAngle = 0;
  angleDelta = 0;
  constructor(sr) {
    this.sampleRate = sr;
  }
  updateFrequency(frequency) {
    const cyclesPerSample = frequency / this.sampleRate;
    this.angleDelta = cyclesPerSample * 2 * Math.PI;
  }
  getData() {
    const currentSample = Math.sin(this.currentAngle);
    this.currentAngle += this.angleDelta
    return currentSample;
  }
}

class Synth extends AudioWorkletProcessor {
  #mtime = 0
  #lastTrigger = 0
  #envelope = new Envelope(44100)
  #pitch = new Envelope(44100)
  #tone = new Sine(44100);
  #bitcrusher = new Bitcrusher();
  static parameterDescriptors = [
    {
      name: "sampleRate",
      defaultValue: 44100,
    },
    {
      name: "frequency",
      defaultValue: 50,
    },
    {
      name: "gain",
      defaultValue: 0.5
    },
    {
      name: "attack",
      defaultValue: 0.01,
      minValue: 0,
      maxValue: 60
    },
    {
      name: "decay",
      defaultValue: 2,
      minValue: 0,
      maxValue: 60
    },
    {
      name: "sustain",
      defaultValue: 1,
      minValue: 0,
      maxValue: 1
    },
    {
      name: "release",
      defaultValue: 2.25,
      minValue: 0,
      maxValue: 60
    },
    {
      name: "trigger",
      defaultValue: 0,
      minValue: 0,
      maxValue: 1
    },
    {
      name: "saturation",
      defaultValue: 0.75,
      minValue: 0,
      maxValue: 1
    },
    {
      name: "thump",
      defaultValue: 2,
      minValue: 0,
      maxValue: 3
    },
    {
      name: "crush",
      defaultValue: 24,
      minValue: 2,
      maxValue: 24
    }
  ]

  getEnvelopeOptions(parameters) {
    return {
      attack: parameters.attack[0],
      sustain: parameters.sustain[0],
      decay: parameters.decay[0],
      release: parameters.release[0],
    }
  }

  softClip(sample) {
    const softClipThreshold = 2 / 3;
    if (sample < -1) {
      return -softClipThreshold;
    }
    else if (sample > 1) {
      return softClipThreshold;
    }
    else {
      return sample - ((sample * sample * sample) / 3);
    }
  }

  applyDistortion(sample, parameters) {
    const input = sample;
    let output = input * 3;
    output = this.softClip(output);
    const sat = parameters.saturation[0];
    return (1 - sat) * input + sat * output;
  }

  generateAudioData(time, parameters) {

    const envelopeOptions = this.getEnvelopeOptions(parameters);

    const pm = 1 + (parameters.thump[0] * this.#pitch.getMultiplier(pitchEnvelopeOptions));
    const freq = parameters.frequency[0];
    this.#tone.updateFrequency(freq * pm);
    const tone = this.#tone.getData();
    const envelope = this.#envelope.getMultiplier(envelopeOptions);
    const distorted = this.applyDistortion(tone, parameters);
    const crushed = this.#bitcrusher.process(distorted, parameters);
    return crushed * envelope * parameters.gain[0]
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0]
    const trigger = parameters.trigger[0];
    const envelopeOptions = this.getEnvelopeOptions(parameters);

    if (trigger !== this.#lastTrigger) {
      if (trigger) {
        this.#envelope.enterStage('attack', envelopeOptions);
        this.#pitch.enterStage('attack', pitchEnvelopeOptions);
      } else {
        this.#envelope.enterStage('release', envelopeOptions);
        this.#pitch.enterStage('release', pitchEnvelopeOptions);
      }
      this.#lastTrigger = trigger;
    }

    for (let o = 0; o < output.length; o++) {
      for (let c = 0; c < output[o].length; c++) {
        output[o][c] = this.generateAudioData(this.#mtime, parameters)
        this.#mtime++;
      }
    }
    return true
  }
}

registerProcessor("synth-processor", Synth)

// function getSinWave(frequency, time, phaseAngle) {
//   // return 0.5 * Math.sin(frequency * 2 * Math.PI * time)
// }
