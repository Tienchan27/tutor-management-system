import { useState } from 'react';
import { getCurrentYearMonth } from '../utils/format';

export function useMonthParam(initial = getCurrentYearMonth()) {
  const [month, setMonth] = useState(initial);
  return { month, setMonth };
}
