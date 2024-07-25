import {
  MetadataStorage,
  RepositoryMetadata,
  EnforcedCollectionMetadata,
  validateRepositoryIndex,
} from './MetadataStorage';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';
import { IRepository, Constructor } from './types';
import { CollectionPathNotFoundError, InvalidRepositoryIndexError } from './Errors';

describe('MetadataStorage', () => {
  let metadataStorage: MetadataStorage;
  class Entity {
    id: string;
  }

  class SubEntity {
    id: string;
  }

  class SubSubEntity {
    public id: string;
  }

  const col: EnforcedCollectionMetadata = {
    entityConstructor: Entity,
    name: 'entity',
    parentProps: null,
  };

  const subCol: EnforcedCollectionMetadata = {
    entityConstructor: SubEntity,
    name: 'subEntity',
    parentProps: {
      parentEntityConstructor: Entity,
      parentPropertyKey: 'subEntities',
      parentCollectionName: 'entity',
    },
  };

  const subSubCol: EnforcedCollectionMetadata = {
    entityConstructor: SubSubEntity,
    name: 'subSubEntity',
    parentProps: {
      parentEntityConstructor: SubEntity,
      parentPropertyKey: 'subSubEntities',
      parentCollectionName: 'subEntity',
    },
  };

  beforeEach(() => {
    metadataStorage = new MetadataStorage();
  });

  describe('getCollection', () => {
    beforeEach(() => {
      metadataStorage.setCollection(subSubCol);
      metadataStorage.setCollection(subCol);
      metadataStorage.setCollection(col);
    });

    it('should get Collection by entityConstructor and name', () => {
      const entityMetadata = metadataStorage.getCollection(Entity, 'entity');

      expect(entityMetadata?.entityConstructor).toEqual(col.entityConstructor);
      expect(entityMetadata?.name).toEqual(col.name);
      expect(entityMetadata?.segments).toEqual(['entity']);
      expect(entityMetadata?.subCollections.length).toEqual(1);
    });

    it('should get SubCollection by string and name', () => {
      const entityMetadata = metadataStorage.getCollection(
        'entity/entity-id/subEntity/subEntity-id/subSubEntity',
        'subSubEntity'
      );

      const entityMetadataByConstructor = metadataStorage.getCollection(
        SubSubEntity,
        'subSubEntity'
      );

      expect(entityMetadata?.entityConstructor).toEqual(subSubCol.entityConstructor);
      expect(entityMetadataByConstructor?.entityConstructor).toEqual(subSubCol.entityConstructor);
      expect(entityMetadata?.name).toEqual(subSubCol.name);
      expect(entityMetadataByConstructor?.name).toEqual(subSubCol.name);
      expect(entityMetadata?.segments).toEqual(['entity', 'subEntity', 'subSubEntity']);
      expect(entityMetadataByConstructor?.segments).toEqual([
        'entity',
        'subEntity',
        'subSubEntity',
      ]);
      expect(entityMetadata?.subCollections.length).toEqual(0);
      expect(entityMetadataByConstructor?.subCollections.length).toEqual(0);
    });

    // Remove previous functionality
    it('should not get SubCollection by constructor only', () => {
      const entityMetadata = metadataStorage.getCollection(subSubCol.entityConstructor);

      expect(entityMetadata?.entityConstructor).toBeUndefined();
    });

    it('should throw error when using invalid collection path', () => {
      expect(() => metadataStorage.getCollection('this_is_not_a_path')).toThrow(
        CollectionPathNotFoundError
      );
    });

    it('should throw error if initialized with an invalid subcollection path', () => {
      expect(() =>
        metadataStorage.getCollection('entity/entity-id/subEntity/subEntity-id/fake-path')
      ).toThrow(CollectionPathNotFoundError);
    });

    it('should return null when using invalid collection constructor', () => {
      class NewEntity {
        id: string;
      }

      const entityMetadata = metadataStorage.getCollection(NewEntity);
      expect(entityMetadata).toEqual(null);
    });

    it('should initialize subcollection metadata', () => {
      const entityMetadata = metadataStorage.getCollection(Entity, 'entity');

      expect(entityMetadata?.subCollections.length).toEqual(1);
      expect(entityMetadata?.subCollections[0].entityConstructor).toEqual(subCol.entityConstructor);
      expect(entityMetadata?.subCollections[0].segments).toEqual(['entity', 'subEntity']);
    });

    it('should throw error if initialized with an incomplete path', () => {
      expect(() =>
        metadataStorage.getCollection('entity/entity-id/subEntity/subEntity-id')
      ).toThrow('Invalid collection path: entity/entity-id/subEntity/subEntity-id');
    });
  });

  // TODO: Test that subcollections get their segments updated when a parent collection is added
  describe('setCollection', () => {
    it('should store collections', () => {
      metadataStorage.setCollection(col);
      const collection = metadataStorage.collections.find(
        c => c.entityConstructor === col.entityConstructor
      );

      expect(collection?.segments).not.toBeUndefined();
      expect(collection?.entityConstructor).toEqual(col.entityConstructor);
      expect(collection?.name).toEqual(col.name);
      expect(collection?.segments).toEqual([col.name]);
    });

    it('should throw when trying to store duplicate collections', () => {
      metadataStorage.setCollection(col);
      expect(() => metadataStorage.setCollection(col)).toThrowError(
        `Collection<Entity> with name '${col.name}' has already been registered`
      );
    });

    it('should throw when trying to store duplicate subcollections', () => {
      metadataStorage.setCollection(subCol);
      expect(() => metadataStorage.setCollection(subCol)).toThrowError(
        `SubCollection<SubEntity> with name '${subCol.name}' and propertyKey '${subCol.parentProps?.parentPropertyKey}' has already been registered`
      );
    });

    it('should update segments for nested subcollections', () => {
      // Due to the order of how the decorators are evaluated,
      // children collections are registered first
      metadataStorage.setCollection(subSubCol);
      metadataStorage.setCollection(subCol);
      metadataStorage.setCollection(col);

      const collection = metadataStorage.collections.find(
        c => c.entityConstructor === subSubCol.entityConstructor
      );

      expect(collection?.segments).toEqual([col.name, subCol.name, subSubCol.name]);
    });
  });

  describe('getRepository', () => {
    class EntityRepository extends BaseFirestoreRepository<Entity> {}

    const entityRepository: RepositoryMetadata = {
      entity: Entity,
      target: EntityRepository as unknown as Constructor<IRepository<Entity>>,
    };

    beforeEach(() => {
      metadataStorage.setRepository(entityRepository);
    });

    it('should get repositories', () => {
      const repo = metadataStorage.getRepository(Entity);

      expect(repo?.entity).toEqual(entityRepository.entity);
      expect(repo?.target).toEqual(entityRepository.target);
    });

    it('should return null for invalid repositories', () => {
      class WrongEntity {
        id: string;
      }

      const repo = metadataStorage.getRepository(WrongEntity);
      expect(repo).toEqual(null);
    });
  });

  describe('setRepository', () => {
    class EntityRepository extends BaseFirestoreRepository<Entity> {}

    const entityRepository: RepositoryMetadata = {
      entity: Entity,
      target: EntityRepository as unknown as Constructor<IRepository<Entity>>,
    };

    it('should store repositories', () => {
      metadataStorage.setRepository(entityRepository);
      const repo_index = JSON.stringify([Entity.name, null]);
      expect(metadataStorage.getRepositories().size).toEqual(1);
      expect(metadataStorage.getRepositories().get(repo_index)?.entity).toEqual(Entity);
    });

    it('should handle when two identical repositories are set', () => {
      class EntityRepository2 extends BaseFirestoreRepository<Entity> {}

      const entityRepository2: RepositoryMetadata = {
        entity: Entity,
        target: EntityRepository2 as unknown as Constructor<IRepository<Entity>>,
      };

      metadataStorage.setRepository(entityRepository);

      expect(() => metadataStorage.setRepository(entityRepository2)).not.toThrow();
      const metadataStorageRepositories = metadataStorage.getRepositories();
      expect(metadataStorageRepositories.size).toEqual(1);
    });

    it('should throw when trying to store repositories that dont inherit from BaseRepository', () => {
      class EntityRepository2 {}
      class Entity2 {
        id: string;
      }

      const entityRepository2: RepositoryMetadata = {
        entity: Entity2,
        target: EntityRepository2 as unknown as Constructor<IRepository<Entity>>,
      };

      metadataStorage.setRepository(entityRepository);

      expect(() => metadataStorage.setRepository(entityRepository2)).toThrowError(
        'Cannot register a custom repository on a class that does not inherit from BaseFirestoreRepository'
      );
    });
  });

  describe('validateRepositoryIndex', () => {
    it('should throw error when repository index is invalid', () => {
      expect(() => validateRepositoryIndex(['string'])).toThrowError(
        'Invalid RepositoryIndex: Must be a tuple [string, (string | null)]'
      );
      expect(() => validateRepositoryIndex(['string', 'string', 'string'])).toThrow(
        InvalidRepositoryIndexError
      );
    });

    it('should not throw error when repository index is valid', () => {
      expect(() => validateRepositoryIndex(['string', null])).not.toThrow();
      expect(() => validateRepositoryIndex(['string', 'string'])).not.toThrow();
    });
  });

  describe('private methods', () => {
    describe('isSubCollectionMetadata', () => {
      it('should return true for correctly configured subcollection metadata', () => {
        class TestClass {
          id: string;
          value: string;
          constructor(value: string) {
            this.value = value;
          }
        }
        class TestClass2 {
          id: string;
          value: string;
          constructor(value: string) {
            this.value = value;
          }
        }

        const classInstance = new MetadataStorage();
        const subCollectioMetadata = {
          entityConstructor: TestClass,
          name: 'test',
          parentProps: {
            parentCollectionName: 'test2',
            parentEntityConstructor: TestClass2,
            parentPropertyKey: 'test',
          },
        } as EnforcedCollectionMetadata<TestClass>;

        const result = (classInstance as any)['isSubCollectionMetadata'](subCollectioMetadata);
        expect(result).toEqual(true);
      });

      it('should return false for collection metadata or any incorrect type', () => {
        class TestClass {
          id: string;
          value: string;
          constructor(value: string) {
            this.value = value;
          }
        }

        const classInstance = new MetadataStorage();
        const subCollectioMetadata = {
          entityConstructor: TestClass,
          name: 'test',
          parentProps: null,
        } as EnforcedCollectionMetadata<TestClass>;

        const result = (classInstance as any)['isSubCollectionMetadata'](subCollectioMetadata);
        expect(result).toEqual(false);
        const result2 = (classInstance as any)['isSubCollectionMetadata']({});
        expect(result2).toEqual(false);
      });
    });

    describe('isSameCollection', () => {
      it('should return true when inputs are equivalent values', () => {
        class TestClass {
          id: string;
          value: string;
          constructor(value: string) {
            this.value = value;
          }
        }

        const classInstance = new MetadataStorage();
        const subCollectioMetadata = {
          entityConstructor: TestClass,
          name: 'test',
          parentProps: null,
        } as EnforcedCollectionMetadata<TestClass>;
        const sameCollectionMetadata = subCollectioMetadata;

        const result = (classInstance as any)['isSameCollection'](
          subCollectioMetadata,
          sameCollectionMetadata
        );
        expect(result).toEqual(true);
      });

      it('should return false for the incorrect input type', () => {
        class TestClass {
          id: string;
          value: string;
          constructor(value: string) {
            this.value = value;
          }
        }

        const classInstance = new MetadataStorage();
        const subCollectioMetadata = {
          entityConstructor: TestClass,
          name: 'test',
          parentProps: null,
        } as EnforcedCollectionMetadata<TestClass>;
        const sameCollectionMetadata = { ...subCollectioMetadata };
        sameCollectionMetadata.name = 'test2';

        const result = (classInstance as any)['isSameCollection'](
          subCollectioMetadata,
          sameCollectionMetadata
        );
        expect(result).toEqual(false);
      });
    });
  });
});
