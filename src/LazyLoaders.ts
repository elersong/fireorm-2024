export function getBaseFirestoreRepositoryClass(): typeof import('./BaseFirestoreRepository').BaseFirestoreRepository {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('./BaseFirestoreRepository').BaseFirestoreRepository;
}
