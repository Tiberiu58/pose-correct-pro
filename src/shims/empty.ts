// Stub module to disable WebGPU backend entirely
// Exports no-op symbols that pose-detection may try to import
export const webgpu_util = {};
export const GPGPUContext = class {};
export const setWebGPUBackend = () => {};
export const getWebGPUBackend = () => null;
