import { CustomRepository } from './CustomRepository';
import { BaseFirestoreRepository } from '../BaseFirestoreRepository';

const setRepository = jest.fn();
jest.mock('../MetadataUtils', () => ({
  getMetadataStorage: () => ({
    setRepository,
  }),
}));

describe('CustomRepositoryDecorator', () => {
  beforeEach(() => {
    setRepository.mockReset();
  });

  it('should call metadataStorage.setRepository with right params', () => {
    class Entity {
      id: string;
    }

    @CustomRepository(Entity)
    class EntityRepo extends BaseFirestoreRepository<Entity> {}

    expect(setRepository).toHaveBeenCalledWith({
      entity: Entity,
      target: EntityRepo,
    });
  });

  it('should throw an error if the repository does not extend BaseFirestoreRepository', () => {
    class Entity {
      id: string;
    }

    const createInvalidRepo = () => {
      @CustomRepository(Entity)
      class InvalidRepo {
        id: string;
      }
      return InvalidRepo;
    };

    expect(() => {
      createInvalidRepo() as any;
    }).toThrowError('Custom repository must extend BaseFirestoreRepository');
  });

  it('should throw an error if trying to register a custom repository twice', () => {
    class Entity {
      id: string;
    }

    @CustomRepository(Entity)
    class EntityRepo1 extends BaseFirestoreRepository<Entity> {}

    // Mock the behavior of setRepository to simulate existing repository registration
    setRepository.mockImplementationOnce(() => {
      throw new Error('Cannot register a custom repository twice with two different targets');
    });

    expect(() => {
      @CustomRepository(Entity)
      class EntityRepo2 extends BaseFirestoreRepository<Entity> {}
    }).toThrowError('Cannot register a custom repository twice with two different targets');
  });
});
