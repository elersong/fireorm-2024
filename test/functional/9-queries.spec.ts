import { getRepository, Collection, BaseFirestoreRepository } from '../../src';
import { Band as BandEntity } from '../fixture';
import { getUniqueColName } from '../setup';

describe('Integration test: Queries', () => {
  @Collection(getUniqueColName('band-queries-test'))
  class Band extends BandEntity {}

  let bandRepository: BaseFirestoreRepository<Band>;

  beforeEach(async () => {
    // instantiate the repositories
    bandRepository = getRepository(Band);

    const ewf = new Band();
    ewf.id = 'earth-wind-and-fire';
    ewf.name = 'Earth, Wind & Fire';
    ewf.formationYear = 1969;
    ewf.genres = ['funk', 'soul', 'disco'];

    const pf = new Band();
    pf.id = 'parliament-funkadelic';
    pf.name = 'Parliament-Funkadelic';
    pf.formationYear = 1968;
    pf.genres = ['funk', 'soul'];

    const sfs = new Band();
    sfs.id = 'sly-and-the-family-stone';
    sfs.name = 'Sly and the Family Stone';
    sfs.formationYear = 1966;
    sfs.genres = ['funk', 'soul', 'psychedelic'];

    const kg = new Band();
    kg.id = 'kool-and-the-gang';
    kg.name = 'Kool & The Gang';
    kg.formationYear = 1964;
    kg.genres = ['funk', 'soul', 'disco'];

    await bandRepository.create(ewf);
    await bandRepository.create(pf);
    await bandRepository.create(sfs);
    await bandRepository.create(kg);
  });

  afterEach(async () => {
    const allBands = await bandRepository.find();
    await Promise.all(allBands.map(band => bandRepository.delete(band.id)));
  });

  describe('Simple Queries', () => {
    test('should find a single band by id', async () => {
      const parliament = await bandRepository.findById('parliament-funkadelic');
      expect(parliament.id).toEqual('parliament-funkadelic');
      expect(parliament).not.toBeNull();
      expect(parliament.name).toEqual('Parliament-Funkadelic');
    });

    test('should find all bands', async () => {
      const allBands = await bandRepository.find();
      expect(allBands.length).toEqual(4);
    });
  });

  describe('Filtering and Complex Queries', () => {
    test('should filter bands by genre', async () => {
      const funkBands = await bandRepository.whereArrayContains('genres', 'funk').find();
      expect(funkBands.length).toEqual(4);

      const discoBands = await bandRepository.whereArrayContains('genres', 'disco').find();
      expect(discoBands.length).toEqual(2);

      const psychedelicBands = await bandRepository
        .whereArrayContains('genres', 'psychedelic')
        .find();
      expect(psychedelicBands.length).toEqual(1);
    });

    test('should filter bands by name', async () => {
      const ewf = await bandRepository.whereEqualTo('name', 'Earth, Wind & Fire').find();
      expect(ewf.length).toEqual(1);
      expect(ewf.pop().id).toEqual('earth-wind-and-fire');
    });

    // This test requires an index to be created in Firestore
    // Since each collection is unique, we can't create the index ahead of time
    test.skip('should filter bands by formation year and genre', async () => {
      const funkBefore67 = await bandRepository
        .whereLessThan('formationYear', 1967)
        .whereArrayContains('genres', 'funk')
        .find();

      expect(funkBefore67.length).toEqual(2);
      expect(funkBefore67.map(band => band.id)).toEqual([
        'sly-and-the-family-stone',
        'kool-and-the-gang',
      ]);
    });
  });

  describe('orderBy and limit', () => {
    test('should order bands by formation year ASC', async () => {
      const bands = await bandRepository.orderByAscending('formationYear').find();
      expect(bands.length).toEqual(4);
      expect(bands[0].id).toEqual('kool-and-the-gang');
      expect(bands[3].id).toEqual('earth-wind-and-fire');
    });

    test('should order bands by formation year DESC', async () => {
      const bands = await bandRepository.orderByDescending('formationYear').find();
      expect(bands.length).toEqual(4);
      expect(bands[0].id).toEqual('earth-wind-and-fire');
      expect(bands[3].id).toEqual('kool-and-the-gang');
    });

    test('should limit the number of bands returned', async () => {
      const bands = await bandRepository.limit(2).find();
      expect(bands.length).toEqual(2);

      const bands2 = await bandRepository.limit(3).find();
      expect(bands2.length).toEqual(3);
    });
  });
});
