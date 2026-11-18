declare module 'node-wav' {
  const nodeWav: {
    decode(buffer: Buffer): { sampleRate: number; channelData: Float32Array[] };
  };
  export default nodeWav;
}
