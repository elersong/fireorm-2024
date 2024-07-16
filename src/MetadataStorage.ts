import { Firestore } from '@google-cloud/firestore';
import { BaseRepository } from './BaseRepository';
import type {
  IEntityConstructor,
  Constructor,
  IEntity,
  IEntityRepositoryConstructor,
  ValidatorOptions,
} from './types';
import { arraysAreEqual } from './utils';

export interface CollectionMetadata {
  name: string;
  entityConstructor: IEntityConstructor;
}

export interface SubCollectionMetadata extends CollectionMetadata {
  parentEntityConstructor: IEntityConstructor;
  propertyKey: string;
  parentName: string;
}

export interface CollectionMetadataWithSegments extends CollectionMetadata {
  segments: string[];
}

export interface SubCollectionMetadataWithSegments extends SubCollectionMetadata {
  segments: string[];
}

export interface FullCollectionMetadata extends CollectionMetadataWithSegments {
  subCollections: SubCollectionMetadataWithSegments[];
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

export type AnyCollectionMetadata = CollectionMetadata | SubCollectionMetadata | CollectionMetadataWithSegments | SubCollectionMetadataWithSegments;

export class MetadataStorage {
  readonly collections: Array<CollectionMetadataWithSegments | SubCollectionMetadataWithSegments> = [];
  protected readonly repositories: Map<IEntityConstructor, RepositoryMetadata> = new Map();

  public config: MetadataStorageConfig = {
    validateModels: false,
    validatorOptions: {},
    throwOnDuplicatedCollection: true,
  };

  // Since metadata collections are stored in a flat array, we need a filter for types
  private isSubCollectionMetadata = (collection: AnyCollectionMetadata): collection is SubCollectionMetadata  => {
    return (collection as SubCollectionMetadata).parentEntityConstructor !== undefined;
  }

  private isSubCollectionMetadataWithSegments = (collection: AnyCollectionMetadata): collection is SubCollectionMetadataWithSegments => {
    return (collection as SubCollectionMetadataWithSegments).parentEntityConstructor !== undefined;
  }



  public getCollection = (pathOrConstructor: string | IEntityConstructor, name?: string, propertyKey?: string) => {
    // All collections have a pathOrConstructor and a name
    // Subcollections have a propertyKey

    let collection: CollectionMetadataWithSegments | undefined;

    // If is a path like users/user-id/messages/message-id/senders,
    // take all the even segments [users/messages/senders] and
    // look for an entity with those segments
    if (typeof pathOrConstructor === 'string') {
      const segments = pathOrConstructor.split('/');

      // Throw error if incomplete segment
      if (segments.length % 2 === 0) {
        throw new Error(`Invalid collection path: ${pathOrConstructor}`);
      }

      // Throw error if top level path. ex: 'users'
      if (segments.length === 1) {
        throw new Error(`Invalid collection path: ${pathOrConstructor}. Top level paths are not allowed. Must be a path to a subcollection.`);
      }

      const collectionSegments = segments.reduce<string[]>(
        (acc, cur, index) => (index % 2 === 0 ? acc.concat(cur) : acc),
        []
      );

      const name = segments[segments.length - 1];

      collection = this.collections.find(c => arraysAreEqual(c.segments, collectionSegments) && c.name === name);
    } else {
      collection = this.collections.find(c => c.entityConstructor === pathOrConstructor && c.name === name);
    }

    if (!collection) {
      return null;
    }

    const subCollections = this.collections.filter(
      s => this.isSubCollectionMetadataWithSegments(s) && s.parentEntityConstructor === collection?.entityConstructor && s.parentName === collection?.name
    ) as SubCollectionMetadataWithSegments[];

    return {
      ...collection,
      subCollections,
    };
  };

  public setCollection = (col: CollectionMetadata | SubCollectionMetadata) => {

    const colIsSubCollection = this.isSubCollectionMetadata(col);

    const existing = this.collections.find( c => {
      if (colIsSubCollection) {
        if (!this.isSubCollectionMetadata(c)) {
          // automatically return false if the collection types of col and c don't match
          return false;
        }
        // only a subcollection will have a propertyKey
        return this.isSubCollectionMetadata(col) &&
        c.entityConstructor === col.entityConstructor &&
        c.propertyKey === col.propertyKey &&
        c.name === col.name;
      } else {
        if (this.isSubCollectionMetadata(c)) {
          // automatically return false if the collection types of col and c don't match
          return false;
        }
        return c.entityConstructor === col.entityConstructor &&
        c.name === col.name
      }
    });

    if (existing && this.config.throwOnDuplicatedCollection == true) {
      throw new Error(`Collection (${existing.entityConstructor}) with name ${existing.name} has already been registered`);
    }

    let colToAdd: CollectionMetadataWithSegments | SubCollectionMetadataWithSegments;
    if (colIsSubCollection) {
     colToAdd = {
      ...col,
      propertyKey: col.propertyKey,
      parentEntityConstructor: col.parentEntityConstructor,
      parentName: col.parentName,
      segments: [col.name],
     } as SubCollectionMetadataWithSegments;
    } else {
      colToAdd = {
        ...col,
        segments: [col.name],
      } as CollectionMetadataWithSegments;
    }

    this.collections.push(colToAdd);

    const findSubCollectionsOf = (collectionConstructor: Constructor<IEntity>, name: string) => {
      return this.collections.filter(c => {
        return this.isSubCollectionMetadataWithSegments(c) &&
        c.parentEntityConstructor === collectionConstructor &&
        c.parentName === name &&
        c.segments.includes(name);
      });
    } 

    const colsToUpdate = findSubCollectionsOf(col.entityConstructor, col.name);

    // Update segments for subcollections and subcollections of subcollections
    while (colsToUpdate.length) {
      const c = colsToUpdate.pop();

      if (!c) {
        return;
      }

      const cIsSubCollection = this.isSubCollectionMetadataWithSegments(c);

      const parentOfC = this.collections.find(
        p => cIsSubCollection && p.entityConstructor === c.parentEntityConstructor && p.name === c.parentName
      );
      c.segments = parentOfC?.segments.concat(c.name) || [];
      findSubCollectionsOf(c.entityConstructor, c.name).forEach(col => colsToUpdate.push(col));
    }
  };

  public getRepository = (param: IEntityConstructor) => {
    return this.repositories.get(param) || null;
  };

  public setRepository = (repo: RepositoryMetadata) => {
    const savedRepo = this.getRepository(repo.entity);

    if (savedRepo && repo.target !== savedRepo.target) {
      throw new Error('Cannot register a custom repository twice with two different targets');
    }

    if (!(repo.target.prototype instanceof BaseRepository)) {
      throw new Error(
        'Cannot register a custom repository on a class that does not inherit from BaseFirestoreRepository'
      );
    }

    this.repositories.set(repo.entity, repo);
  };

  public getRepositories = () => {
    return this.repositories;
  };

  public firestoreRef: Firestore;
}
