import { useState } from 'react';
import { useApi } from '../api/ApiContext';

export default function useScore() {
  const api = useApi();
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const fetch = async () => {};
}
