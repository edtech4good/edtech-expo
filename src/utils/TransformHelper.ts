import _ from 'lodash';

export const snakeCaseToCamelCase = (obj: object) =>
  _.mapKeys(obj, (value, key) => _.camelCase(key));
