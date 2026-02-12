import { createRequire } from 'module';
import { readFileSync } from 'fs';
import type { SpectralFeatures } from '../types.js';

const require = createRequire(import.meta.url);

interface MeydaInstance {
  bufferSize: number;
  sampleRate: number;
  numberOfMFCCCoefficients: number;
  extract(
    features: string | string[],
    signal: Float32Array,
    previousSignal?: Float32Array
  ): Record<string, unknown> | null;
}

const Meyda: MeydaInstance = require('meyda');

interface WavData {
  sampleRate: number;
  channelData: Float32Array[];
}

function decodeWav(filePath: string): WavData {
  const wavModule = require('node-wav') as { decode: (buffer: Buffer) => WavData };
  const buffer = readFileSync(filePath);
  return wavModule.decode(buffer);
}

function mixToMono(channelData: Float32Array[]): Float32Array {
  if (channelData.length === 1) return channelData[0];

  const length = channelData[0].length;
  const mono = new Float32Array(length);
  const channels = channelData.length;

  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let ch = 0; ch < channels; ch++) {
      sum += channelData[ch][i];
    }
    mono[i] = sum / channels;
  }

  return mono;
}

export function analyzeSpectralFeatures(filePath: string): SpectralFeatures {
  const wav = decodeWav(filePath);
  const mono = mixToMono(wav.channelData);
  const sampleRate = wav.sampleRate;

  const bufferSize = 2048;
  Meyda.bufferSize = bufferSize;
  Meyda.sampleRate = sampleRate;
  Meyda.numberOfMFCCCoefficients = 13;

  const featureNames = ['rms', 'spectralCentroid', 'spectralFlatness', 'spectralRolloff', 'zcr', 'mfcc'];

  let frameCount = 0;
  let rmsSum = 0;
  let centroidSum = 0;
  let flatnessSum = 0;
  let rolloffSum = 0;
  let zcrSum = 0;
  const mfccSums = new Array<number>(13).fill(0);

  for (let offset = 0; offset + bufferSize <= mono.length; offset += bufferSize) {
    const frame = mono.slice(offset, offset + bufferSize);
    const result = Meyda.extract(featureNames, frame);
    if (!result) continue;

    rmsSum += result['rms'] as number;
    centroidSum += result['spectralCentroid'] as number;
    flatnessSum += result['spectralFlatness'] as number;
    rolloffSum += result['spectralRolloff'] as number;
    zcrSum += result['zcr'] as number;

    const mfcc = result['mfcc'] as number[];
    for (let i = 0; i < 13; i++) {
      mfccSums[i] += mfcc[i];
    }

    frameCount++;
  }

  if (frameCount === 0) {
    return {
      rms: 0,
      spectralCentroid: 0,
      spectralFlatness: 0,
      spectralRolloff: 0,
      zcr: 0,
      mfcc: new Array<number>(13).fill(0),
    };
  }

  // Convert spectralCentroid from bin to Hz
  const centroidHz = (centroidSum / frameCount) * sampleRate / (2 * bufferSize);

  return {
    rms: rmsSum / frameCount,
    spectralCentroid: centroidHz,
    spectralFlatness: flatnessSum / frameCount,
    spectralRolloff: rolloffSum / frameCount,
    zcr: zcrSum / frameCount,
    mfcc: mfccSums.map(s => s / frameCount),
  };
}

export function mapSpectralToMood(features: SpectralFeatures): string {
  const { rms, spectralCentroid, spectralFlatness, zcr } = features;

  // High energy + high centroid + high zcr → bright_energetic
  if (rms > 0.15 && spectralCentroid > 4000 && zcr > 0.1) {
    return 'bright_energetic';
  }

  // High energy + high flatness + high zcr → harsh_aggressive
  if (rms > 0.15 && spectralFlatness > 0.3 && zcr > 0.15) {
    return 'harsh_aggressive';
  }

  // Low energy + low centroid + low zcr → dark_heavy
  if (rms <= 0.1 && spectralCentroid < 2000 && zcr <= 0.08) {
    return 'dark_heavy';
  }

  // Low energy + high centroid + low flatness → ethereal_ambient
  if (rms <= 0.1 && spectralCentroid > 3000 && spectralFlatness < 0.15) {
    return 'ethereal_ambient';
  }

  // Medium energy + medium centroid + low flatness → warm_mellow
  if (spectralFlatness < 0.2 && spectralCentroid >= 2000 && spectralCentroid <= 4000) {
    return 'warm_mellow';
  }

  // Default
  return 'warm_mellow';
}
