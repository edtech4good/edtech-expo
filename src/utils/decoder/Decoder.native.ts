// import { type } from 'text-encoding';
import { Buffer } from 'buffer';
const TextDecoder = require('text-encoding').TextDecoder;

export default function (token: string) {
  const splitted = token.split('.');
  console.log(TextDecoder);
  const decodedBytes = Buffer.from(splitted[1], 'base64');
  const decodedString = new TextDecoder('utf-8').decode(decodedBytes);
  return decodedString;
}
