import { Band as BandEntity, Album as AlbumEntity, getInitialData } from '../fixture';
import {
  getRepository,
  Collection,
  SubCollection,
  BaseFirestoreRepository,
  IEntity,
} from '../../src';
import { getUniqueColName, makeUnique } from '../setup';
import { TransactionRepository } from '../../src/Transaction/BaseFirestoreTransactionRepository';

describe('Integration test: SubCollections', () => {
  class Album extends AlbumEntity {}

  @Collection(getUniqueColName('band-with-subcollections'))
  class FullBand extends BandEntity {
    @SubCollection(Album)
    albums: BaseFirestoreRepository<Album>;
  }

  let fullBandRepository: BaseFirestoreRepository<FullBand> = null;

  beforeEach(async () => {
    fullBandRepository = getRepository(FullBand);
    const seed = getInitialData().map(({ albums, ...band }) => ({
      band,
      albums,
    }));

    for (const s of seed) {
      const band = new FullBand();
      band.id = makeUnique(s.band.id);
      band.name = s.band.name;
      band.genres = s.band.genres;
      band.formationYear = s.band.formationYear;
      band.lastShow = s.band.lastShow;
      band.lastShowCoordinates = null;

      await fullBandRepository.create(band);

      const albums = s.albums.map(a => {
        const album = new Album();
        album.id = makeUnique(a.id);
        album.releaseDate = a.releaseDate;
        album.name = a.name;

        return album;
      });

      await Promise.all(albums.map(a => band.albums.create(a)));
    }
  });

  it('should do crud with subcollections', async () => {
    const rush = new FullBand();
    rush.id = 'rush';
    rush.name = 'Rush';
    rush.formationYear = 1968;
    rush.genres = ['progressive-rock', 'hard-rock', 'heavy-metal'];

    const repo = await fullBandRepository.create(rush);

    // Inserting some albums (subcollections)
    const secondAlbum = new Album();
    secondAlbum.id = 'fly-by-night';
    secondAlbum.name = 'Fly by Night';
    secondAlbum.releaseDate = new Date('1975-02-15');

    const fourthAlbum = new Album();
    fourthAlbum.id = '2112';
    fourthAlbum.name = '2112';
    fourthAlbum.releaseDate = new Date('1976-04-01');

    const eighthAlbum = new Album();
    eighthAlbum.id = 'moving-pictures';
    eighthAlbum.name = 'Moving Pictures';
    eighthAlbum.releaseDate = new Date('1982-02-12');

    const batch = repo.albums.createBatch();

    await rush.albums.create(secondAlbum);
    batch.create(fourthAlbum);
    batch.create(eighthAlbum);

    await batch.commit();

    // Retrieving albums before 1980
    const albumsBefore1980 = await rush.albums
      .whereLessThan('releaseDate', new Date('1980-01-01'))
      .find();

    expect(albumsBefore1980.length).toEqual(2);
    expect(albumsBefore1980[0].id).toEqual('fly-by-night');
    expect(albumsBefore1980[1].id).toEqual('2112');

    // Updating album
    const movingPictures = await rush.albums.findById('moving-pictures');
    movingPictures.releaseDate = new Date('1981-02-12');
    await rush.albums.update(movingPictures);
    const updated = await rush.albums.findById('moving-pictures');
    expect(updated.releaseDate).toEqual(movingPictures.releaseDate);

    // Deleting an album
    await rush.albums.delete('moving-pictures');
    const updatedAlbums = await rush.albums.find();
    expect(updatedAlbums.length).toEqual(2);

    // Updating parent collection
    rush.genres = rush.genres.slice(0, 2);
    await fullBandRepository.update(rush);
    const updatedRush = await fullBandRepository.findById('rush');
    expect(updatedRush.genres).toEqual(rush.genres);
  });

  it('should reinitialize subcollections as TransactionRepository within transactions', async () => {
    const band = new FullBand();
    band.id = 'kc-sunshine-band';
    band.name = 'KC and the Sunshine Band';
    band.formationYear = 1973;
    band.genres = ['disco'];

    await fullBandRepository.create(band);

    const album = new Album();
    album.id = 'do-it-good';
    album.name = 'Do It Good';
    album.releaseDate = new Date('1974-03-01');

    await band.albums.create(album);

    // Outside of a transaction, it should be a BaseFirestoreRepository
    expect(band.albums).toBeInstanceOf(BaseFirestoreRepository);

    // Within a transaction, the subcollection should be a TransactionRepository
    fullBandRepository.runTransaction(async tran => {
      const kc = await tran.findById('kc-sunshine-band');
      expect(kc.albums).toBeInstanceOf(TransactionRepository);
    });
  });

  // This test is limited by the inability to create two collections with the same
  // entity constructor. This is because the entity constructor is used as the key
  // in the collections map in MetadataStorage.
  it.skip('should handle nested subcollections within transactions', async () => {
    @Collection(getUniqueColName('label'))
    class Label implements IEntity {
      id: string;

      @SubCollection(FullBand, makeUnique('band-subcollection'))
      bands: BaseFirestoreRepository<FullBand>;
    }

    const labelRepository = getRepository(Label);
    const label = new Label();
    label.id = 'elektra-records';

    await labelRepository.create(label);

    await labelRepository.runTransaction(async tran => {
      const elektra = await tran.findById('elektra-records');

      const band = new FullBand();
      band.id = 'the-doors';
      band.name = 'The Doors';
      band.formationYear = 1965;
      band.genres = ['rock'];

      await elektra.bands.create(band);

      const album = new Album();
      album.id = 'strange-days';
      album.name = 'Strange Days';
      album.releaseDate = new Date('1967-09-25');

      const theDoors = await elektra.bands.findById('the-doors');
      await theDoors.albums.create(album);

      const fetchedAlbums = await theDoors.albums.find();
      expect(fetchedAlbums.length).toEqual(1);
      expect(fetchedAlbums[0].name).toEqual('Strange Days');
    });

    const finalElektra = await labelRepository.findById('elektra-records');
    const finalDoors = await finalElektra.bands.findById('the-doors');
    const finalAlbums = await finalDoors.albums.find();
    expect(finalAlbums.length).toEqual(1);
    expect(finalAlbums[0].name).toEqual('Strange Days');
  });
});
