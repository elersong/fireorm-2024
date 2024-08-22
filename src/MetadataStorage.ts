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
import { plural, singular } from 'pluralize';
import { arraysAreEqual } from './utils';
import {
  CollectionPathNotFoundError,
  CustomRepositoryInheritanceError,
  DuplicateCollectionError,
  DuplicateSubCollectionError,
  IncompleteOrInvalidPathError,
} from './Errors';

export interface BaseCollectionMetadata<T extends IEntity = IEntity> {
  path: string;
  entityConstructor: IEntityConstructor<T>;
}

interface EnforcedParentProperties<T extends IEntity = IEntity> {
  parentProps: ParentProperties<T> | null;
}

export interface EnforcedCollectionMetadata<T extends IEntity = IEntity>
  extends BaseCollectionMetadata<T>,
    EnforcedParentProperties<T> {
  pathSlug: string;
    }

export interface CollectionMetadataWithSegments<T extends IEntity = IEntity>
  extends EnforcedCollectionMetadata<T> {
  segments: string[];
  pathSlug: string;
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

  private generateTemplatePath(
    col: EnforcedCollectionMetadata
  ): string {
    if (!col.parentProps) {
      // Use the passed pathSlug instead of the constructor name
      return `/${col.pathSlug}`;
    }

    return `/${col.parentProps.parentPathSlug}/:${singular(col.parentProps.parentEntityConstructor.name)}Id/${col.pathSlug}`;
  }

  private registerCollectionMetadata(
    col: EnforcedCollectionMetadata | CollectionMetadataWithSegments
  ): CollectionMetadataWithSegments {
    const templatePath = this.generateTemplatePath(col);

    const collectionMetadata: CollectionMetadataWithSegments = {
      ...col,
      path: templatePath,
      segments: templatePath.split('/').filter( nonEmptyValue => nonEmptyValue), // Keep segments for potential use elsewhere
      pathSlug: col.pathSlug,
    };

    this.collections.push(collectionMetadata);

    return collectionMetadata;
  }

  public setCollection(col: EnforcedCollectionMetadata) {
    const colIsSubCollection = this.isSubCollectionMetadata(col);

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

    this.registerCollectionMetadata(col);
  }

  public async getCollection(
    pathOrConstructor: string | IEntityConstructor
  ): Promise<CollectionMetadataWithSegments | null> {
    let collection: CollectionMetadataWithSegments | undefined;

    if (typeof pathOrConstructor === 'string') {
      for (const registeredCollection of this.collections) {
        const params = this.matchTemplatePath(registeredCollection.path, pathOrConstructor);
        if (params) {
          // Resolve placeholders in the template without altering the original registered collection
          const resolvedPath = registeredCollection.path.replace(/:\w+Id/g, (match) => {
            const paramName = match.substring(1);
            return params[paramName];
          });

          // Create a copy of the collection metadata and update it for this retrieval
          const collectionCopy = { ...registeredCollection, path: resolvedPath };

          // Replace placeholders in the parentProps (like parentId) in the copy
          if (collectionCopy.parentProps) {
            collectionCopy.parentProps = { ...collectionCopy.parentProps, parentId: params[singular(collectionCopy.parentProps.parentEntityConstructor.name)] };
          }

          return collectionCopy;
        }
      }
    } else {
      // Handle entity constructor-based lookup
      collection = this.collections.find(
        c => c.entityConstructor === pathOrConstructor
      );
    }

    return collection || null;
  }

  private matchTemplatePath(
    template: string,
    actualPath: string
  ): { [key: string]: string } | null {
    const templateSegments = template.split('/');
    const actualSegments = actualPath.split('/');

    if (templateSegments.length !== actualSegments.length) {
      return null; // Length mismatch, so no match
    }

    const params: { [key: string]: string } = {};

    for (let i = 0; i < templateSegments.length; i++) {
      if (templateSegments[i].startsWith(':')) {
        const paramName = templateSegments[i].substring(1); // Extract placeholder name (e.g., "recipeId")
        params[paramName] = actualSegments[i]; // Map actual value (e.g., "classic-french-omelette")
      } else if (templateSegments[i] !== actualSegments[i]) {
        return null; // No match if a static segment differs
      }
    }

    return params; // Return the resolved params if it matches
  }

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
