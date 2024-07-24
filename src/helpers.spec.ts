import { Collection, CustomRepository } from './Decorators';
import { BaseFirestoreRepository } from './BaseFirestoreRepository';
import {
  getRepository,
  getBaseRepository,
  runTransaction,
  createBatch,
  getCustomRepository,
  getLastSegment,
} from './helpers';
import { initialize } from './MetadataUtils';
import { FirestoreTransaction } from './Transaction/FirestoreTransaction';
import { FirestoreBatch } from './Batch/FirestoreBatch';
import { InvalidInputError, NoCollectionNameError, NoFirestoreError } from './Errors';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const MockFirebase = require('mock-cloud-firestore');

describe('Error state', () => {
  it('getRepository: should throw error if firebase is not initialized', () => {
    @Collection()
    class Entity {
      id: string;
    }

    expect(() => getRepository(Entity, 'Entities')).toThrow(NoFirestoreError);
  });

  it('runTransaction: should throw error if firebase is not initialized', async () => {
    expect(runTransaction(async () => {})).rejects.toThrow(NoFirestoreError);
  });

  it('createBatch: should throw error if firebase is not initialized', () => {
    expect(() => createBatch()).toThrow(NoFirestoreError);
  });
});

describe('Helpers', () => {
  beforeEach(() => {
    const firebase = new MockFirebase();
    const firestore = firebase.firestore();
    initialize(firestore);
  });

  describe('getRepository', () => {
    it('should get custom repositories', () => {
      @Collection()
      class Entity {
        id: string;
      }

      @CustomRepository(Entity, 'Entities')
      class EntityRepo extends BaseFirestoreRepository<Entity> {
        meaningOfLife() {
          return 42;
        }
      }

      const rep = getRepository(Entity, 'Entities') as EntityRepo;
      expect(rep).toBeInstanceOf(BaseFirestoreRepository);
      expect(rep.meaningOfLife()).toEqual(42);
    });

    it('should throw if an entity constructor is provided without a collection name', () => {
      @Collection()
      class Entity {
        id: string;
      }

      expect(() => getRepository(Entity, '')).toThrow(NoCollectionNameError);
      expect(() => getRepository(Entity)).toThrow(NoCollectionNameError);
      expect(() => getRepository(Entity, undefined)).toThrow(NoCollectionNameError);
    });

    it('should get base repositories if custom are not registered', () => {
      @Collection()
      class Entity {
        id: string;
      }

      const rep = getRepository(Entity, 'Entities');
      expect(rep).toBeInstanceOf(BaseFirestoreRepository);
    });

    it('should throw if trying to get a nonexistent collection', () => {
      class Entity {
        id: string;
      }

      expect(() => getRepository(Entity, 'Entities')).toThrow('Invalid collection path: Entities');
    });
  });

  describe('getBaseRepository', () => {
    it('should get base repository even if a custom one is registered', () => {
      @Collection()
      class Entity {
        id: string;
      }

      @CustomRepository(Entity, 'Entities')
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      class EntityRepo extends BaseFirestoreRepository<Entity> {
        meaningOfLife() {
          return 42;
        }
      }

      const rep = getBaseRepository(Entity, 'Entities');
      expect(rep).toBeInstanceOf(BaseFirestoreRepository);
      expect(rep['meaningOfLife']).toBeUndefined;
    });

    it('should throw if no collection name is provided', () => {
      @Collection()
      class Entity {
        id: string;
      }

      expect(() => getBaseRepository(Entity, '')).toThrow(NoCollectionNameError);
    });
  });

  describe('getCustomRepository', () => {
    it('should throw if no collection name is provided', () => {
      @Collection()
      class Entity {
        id: string;
      }

      expect(() => getCustomRepository(Entity, '')).toThrow(NoCollectionNameError);
    });

    it('should get custom repositories', () => {
      @Collection()
      class Entity {
        id: string;
      }

      @CustomRepository(Entity, 'Entities')
      class EntityRepo extends BaseFirestoreRepository<Entity> {
        meaningOfLife() {
          return 42;
        }
      }

      const rep = getCustomRepository(Entity, 'Entities') as EntityRepo;
      expect(rep).toBeInstanceOf(BaseFirestoreRepository);
      expect(rep.meaningOfLife()).toEqual(42);
    });
  });

  describe('runTransaction', () => {
    it.skip('should be able to get a transaction repository', async () => {
      await runTransaction(async transaction => {
        expect(transaction).toBeInstanceOf(FirestoreTransaction);
      });
    });
  });

  describe('createBatch', () => {
    it('should be able to get a batch repository', () => {
      const batch = createBatch();
      expect(batch).toBeInstanceOf(FirestoreBatch);
    });
  });

  describe('getLastSegment', () => {
    it('should get the last segment of a path', () => {
      const lastSegment = getLastSegment('users/user-id/messages/message-id/senders');
      expect(lastSegment).toEqual('senders');
    });

    it('should throw if the path is incomplete', () => {
      expect(() => getLastSegment('users/user-id/messages/message-id'))
        .toThrow(InvalidInputError);
    });

    it('should throw if the path is empty', () => {
      expect(() => getLastSegment('')).toThrow(InvalidInputError);
    });

    it('should throw if the last segment is empty', () => {
      expect(() => getLastSegment('users/user-id/messages/message-id/'))
        .toThrow(InvalidInputError);
    });
  });
});
