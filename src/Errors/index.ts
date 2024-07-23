import type { EntityConstructorOrPath, IEntity } from '../types';

export class NoMetadataError extends Error {
  constructor(pathOrConstructorOrCollectionName: EntityConstructorOrPath<IEntity>) {
    let name;
    if (typeof pathOrConstructorOrCollectionName === 'string') {
      if (pathOrConstructorOrCollectionName.includes('/')) {
        // String is a path to a subcollection
        name = `subcollection named: ${pathOrConstructorOrCollectionName}`;
      } else {
        // String is a top level collection name
        name = `collection named: ${pathOrConstructorOrCollectionName}`;
      }
    } else {
      name = `constructor named: ${pathOrConstructorOrCollectionName.name}`;
    }
    super(`There is no metadata stored for "${name}"`);
  }
}
