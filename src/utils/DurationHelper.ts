import _ from 'lodash';
import numeral from 'numeral';

export const msToDuration = (ms: number) => {
  if (ms === 0 || !_.isNumber(ms) || _.isNaN(ms)) return `0:00`;
  const seconds = numeral(ms.toFixed(3)).divide(1000).value();
  const minutes = Math.floor(numeral(seconds).divide(60).value() ?? 0);
  const remainingSeconds = numeral(seconds)
    .subtract(numeral(minutes).multiply(60).value())
    .value()
    ?.toFixed(0);

  return `${minutes}:${remainingSeconds?.padStart(2, '0')}`;
};

export const createTimeStamp = () => new Date().getTime();
