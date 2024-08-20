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
import {
  CollectionPathNotFoundError,
  CustomRepositoryInheritanceError,
  DuplicateCollectionError,
  DuplicateSubCollectionError,
  IncompleteOrInvalidPathError,
  InvalidRepositoryIndexError,
} from './Errors';

// Unified collection metadata combines the metadata for both collections and subcollections
export interface BaseCollectionMetadata<T extends IEntity = IEntity> {
  path: string;
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

export interface RepositoryMetadata {
  target: IEntityRepositoryConstructor;
  entity: IEntityConstructor;
}

export interface MetadataStorageConfig {
  validateModels: boolean;
  validatorOptions?: ValidatorOptions;
  throwOnDuplicatedCollection?: boolean;
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
      collection.parentProps.parentEntityConstructor !== null &&
      collection.parentProps.parentPropertyKey !== null
    );
  }

  private isSameCollection<T extends IEntity>(
    collection1: EnforcedCollectionMetadata<T>,
    collection2: EnforcedCollectionMetadata<T>
  ): boolean {
    return (
      collection1.entityConstructor === collection2.entityConstructor &&
      collection1.path === collection2.path &&
      collection1.parentProps?.parentEntityConstructor ===
        collection2.parentProps?.parentEntityConstructor &&
      collection1.parentProps?.parentPropertyKey === collection2.parentProps?.parentPropertyKey
    );
  }

  public async getCollection(
    pathOrConstructor: string | IEntityConstructor
  ): Promise<CollectionMetadataWithSegments | null> {
    let collection: CollectionMetadataWithSegments | undefined;

    if (typeof pathOrConstructor === 'string') {
      const segments = pathOrConstructor.split('/');

      if (segments.length % 2 === 0) {
        throw new IncompleteOrInvalidPathError(pathOrConstructor);
      }

      // Extract the relevant segments
      const parentCollectionName = segments[segments.length - 3]; // e.g., "recipes"
      const parentId = segments[segments.length - 2]; // e.g., "omelette"
      const subcollectionName = segments[segments.length - 1]; // e.g., "ingredients"

      // Determine if a matching collection is already registered
      collection = this.collections.find(
        c =>
          c.entityConstructor.name === subcollectionName &&
          c.parentProps?.parentEntityConstructor.name === parentCollectionName &&
          c.parentProps?.parentId === parentId
      );

      if (!collection) {
        // Attempt to dynamically load and register the collection
        const parentPropertyKey = await determineParentPropertyKey(parentCollectionName, parentId, subcollectionName);

        const topLevelCollection = this.firestoreRef.collection(subcollectionName);

        const snapshot = await topLevelCollection
          .where('parentCollection', '==', parentCollectionName)
          .where('parentId', '==', parentId)
          .where('parentPropertyKey', '==', parentPropertyKey)
          .get();

        if (!snapshot.empty) {
          return this.registerCollectionMetadata({
            path: pathOrConstructor,
            entityConstructor: determineEntityConstructor(subcollectionName),
            parentProps: {
              parentEntityConstructor: determineEntityConstructor(parentCollectionName),
              parentPropertyKey: parentPropertyKey,
              parentId: parentId,
            }
          });
        }
      }
    } else {
      // Entity constructor-based lookup
      collection = this.collections.find(
        c => c.entityConstructor === pathOrConstructor
      );
    }

    return collection || null;
  }

  private registerCollectionMetadata = (
    col: EnforcedCollectionMetadata
  ): CollectionMetadataWithSegments => {
    const collectionMetadata: CollectionMetadataWithSegments = {
      ...col,
      segments: col.path.split('/'), // Split the path to generate segments
    };

    // Add the generated metadata to the collections array
    this.collections.push(collectionMetadata);

    return collectionMetadata;
  };

  public setCollection = (col: EnforcedCollectionMetadata) => {
    const colIsSubCollection = this.isSubCollectionMetadata(col);

    // Check if the collection is already registered in the metadata
    const existing = this.collections.find(registeredCollection =>
      this.isSameCollection(registeredCollection, col)
    );

    if (existing && this.config.throwOnDuplicatedCollection) {
      if (colIsSubCollection) {
        throw new DuplicateSubCollectionError(
          existing.entityConstructor.name,
          existing.path,
          existing.parentProps?.parentPropertyKey
        );
      } else {
        throw new DuplicateCollectionError(existing.entityConstructor.name, existing.path);
      }
    }

    // Use the utility function to generate and register the metadata
    this.registerCollectionMetadata(col);
  };

  public getRepository(entityConstructor: IEntityConstructor) {
    return this.repositories.get(entityConstructor.name) || null;
  }

  public setRepository(repo: RepositoryMetadata) {
    if (!(repo.target.prototype instanceof BaseRepository)) {
      throw new CustomRepositoryInheritanceError();
    }

    if (this.repositories.has(repo.entity.name)) {
      return;
    }

    this.repositories.set(repo.entity.name, repo);
  }

  public firestoreRef: Firestore;
}
