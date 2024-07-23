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

export class InvalidRepositoryIndexError extends Error {
  constructor() {
    super('Invalid RepositoryIndex: Must be a tuple [string, (string | null)]');
  }
}

export class IncompleteOrInvalidPathError extends Error {
  constructor(path: string) {
    super(`Invalid collection path: ${path}`);
  }
}

export class CollectionPathNotFoundError extends Error {
  constructor(path: string) {
    super(`Collection path not found: ${path}`);
  }
}

export class DuplicateSubCollectionError extends Error {
  constructor(
    entityConstructorName: string,
    subCollectionName: string,
    parentPropertyKey: string | undefined
  ) {
    super(
      `SubCollection<${entityConstructorName}> with name '${subCollectionName}' and propertyKey '${parentPropertyKey}' has already been registered`
    );
  }
}

export class DuplicateCollectionError extends Error {
  constructor(entityConstructorName: string, collectionName: string) {
    super(
      `Collection<${entityConstructorName}> with name '${collectionName}' has already been registered`
    );
  }
}

export class CustomRepositoryInheritanceError extends Error {
  constructor() {
    super(
      'Cannot register a custom repository on a class that does not inherit from BaseFirestoreRepository'
    );
  }
}
