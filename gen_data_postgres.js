const faker = require('faker');
const { Pool, Client } = require('pg');
const sql = require('sql');

process.env.PGHOST = "localhost";
process.env.PGDATABASE = "node_db";
process.env.PGUSER = "node_user";
process.env.PGPASSWORD = "node_123";

let Albums = sql.define({
  name: 'albums',
  columns: [
   'id',
   'artist',
   'album_title',
   'tracks',
   'artist_description',
   'coverart',
   'created_at',
   'updated_at'
  ]
});

let chunkSize = 55;
let totalRecords = 1000000;
let rowsCount = 0;
let start = 1;
let end = chunkSize;


const pool = new Pool();

const writeRows = (rows) => {
  rowsCount += rows.length;
  let percentage = (rowsCount * 100) / totalRecords;
  console.log(`Generated records count ${rowsCount}. Progress - ${percentage} %`);
  let query = Albums.insert(rows).toQuery();
  (async () => {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')
      await client.query(query)

      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
      start = end + 1;
      end = start - 1 + chunkSize;
      generateData(start, end)
    }
  })().catch(e => console.error(e.stack))
};

const generateTracks = () =>  JSON.stringify([{
    track: faker.lorem.paragraph(),
    url: faker.image.imageUrl(),
    lyrics: faker.lorem.paragraph()
}]);

const writeAlbumData = (start, stop) => {
  console.time("seed")
  var output = [];
  for (var j = start; j <= stop; j++) {
    var id = j;
    var artist = faker.random.words();
    var album_title = faker.random.words();
    var tracks = generateTracks()
    var artist_description = faker.lorem.paragraph();
    var coverart = faker.image.imageUrl();
    output.push({
      id,
      artist,
      album_title,
      tracks,
      artist_description,
      coverart,
      created_at: new Date(),
      updated_at: new Date()
    })
  }
  console.timeEnd("seed")
  writeRows(output)
};

const generateData = (start, end) => {
  if (start > totalRecords){

    (async () => {
	  const client = await pool.connect()
	  query = "select * from albums where id=100"
	  startTime = (new Date()).getTime()
	  try {

	    await client.query('BEGIN')
	    await client.query(query)

	    await client.query('COMMIT')
	  } catch (e) {
	    await client.query('ROLLBACK')
	    throw e
	  } finally {
	    client.release()
	    endTime = (new Date()).getTime()
	    console.log("Took " + (endTime-startTime) + " ms")
	  }
	})().catch(e => console.error(e.stack));
  } else {
  	writeAlbumData(start, end);
  }

};

(async () => {
  const client = await pool.connect()
  query = "CREATE TABLE if not exists albums ( id bigint, artist text, album_title text, tracks text, artist_description text, coverart text, created_at timestamp, updated_at timestamp )"
  try {
    await client.query('BEGIN')
    await client.query(query)

    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
    generateData(start, end)
  }
})().catch(e => console.error(e.stack));