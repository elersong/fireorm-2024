import { getMetadataStorage } from '../MetadataUtils';
import { Constructor, IEntity } from '../types';
import { BaseFirestoreRepository } from '../BaseFirestoreRepository';
import { IEntityConstructor } from '../types';

/**
 * CustomRepository decorator to register a custom repository for a specific entity type.
 *
 * This decorator registers the given repository class as the custom repository
 * for the specified entity type in the metadata storage. The custom repository
 * class must extend the `BaseFirestoreRepository` class.
 *
 * @template T - The type of the entity.
 * @param {Constructor<T>} entity - The constructor function of the entity type.
 * @returns {Function} - A decorator function that takes the repository class and registers it.
 */
export function CustomRepository<T extends IEntity = IEntity>(entity: Constructor<T>) {
  return function <U extends Constructor<BaseFirestoreRepository<T>>>(
    target: U & { new (pathOrConstructor: string | IEntityConstructor): BaseFirestoreRepository<T> }
  ): void {
    getMetadataStorage().setRepository({
      entity,
      target,
    });
  };
}
