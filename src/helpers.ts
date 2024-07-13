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

type RepositoryType = 'default' | 'base' | 'custom' | 'transaction';

// TODO: return transaction repo. Is it needed?!?
function _getRepository<
  T extends IEntity,
  R extends BaseFirestoreRepository<T> = BaseFirestoreRepository<T>
>(
  entityConstructorOrPath: EntityConstructorOrPath<T>,
  repositoryType?: RepositoryType // Optional parameter
): R {
  const metadataStorage = getMetadataStorage();

  if (!metadataStorage.firestoreRef) {
    throw new Error('Firestore must be initialized first');
  }

  const collection = metadataStorage.getCollection(entityConstructorOrPath);

  const isPath = typeof entityConstructorOrPath === 'string';
  const collectionName =
    typeof entityConstructorOrPath === 'string'
      ? entityConstructorOrPath
      : entityConstructorOrPath.name;

  if (!collection) {
    const error = isPath
      ? `'${collectionName}' is not a valid path for a collection`
      : `'${collectionName}' is not a valid collection`;
    throw new Error(error);
  }

  const repository = metadataStorage.getRepository(collection.entityConstructor);

  const useCustomRepository = repositoryType === 'custom' || (!repositoryType && repository);

  if (useCustomRepository && !repository) {
    throw new Error(`'${collectionName}' does not have a custom repository.`);
  }

  if (collection.parentEntityConstructor) {
    const parentCollection = metadataStorage.getCollection(collection.parentEntityConstructor);
    if (!parentCollection) {
      throw new Error(`'${collectionName}' does not have a valid parent collection.`);
    }
  }

  const RepositoryClass = useCustomRepository
    ? (repository?.target as new (pathOrConstructor: string | IEntityConstructor) => R)
    : (BaseFirestoreRepository as new (pathOrConstructor: string | IEntityConstructor) => R);

  return new RepositoryClass(entityConstructorOrPath);
}

export function getRepository<
  T extends IEntity,
  R extends BaseFirestoreRepository<T> = BaseFirestoreRepository<T>
>(
  entityConstructorOrPath: EntityConstructorOrPath<T>,
  repositoryType?: RepositoryType // Optional parameter
): R {
  return _getRepository<T, R>(entityConstructorOrPath, repositoryType);
}

/**
 * @deprecated Use getRepository. This will be removed in a future version.
 */
export const GetRepository = getRepository;

export function getCustomRepository<T extends IEntity>(entityOrPath: EntityConstructorOrPath<T>) {
  return _getRepository(entityOrPath, 'custom');
}

/**
 * @deprecated Use getCustomRepository. This will be removed in a future version.
 */
export const GetCustomRepository = getCustomRepository;

export function getBaseRepository<T extends IEntity>(entityOrPath: EntityConstructorOrPath<T>) {
  return _getRepository(entityOrPath, 'base');
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

    tranRefStorage.forEach(({ entity, path, propertyKey }) => {
      const record = entity as unknown as Record<string, unknown>;
      record[propertyKey] = getRepository(path);
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
