import { createContext, useContext } from 'react';

import Api from './Api';

export const ApiContext = createContext<Api>(new Api());

export function useApi() {
  return useContext(ApiContext);
}
