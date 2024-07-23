import { Firestore } from '@google-cloud/firestore';
import { BaseRepository } from './BaseRepository';
import type {
  IEntityConstructor,
  Constructor,
  IEntity,
  IEntityRepositoryConstructor,
  ValidatorOptions,
  ParentProperties,
} from './types';
import { arraysAreEqual } from './utils';

// Unified collection metadata combines the metadata for both collections and subcollections
export interface BaseCollectionMetadata<T extends IEntity = IEntity> {
  name: string;
  entityConstructor: IEntityConstructor<T>;
}

interface EnforcedParentProperties<T extends IEntity = IEntity> {
  parentProps: ParentProperties<T> | null;
}

export interface EnforcedCollectionMetadata<T extends IEntity = IEntity>
  extends BaseCollectionMetadata<T>,
    EnforcedParentProperties<T> {}

export interface CollectionMetadataWithSegments<T extends IEntity = IEntity>
  extends EnforcedCollectionMetadata<T> {
  segments: string[];
}

export interface FullCollectionMetadata extends CollectionMetadataWithSegments {
  subCollections: CollectionMetadataWithSegments[];
}

export interface RepositoryMetadata {
  target: IEntityRepositoryConstructor;
  entity: IEntityConstructor;
  // Custom Repositories have a collectionName
  // TODO: Should all repositories have an assigned collectionName?
  collectionName?: string;
}

export type RepositoryIndex = [string, string | null];

export interface MetadataStorageConfig {
  validateModels: boolean;
  validatorOptions?: ValidatorOptions;
  throwOnDuplicatedCollection?: boolean;
}

// TODO: Refactor into validator fxn file and look for other validations to move
function validateRepositoryIndex(input: any): asserts input is RepositoryIndex {
  if (
    !Array.isArray(input) ||
    input.length !== 2 ||
    typeof input[0] !== 'string' ||
    (input[1] !== null && typeof input[1] !== 'string')
  ) {
    throw new Error('Invalid input: Must be a tuple [string, string | null]');
  }
}

export class MetadataStorage {
  readonly collections: Array<CollectionMetadataWithSegments> = [];
  protected readonly repositories: Map<string, RepositoryMetadata> = new Map();

  public config: MetadataStorageConfig = {
    validateModels: false,
    validatorOptions: {},
    throwOnDuplicatedCollection: true,
  };

  private isSubCollectionMetadata<T extends IEntity>(
    collection: EnforcedCollectionMetadata<T>
  ): boolean {
    return (
      !!collection.parentProps &&
      // Now check for validity of parentProps
      collection.parentProps.parentEntityConstructor !== null &&
      collection.parentProps.parentPropertyKey !== null &&
      collection.parentProps.parentCollectionName !== null
    );
  }

  private isSameCollection<T extends IEntity>(
    collection1: EnforcedCollectionMetadata<T>,
    collection2: EnforcedCollectionMetadata<T>
  ): boolean {
    return (
      collection1.entityConstructor === collection2.entityConstructor &&
      collection1.name === collection2.name &&
      collection1.parentProps?.parentEntityConstructor ===
        collection2.parentProps?.parentEntityConstructor &&
      collection1.parentProps?.parentPropertyKey === collection2.parentProps?.parentPropertyKey &&
      collection1.parentProps?.parentCollectionName ===
        collection2.parentProps?.parentCollectionName
    );
  }

  public getCollection = (
    pathOrConstructor: string | IEntityConstructor,
    collectionName?: string
  ): FullCollectionMetadata | null => {
    // All collections have a pathOrConstructor and a name

    let collection: CollectionMetadataWithSegments | undefined;

    // If it is a path like users/user-id/messages/message-id/senders,
    // take all the even segments [users/messages/senders] and
    // look for an entity with those segments
    if (typeof pathOrConstructor === 'string') {
      // TODO: Refactor with getLastSegment
      const segments = pathOrConstructor.split('/');
      const colName = collectionName ? collectionName : segments[segments.length - 1];

      // Throw error if incomplete segment
      // TODO: IncompletePathError
      if (segments.length % 2 === 0) {
        throw new Error(`Invalid collection path: ${pathOrConstructor}.`);
      }

      // Throw error if path segment doesn't exist
      // TODO: NotFoundError
      if (!this.collections.map(col => col.name).includes(colName)) {
        throw new Error(`Invalid collection path: ${pathOrConstructor}.`);
      }

      const collectionSegments = segments.reduce<string[]>(
        (acc, cur, index) => (index % 2 === 0 ? acc.concat(cur) : acc),
        []
      );

      // TODO: Is the name check necessary? The name is included within the segments.
      collection = this.collections.find(
        c => arraysAreEqual(c.segments, collectionSegments) && c.name === colName
      );
    } else {
      collection = this.collections.find(
        c => c.entityConstructor === pathOrConstructor && c.name === collectionName
      );
    }

    if (!collection) {
      return null;
    }

    const subCollections = this.collections.filter(
      s =>
        this.isSubCollectionMetadata(s) &&
        s.parentProps?.parentEntityConstructor === collection?.entityConstructor &&
        s.parentProps?.parentCollectionName === collection?.name
    );

    return { ...collection, subCollections } as FullCollectionMetadata;
  };

  public setCollection = (col: EnforcedCollectionMetadata) => {
    const colIsSubCollection = this.isSubCollectionMetadata(col);

    const existing = this.collections.find(registeredCollection =>
      this.isSameCollection(registeredCollection, col)
    );

    if (existing && this.config.throwOnDuplicatedCollection == true) {
      if (colIsSubCollection) {
        throw new Error(
          `SubCollection<${existing.entityConstructor.name}> with name '${existing.name}' and propertyKey '${existing.parentProps?.parentPropertyKey}' has already been registered`
        );
      } else {
        throw new Error(
          `Collection<${existing.entityConstructor.name}> with name '${existing.name}' has already been registered`
        );
      }
    }

    const colToAdd: CollectionMetadataWithSegments = {
      ...col,
      segments: [col.name],
    };

    this.collections.push(colToAdd);

    const findSubCollectionsOf = (collectionConstructor: Constructor<IEntity>, name: string) => {
      return this.collections.filter(registeredCollection => {
        return (
          this.isSubCollectionMetadata(registeredCollection) &&
          registeredCollection.parentProps?.parentEntityConstructor === collectionConstructor &&
          registeredCollection.parentProps?.parentCollectionName === name
        );
      });
    };

    const colsToUpdate = findSubCollectionsOf(col.entityConstructor, col.name);

    // Update segments for subcollections and subcollections of subcollections
    while (colsToUpdate.length) {
      const registeredSubCollection = colsToUpdate.pop();

      if (!registeredSubCollection) {
        return;
      }

      const parentOfThisSubCollection = this.collections.find(
        p =>
          p.entityConstructor === registeredSubCollection.parentProps?.parentEntityConstructor &&
          p.name === registeredSubCollection.parentProps?.parentCollectionName
      );
      registeredSubCollection.segments =
        parentOfThisSubCollection?.segments.concat(registeredSubCollection.name) || [];
      findSubCollectionsOf(
        registeredSubCollection.entityConstructor,
        registeredSubCollection.name
      ).forEach(col => colsToUpdate.push(col));
    }
  };

  public getRepository = (entityConstructor: IEntityConstructor, collectionName?: string) => {
    const repo_index = [entityConstructor.name, collectionName ? collectionName : null];
    validateRepositoryIndex(repo_index);
    return this.repositories.get(JSON.stringify(repo_index)) || null;
  };

  public setRepository = (repo: RepositoryMetadata) => {
    //const savedRepo = this.getRepository(repo.entity);

    // if (savedRepo && repo.target !== savedRepo.target) {
    //   // TODO: DuplicatedRepositoryError
    //   // yes we can have the same entity with different repositories, as long as the collectionName is different
    //   throw new Error('Cannot register a custom repository twice with two different targets');
    // }

    if (!(repo.target.prototype instanceof BaseRepository)) {
      throw new Error(
        'Cannot register a custom repository on a class that does not inherit from BaseFirestoreRepository'
      );
    }

    const repo_index = [repo.entity.name, repo.collectionName ? repo.collectionName : null];
    validateRepositoryIndex(repo_index);

    this.repositories.set(JSON.stringify(repo_index), repo);
  };

  public getRepositories = () => {
    return this.repositories;
  };

  public firestoreRef: Firestore;
}
