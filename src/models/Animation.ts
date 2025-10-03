export interface BouncingHandler {
  animatePressIn: () => void;
  animatePressOut: () => void;
}

export interface ShakingHandler {
  shake: () => void;
  stop: () => void;
  isShaking?: () => boolean;
}
