import { Buffer } from 'buffer';

export default function (token: string) {
  const splitted = token.split('.');
  const decodedBytes = Buffer.from(splitted[1], 'base64');
  const decodedString = new TextDecoder('utf-8').decode(decodedBytes);
  return decodedString;
}
