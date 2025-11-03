import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

export async function initTf() {
  await tf.setBackend('webgl');
  await tf.ready();
  return tf.getBackend();
}
