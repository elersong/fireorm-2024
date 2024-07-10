import { getMetadataStorage } from './MetadataUtils';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';
import { IEntity, EntityConstructorOrPath, ITransactionReferenceStorage } from './types';
import { FirestoreTransaction } from './Transaction/FirestoreTransaction';
import { FirestoreBatch } from './Batch/FirestoreBatch';

type RepositoryType = 'default' | 'base' | 'custom' | 'transaction';

// TODO: return transaction repo. Is it needed?!?
function _getRepository<T extends IEntity = IEntity>(
  entityConstructorOrPath: EntityConstructorOrPath<T>,
  repositoryType: RepositoryType
): BaseFirestoreRepository<T> {
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

  // TODO: create tests
  if (!collection) {
    const error = isPath
      ? `'${collectionName}' is not a valid path for a collection`
      : `'${collectionName}' is not a valid collection`;
    throw new Error(error);
  }

  const repository = metadataStorage.getRepository(collection.entityConstructor);

  if (repositoryType === 'custom' && !repository) {
    throw new Error(`'${collectionName}' does not have a custom repository.`);
  }

  // If the collection has a parent, check that we have registered the parent
  if (collection.parentEntityConstructor) {
    const parentCollection = metadataStorage.getCollection(collection.parentEntityConstructor);

    if (!parentCollection) {
      throw new Error(`'${collectionName}' does not have a valid parent collection.`);
    }
  }

  const RepositoryClass =
    repositoryType === 'custom' || (repositoryType === 'default' && repository)
      ? (repository?.target as any)
      : BaseFirestoreRepository;

  return new RepositoryClass(entityConstructorOrPath);
}

export function getRepository<T extends IEntity>(
  entityConstructorOrPath: EntityConstructorOrPath<T>
) {
  return _getRepository(entityConstructorOrPath, 'default');
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
