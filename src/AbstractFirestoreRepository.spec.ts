import { CollectionReference, Transaction } from '@google-cloud/firestore';
import { getMetadataStorage } from './MetadataUtils';
import { FullCollectionMetadata, MetadataStorageConfig } from './MetadataStorage';
import { NoFirestoreError, NoMetadataError, NoParentPropertyKeyError } from './Errors';
import { IEntity } from './types';
import { AbstractFirestoreRepository } from './AbstractFirestoreRepository';
import { FirestoreTransaction } from './Transaction/FirestoreTransaction';

jest.mock('./MetadataUtils');
jest.mock('./helpers');
jest.mock('./Transaction/FirestoreTransaction');

interface FirestoreGeoPoint {
  latitude: number;
  longitude: number;
}

interface FirestoreDocumentReference {
  id: string;
  path: string;
}

interface FirestoreData {
  timestampField: { toDate: () => Date };
  geoPointField: FirestoreGeoPoint;
  documentReferenceField: FirestoreDocumentReference;
  nestedObject: {
    timestampField: { toDate: () => Date };
  };
}

interface TransformedData {
  timestampField: Date;
  geoPointField: { latitude: number; longitude: number };
  documentReferenceField: { id: string; path: string };
  nestedObject: {
    timestampField: Date;
  };
}

class TestEntity implements IEntity {
  id!: string;
}

describe('AbstractFirestoreRepository', () => {
  let collectionRefMock: jest.Mocked<CollectionReference>;
  let getCollectionMock: jest.Mock;
  let firestoreRefMock: any;
  let getRepositoryMock: jest.Mock;
  let firestoreTransactionMock: jest.Mocked<FirestoreTransaction>;

  beforeEach(() => {
    collectionRefMock = {
      doc: jest.fn().mockReturnThis(),
      collection: jest.fn().mockReturnThis(),
      add: jest.fn().mockResolvedValue({ id: 'new-id' }),
    } as unknown as jest.Mocked<CollectionReference>;

    getCollectionMock = jest.fn();
    firestoreRefMock = {
      collection: jest.fn().mockReturnValue(collectionRefMock),
    };

    (getMetadataStorage as jest.Mock).mockReturnValue({
      getCollection: getCollectionMock,
      config: {} as MetadataStorageConfig,
      firestoreRef: firestoreRefMock,
    });

    getRepositoryMock = jest.fn();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const helpers = require('./helpers');
    helpers.getRepository = getRepositoryMock;
    getRepositoryMock.mockReturnValue({ someMethod: jest.fn() });

    firestoreTransactionMock = {
      getRepository: jest.fn().mockReturnValue({ someMethod: jest.fn() }),
    } as unknown as jest.Mocked<FirestoreTransaction>;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const FirestoreTransaction = require('./Transaction/FirestoreTransaction');
    (FirestoreTransaction.FirestoreTransaction as jest.Mock).mockImplementation(
      () => firestoreTransactionMock
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  class TestRepository extends AbstractFirestoreRepository<TestEntity> {
    execute = jest.fn();
    findById = jest.fn();
    create = jest.fn();
    update = jest.fn();
    delete = jest.fn();

    // Expose the protected methods for testing
    public transformTypes(obj: FirestoreData): TransformedData {
      const transformed = this.transformFirestoreTypes(obj as unknown as Record<string, unknown>);
      return transformed as unknown as TransformedData;
    }

    public initializeSubCollectionsPublic(
      entity: TestEntity,
      tran?: Transaction,
      tranRefStorage?: any
    ) {
      return this.initializeSubCollections(entity, tran, tranRefStorage);
    }
  }

  describe('Constructor', () => {
    it('should throw NoFirestoreError if firestoreRef is not set', () => {
      (getMetadataStorage as jest.Mock).mockReturnValueOnce({
        getCollection: getCollectionMock,
        config: {} as MetadataStorageConfig,
        firestoreRef: undefined,
      });

      expect(() => new TestRepository('path', 'TestEntity')).toThrow(NoFirestoreError);
    });

    it('should throw NoMetadataError if no Metadata is not found for the specified collection', () => {
      getCollectionMock.mockReturnValueOnce(undefined);

      expect(() => new TestRepository('path', 'TestEntity')).toThrow(NoMetadataError);
    });

    it('should initialize class properties correctly', () => {
      const colMetadataMock = {
        entityConstructor: TestEntity,
        name: 'TestEntity',
        segments: ['TestEntity'],
        parentProps: null,
        subCollections: [],
      } as FullCollectionMetadata;

      getCollectionMock.mockReturnValueOnce(colMetadataMock);

      const repository = new TestRepository('path', 'TestEntity');

      expect((repository as any).colMetadata).toBe(colMetadataMock);
      expect((repository as any).path).toBe('path');
      expect((repository as any).name).toBe('TestEntity');
      expect((repository as any).firestoreColRef).toBe(collectionRefMock);
    });
  });

  describe('transformFirestoreTypes', () => {
    it('should transform Firestore types correctly', () => {
      const colMetadataMock = {
        entityConstructor: TestEntity,
        name: 'TestEntity',
        segments: ['TestEntity'],
        parentProps: null,
        subCollections: [],
      } as FullCollectionMetadata;

      getCollectionMock.mockReturnValueOnce(colMetadataMock);

      const repository = new TestRepository('path', 'TestEntity');

      const firestoreData: FirestoreData = {
        timestampField: {
          toDate: () => new Date('2020-01-01T00:00:00Z'),
        },
        geoPointField: {
          latitude: 10,
          longitude: 20,
        },
        documentReferenceField: {
          id: 'docId',
          path: 'path/to/doc',
        },
        nestedObject: {
          timestampField: {
            toDate: () => new Date('2020-01-01T00:00:00Z'),
          },
        },
      };

      // Explicitly cast the transformed data to the correct type
      const transformedData = repository.transformTypes(firestoreData);

      expect(transformedData.timestampField).toEqual(new Date('2020-01-01T00:00:00Z'));
      expect(transformedData.geoPointField).toEqual({ latitude: 10, longitude: 20 });
      expect(transformedData.documentReferenceField).toEqual({ id: 'docId', path: 'path/to/doc' });
      expect(transformedData.nestedObject.timestampField).toEqual(new Date('2020-01-01T00:00:00Z'));
    });
  });

  describe('initializeSubCollections', () => {
    it('should initialize subcollections correctly', () => {
      const colMetadataMock = {
        entityConstructor: TestEntity,
        name: 'TestEntity',
        segments: ['TestEntity'],
        parentProps: null,
        subCollections: [
          {
            name: 'subCollection',
            parentProps: {
              parentPropertyKey: 'subCollectionRepository',
            },
          },
        ],
      } as FullCollectionMetadata;

      getCollectionMock.mockReturnValueOnce(colMetadataMock);

      const repository = new TestRepository('path', 'TestEntity');

      const entity = new TestEntity();
      entity.id = 'entityId';

      repository.initializeSubCollectionsPublic(entity);

      expect((entity as any).subCollectionRepository).toBeDefined();
      expect(getRepositoryMock).toHaveBeenCalledWith('path/entityId/subCollection');
    });

    it('should throw NoParentPropertyKeyError if parentPropertyKey is not defined', () => {
      const colMetadataMock = {
        entityConstructor: TestEntity,
        name: 'TestEntity',
        segments: ['TestEntity'],
        parentProps: null,
        subCollections: [
          {
            name: 'subCollection',
            parentProps: null,
          },
        ],
      } as FullCollectionMetadata;

      getCollectionMock.mockReturnValueOnce(colMetadataMock);

      const repository = new TestRepository('path', 'TestEntity');

      const entity = new TestEntity();
      entity.id = 'entityId';

      expect(() => repository.initializeSubCollectionsPublic(entity)).toThrow(
        NoParentPropertyKeyError
      );
    });

    it('should initialize subcollections correctly within a transaction', () => {
      const colMetadataMock = {
        entityConstructor: TestEntity,
        name: 'TestEntity',
        segments: ['TestEntity'],
        parentProps: null,
        subCollections: [
          {
            name: 'subCollection',
            parentProps: {
              parentPropertyKey: 'subCollectionRepository',
            },
          },
        ],
      } as FullCollectionMetadata;

      getCollectionMock.mockReturnValueOnce(colMetadataMock);

      const repository = new TestRepository('path', 'TestEntity');

      const entity = new TestEntity();
      entity.id = 'entityId';

      const tranRefStorageMock = { add: jest.fn() };

      repository.initializeSubCollectionsPublic(entity, {} as Transaction, tranRefStorageMock);

      expect((entity as any).subCollectionRepository).toBeDefined();
      expect(firestoreTransactionMock.getRepository).toHaveBeenCalledWith(
        'path/entityId/subCollection'
      );
      expect(tranRefStorageMock.add).toHaveBeenCalledWith({
        parentPropertyKey: 'subCollectionRepository',
        path: 'path/entityId/subCollection',
        entity,
      });
    });
  });
});
