import { getMetadataStorage } from './MetadataUtils';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';
import {
  IEntity,
  IEntityConstructor,
  EntityConstructorOrPath,
  ITransactionReferenceStorage,
} from './types';
import { FirestoreTransaction } from './Transaction/FirestoreTransaction';
import { FirestoreBatch } from './Batch/FirestoreBatch';
import { BaseRepository } from './BaseRepository';
import { AbstractFirestoreRepository } from './AbstractFirestoreRepository';
import { MetadataStorage } from './MetadataStorage';

type RepositoryType = 'default' | 'base' | 'custom' | 'transaction';

// TODO: return transaction repo. Is it needed?!?
function _getRepository<
  T extends IEntity,
  R extends BaseFirestoreRepository<T> = BaseFirestoreRepository<T>
>(
  entityConstructorOrPath: EntityConstructorOrPath<T>,
  providedCollectionName?: string,
  repositoryType?: RepositoryType // Optional parameter
): R {
  const metadataStorage = getMetadataStorage();
  if (!metadataStorage.firestoreRef) {
    throw new Error('Firestore must be initialized first');
  }

  const isPath = typeof entityConstructorOrPath === 'string';
  let collectionName: string;
  if (isPath) {
    collectionName = getLastSegment(entityConstructorOrPath);
  } else if (providedCollectionName) {
    collectionName = providedCollectionName;
  } else {
    throw new Error('Collection name is required when using an entity constructor');
  }

  const collection = metadataStorage.getCollection(entityConstructorOrPath, collectionName);

  if (!collection) {
    const error = isPath
      ? `'${collectionName}' is not a valid path for a collection`
      : `'${collectionName}' is not a valid collection`;
    throw new Error(error);
  }

  const repository = metadataStorage.getRepository(collection.entityConstructor, collectionName);

  const useCustomRepository = repositoryType === 'custom' || (!repositoryType && repository);

  if (useCustomRepository && !repository) {
    throw new Error(`'${collectionName}' does not have a custom repository.`);
  }

  // Get the parent collection if it exists
  if (collection.parentProps) {
    const { parentCollectionName, parentEntityConstructor } = collection.parentProps;
    const parentCollection = metadataStorage.getCollection(
      parentEntityConstructor,
      parentCollectionName
    );
    if (!parentCollection) {
      throw new Error(`'${collectionName}' does not have a valid parent collection.`);
    }
  }

  const RepositoryClass = useCustomRepository
    ? (repository?.target as new (
        pathOrConstructor: string | IEntityConstructor,
        colName: string
      ) => R)
    : (BaseFirestoreRepository as new (
        pathOrConstructor: string | IEntityConstructor,
        colName: string
      ) => R);

  return new RepositoryClass(entityConstructorOrPath, collectionName);
}

export function getRepository<
  T extends IEntity,
  R extends BaseFirestoreRepository<T> = BaseFirestoreRepository<T>
>(
  entityConstructorOrPath: EntityConstructorOrPath<T>,
  collectionName?: string,
  repositoryType?: RepositoryType // Optional parameter
): R {
  return _getRepository<T, R>(entityConstructorOrPath, collectionName, repositoryType);
}

/**
 * @deprecated Use getRepository. This will be removed in a future version.
 */
export const GetRepository = getRepository;

export function getCustomRepository<T extends IEntity>(
  entityOrPath: EntityConstructorOrPath<T>,
  collectionName: string
) {
  // TODO: Add tests for calling this with both an entity and a path
  if (!collectionName) {
    throw new Error('Collection name is required when using an entity constructor.');
  }
  return _getRepository(entityOrPath, collectionName, 'custom');
}
/**
 * @deprecated Use getCustomRepository. This will be removed in a future version.
 */
export const GetCustomRepository = getCustomRepository;

export function getBaseRepository<T extends IEntity>(
  entityOrPath: EntityConstructorOrPath<T>,
  collectionName: string
) {
  // TODO: Add tests for calling this with both an entity and a path
  if (!collectionName) {
    throw new Error('Collection name is required when using an entity constructor.');
  }
  return _getRepository(entityOrPath, collectionName, 'base');
}
/**
 * @deprecated Use getBaseRepository. This will be removed in a future version.
 */
export const GetBaseRepository = getBaseRepository;

export const runTransaction = async <T>(executor: (tran: FirestoreTransaction) => Promise<T>) => {
  const metadataStorage = getMetadataStorage();

  if (!metadataStorage.firestoreRef) {
    throw new Error('Firestore must be initialized first');
  }

  return metadataStorage.firestoreRef.runTransaction(async t => {
    const tranRefStorage: ITransactionReferenceStorage = new Set();
    const result = await executor(new FirestoreTransaction(t, tranRefStorage));

    tranRefStorage.forEach(({ entity, path, parentPropertyKey }) => {
      const record = entity as unknown as Record<string, unknown>;
      record[parentPropertyKey] = getRepository(path);
    });

    return result;
  });
};

/**
 * Create a new Firestore batch.
 *
 * @returns {FirestoreBatch} A new Firestore batch.
 * @throws Error if Firestore is not initialized.
 */
export const createBatch = () => {
  const metadataStorage = getMetadataStorage();

  if (!metadataStorage.firestoreRef) {
    throw new Error('Firestore must be initialized first');
  }

  return new FirestoreBatch(metadataStorage.firestoreRef);
};

function getLastSegment(path: string): string {
  if (!path || typeof path !== 'string') {
    throw new Error('Invalid input: Path must be a non-empty string');
  }

  const segments = path.split('/');
  const segmentCount = segments.length;

  if (segmentCount === 0 || segmentCount % 2 === 0) {
    throw new Error('Invalid input: Path must have an odd number of segments greater than 0');
  }

  const lastSegment = segments.pop();

  if (!lastSegment) {
    throw new Error('Invalid input: Path segments cannot be empty');
  }

  return lastSegment;
}
