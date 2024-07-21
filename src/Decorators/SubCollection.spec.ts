import { SubCollection } from './SubCollection';
import { IEntity, ISubCollection } from '../types';
import { Collection } from './Collection';

const setCollection = jest.fn();
jest.mock('../MetadataUtils', () => ({
  getMetadataStorage: () => ({
    setCollection,
  }),
}));

describe('SubCollectionDecorator', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should register collections', () => {
    class SubEntity {
      public id: string;
    }

    @Collection()
    class Entity {
      id: string;

      // TODO: figure out how to resolve this ts error
      @SubCollection(SubEntity)
      subentity: ISubCollection<SubEntity>;
    }

    expect(setCollection).toHaveBeenCalledWith({
      name: 'subentity',
      entityConstructor: SubEntity,
      parentProps: {
        parentEntityConstructor: Entity,
        parentPropertyKey: 'subentity',
        parentCollectionName: 'Entities'
      }
    });
  });
 
});
