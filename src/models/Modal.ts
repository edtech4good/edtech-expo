export interface ModalHandler {
  show: (msg: string) => void;
  hide: () => void;
}

export interface ModalState {
  visible: boolean;
  message: string;
}
