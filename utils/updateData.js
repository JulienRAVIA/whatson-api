/* Importing the libraries that are needed for the script to work. */
const dotenv = require("dotenv");
dotenv.config();

const csv = require("csvtojson");
const shell = require("shelljs");
const { writeFileSync } = require("fs");

/* Connecting to the MongoDB database. */
const { MongoClient, ServerApiVersion } = require("mongodb");
const credentials = process.env.CREDENTIALS;
const uri = `mongodb+srv://${credentials}@cluster0.yxe57eq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const { config } = require("../src/config");
const { getNodeVarsValues } = require("../src/getNodeVarsValues");

const { b64Encode, b64Decode } = require("../src/utils/b64EncodeAndDecode");
const { controlData } = require("./controlData");
const { countNullElements } = require("./countNullElements");
const { getAllocineCriticInfo } = require("../src/getAllocineCriticInfo");
const { getAllocineFirstInfo } = require("../src/getAllocineFirstInfo");
const { getBetaseriesUsersRating } = require("../src/getBetaseriesUsersRating");
const { getImdbUsersRating } = require("../src/getImdbUsersRating");
const { getMetacriticRating } = require("../src/getMetacriticRating");
const { getPlatformsLinks } = require("../src/getPlatformsLinks");
const { jsonArrayFiltered } = require("../src/utils/jsonArrayFiltered");
const { updateIds } = require("../src/updateIds");
const { upsertToDatabase } = require("./upsertToDatabase");

const item_type = getNodeVarsValues.item_type;

/* Checking if the variable get_ids is true. If it is not true, it will run the function updateIds(). */
const get_ids = getNodeVarsValues.get_ids;
if (get_ids === "update_ids") updateIds();

/* Checking if the second argument is true. If it is, it exits the process. */
const get_db = getNodeVarsValues.get_db;
if (get_db !== "update_db") process.exit(1);

/* Removing the file logs.txt */
shell.exec("rm -f ./logs.txt");

/**
 * Creates a JSON object with information about a movie or TV show from various sources.
 * @param {Object} allocineCriticsDetails - Details about the critics' ratings from Allocine.
 * @param {string} allocineHomepage - The URL of the movie or TV show's Allocine page.
 * @param {string} allocineId - The ID of the movie or TV show on Allocine.
 * @param {string} betaseriesHomepage - The URL of the movie or TV show's Betaseries page.
 * @param {string} betaseriesId - The ID of the movie or TV show on Betaseries.
 * @param {string} imdbHomepage - The URL of the movie or TV
 */
const createJSON = async (allocineCriticsDetails, allocineHomepage, allocineId, betaseriesHomepage, betaseriesId, imdbHomepage, imdbId, isActive, metacriticHomepage, metacriticId, theMoviedbId) => {
  /**
   * Asynchronously retrieves various pieces of information from different sources for a movie.
   * @param {string} allocineHomepage - The URL of the movie's Allocine homepage.
   * @param {string} betaseriesHomepage - The URL of the movie's Betaseries homepage.
   * @param {string} theMoviedbId - The ID of the movie on The Movie Database.
   * @param {string} allocineCriticsDetails - The URL of the movie's Allocine critics details page.
   * @param {string} imdbHomepage - The URL of the movie's IMDb homepage.
   * @returns An object containing various pieces of information about the movie.
   */
  const allocineFirstInfo = await getAllocineFirstInfo(allocineHomepage, betaseriesHomepage, theMoviedbId);
  const allocineCriticInfo = await getAllocineCriticInfo(allocineCriticsDetails);
  const betaseriesUsersRating = await getBetaseriesUsersRating(betaseriesHomepage);
  const betaseriesPlatformsLinks = await getPlatformsLinks(allocineHomepage, imdbHomepage);
  const imdbUsersRating = await getImdbUsersRating(imdbHomepage);
  const metacriticRating = await getMetacriticRating(imdbHomepage, metacriticHomepage, metacriticId);

  /**
   * Destructures the properties of the given object and assigns them to individual variables.
   * @param {Object} allocineFirstInfo - The object containing the first set of Allocine information.
   * @param {Object} allocineCriticInfo - The object containing the Allocine critic information.
   * @returns None
   */
  const allocineImage = allocineFirstInfo.allocineImage;
  const seasonsNumber = allocineFirstInfo.seasonsNumber;
  const allocineTitle = allocineFirstInfo.allocineTitle;
  const allocineUsersRating = allocineFirstInfo.allocineUsersRating;
  const criticsNumber = allocineCriticInfo.criticsNumber;
  const criticsRating = allocineCriticInfo.criticsRating;
  const criticsRatingDetails = allocineCriticInfo.criticsRatingDetails;
  const status = allocineFirstInfo.status;
  const trailer = allocineFirstInfo.trailer;

  /**
   * An object representing information about a movie from Allocine.
   * @property {number} id - The ID of the movie on Allocine.
   * @property {string} url - The URL of the movie's page on Allocine.
   * @property {number} users_rating - The average rating given by users on Allocine.
   * @property {number} critics_rating - The average rating given by critics on Allocine.
   * @property {number} critics_number - The number of critics who have rated the movie on Allocine.
   * @property {Object} critics_rating_details - Details about the ratings given by critics on Allocine.
   */
  const allocineObj = {
    id: allocineId,
    url: allocineHomepage,
    users_rating: allocineUsersRating,
    critics_rating: criticsRating,
    critics_number: criticsNumber,
    critics_rating_details: criticsRatingDetails,
  };

  /* Creating an object called betaseriesObj. */
  let betaseriesObj = null;
  if (betaseriesId !== "null") {
    betaseriesObj = {
      id: betaseriesId,
      url: betaseriesHomepage,
      users_rating: betaseriesUsersRating,
    };
  }

  /* Creating an object called imdbObj. */
  const imdbObj = {
    id: imdbId,
    url: imdbHomepage,
    users_rating: imdbUsersRating,
  };

  /**
   * Creates a Metacritic object if the metacritic rating is not null.
   * @param {object} metacriticRating - the Metacritic rating object
   * @returns {object | null} - the Metacritic object or null if the rating is null
   */
  let metacriticObj = null;
  if (metacriticRating !== null) {
    metacriticObj = {
      id: metacriticRating.id,
      url: metacriticRating.url,
      users_rating: metacriticRating.usersRating,
      critics_rating: metacriticRating.criticsRating,
      critics_number: metacriticRating.criticsNumber,
      critics_rating_details: metacriticRating.criticsRatingDetails,
    };
  }

  const data = {
    id: theMoviedbId,
    is_active: isActive,
    item_type: item_type,
    title: allocineTitle,
    image: allocineImage,
    platforms_links: betaseriesPlatformsLinks,
    seasons_number: seasonsNumber,
    status: status,
    trailer: trailer,
    allocine: allocineObj,
    betaseries: betaseriesObj,
    imdb: imdbObj,
    metacritic: metacriticObj,
  };

  return data;
};

/* Importing data from a CSV file into a MongoDB database. */
(async () => {
  const dbName = config.dbName;
  const collectionName = config.collectionName;
  const database = client.db(dbName);
  const collectionData = database.collection(collectionName);

  const skip_already_added_documents = getNodeVarsValues.skip_already_added_documents;

  /* Updating all documents in the collection to is_active: false. */
  if (!skip_already_added_documents && get_ids === "update_ids") {
    const updateQuery = { $set: { is_active: false } };
    await collectionData.updateMany({ item_type: item_type }, updateQuery);
    console.log("All documents have been set to false.");
  }

  let idsFilePath;
  if (item_type === "movie") {
    idsFilePath = config.filmsIdsFilePath;
  } else {
    idsFilePath = config.seriesIdsFilePath;
  }
  console.log(`Ids file path to use: ${idsFilePath}`);

  const is_not_active = getNodeVarsValues.is_not_active;
  const jsonArrayFromCSV = await csv().fromFile(idsFilePath);
  let jsonArray = [];

  /* Checking if the is_not_active variable is not active or if it is active. If it is not active, it
  will filter the jsonArrayFromCSV. If it is active, it will not filter the jsonArrayFromCSV. */
  jsonArray = !is_not_active || is_not_active === "active" ? jsonArrayFiltered(jsonArrayFromCSV) : jsonArrayFromCSV;

  /* Setting the index_to_start variable to the value of the node_vars[5] variable. If node_vars[5] is
  not defined, then index_to_start is set to 0. */
  let index_to_start = getNodeVarsValues.index_to_start;
  if (!index_to_start) index_to_start = 0;

  console.time("Duration");

  try {
    /* Printing out the value of each variable in the getNodeVarsValues object. */
    for (let variable in getNodeVarsValues) {
      let variable_value = getNodeVarsValues[variable];
      if (!getNodeVarsValues[variable]) variable_value = "not set";
      console.log(`${variable}: ${variable_value}`);
    }

    const check_db_ids = getNodeVarsValues.check_db_ids;
    if (check_db_ids === "check") {
      let idFromFiles = [];
      jsonArrayFromCSV.forEach((element) => {
        idFromFiles.push(b64Encode(`${config.baseURLAllocine}${element.URL}`));
      });
      const allDbIdsArray = await collectionData
        .find({ item_type: item_type })
        .map((el) => {
          return el._id;
        })
        .toArray();
      const idsOnlyInDb = allDbIdsArray.filter((x) => !idFromFiles.includes(x));
      idsOnlyInDb.forEach((element) => {
        console.log(`${element}: ${b64Decode(element)}`);
      });
      process.exit(0);
    }

    for (let index = index_to_start; index < jsonArray.length; index++) {
      const json = jsonArray[index];

      console.timeLog("Duration", `- ${parseInt(index) + 1} / ${jsonArray.length} (${(((parseInt(index) + 1) * 100) / jsonArray.length).toFixed(1)}%)`);

      const baseURLAllocine = config.baseURLAllocine;
      const allocineURL = json.URL;
      const completeAllocineURL = `${baseURLAllocine}${allocineURL}`;

      if (skip_already_added_documents) {
        const allocineQuery = { _id: b64Encode(completeAllocineURL) };
        const isDocumentExisting = await collectionData.find(allocineQuery).toArray();
        const keysArray = config.keysToCheck;
        const isDocumentHasInfo = isDocumentExisting.length > 0;
        const document = isDocumentExisting[0];

        await controlData(completeAllocineURL, keysArray, isDocumentHasInfo, document);

        if (isDocumentHasInfo) continue;
      }

      /* AlloCiné info */
      let baseURLType;
      let baseURLCriticDetails;
      if (item_type === "movie") {
        baseURLType = config.baseURLTypeFilms;
        baseURLCriticDetails = config.baseURLCriticDetailsFilms;
      } else {
        baseURLType = config.baseURLTypeSeries;
        baseURLCriticDetails = config.baseURLCriticDetailsSeries;
      }

      const endURLCriticDetails = config.endURLCriticDetails;
      const allocineId = parseInt(allocineURL.match(/=(.*)\./).pop());
      const allocineHomepage = `${baseURLAllocine}${baseURLType}${allocineId}.html`;
      const allocineCriticsDetails = `${baseURLAllocine}${baseURLCriticDetails}${allocineId}${endURLCriticDetails}`;

      /* IMDb info */
      const baseURLIMDB = config.baseURLIMDB;
      const imdbId = json.IMDB_ID;
      const imdbHomepage = `${baseURLIMDB}${imdbId}/`;

      /* BetaSeries info */
      const baseURLBetaseriesFilm = config.baseURLBetaseriesFilm;
      const baseURLBetaseriesSerie = config.baseURLBetaseriesSerie;
      let betaseriesId = json.BETASERIES_ID;

      let betaseriesHomepage;
      if (item_type === "movie") {
        betaseriesHomepage = `${baseURLBetaseriesFilm}${betaseriesId}`;
      } else {
        betaseriesHomepage = `${baseURLBetaseriesSerie}${betaseriesId}`;
      }

      /* If the BetaSeries movie was categorized as a serie */
      if (betaseriesId.startsWith("serie/")) {
        const betaseriesIdNew = betaseriesId.split("/");
        betaseriesId = betaseriesIdNew[1];
        betaseriesHomepage = `${baseURLBetaseriesSerie}${betaseriesId}`;
      }

      /* Metacritic info */
      const baseURLMetacriticFilm = config.baseURLMetacriticFilm;
      const baseURLMetacriticSerie = config.baseURLMetacriticSerie;
      let metacriticId = json.METACRITIC_ID;

      let metacriticHomepage;
      if (item_type === "movie") {
        metacriticHomepage = `${baseURLMetacriticFilm}${metacriticId}`;
      } else {
        metacriticHomepage = `${baseURLMetacriticSerie}${metacriticId}`;
      }

      const isActive = json.IS_ACTIVE_1 === "TRUE";

      const theMoviedbId = parseInt(json.THEMOVIEDB_ID);

      if (isNaN(theMoviedbId)) {
        console.log(`Something went wrong, The Movie Database id has not been found for ${completeAllocineURL}!`);
        process.exit(1);
      }

      const data = await createJSON(
        allocineCriticsDetails,
        allocineHomepage,
        allocineId,
        betaseriesHomepage,
        betaseriesId,
        imdbHomepage,
        imdbId,
        isActive,
        metacriticHomepage,
        metacriticId,
        theMoviedbId
      );
      if (typeof data.title === "string") {
        await upsertToDatabase(data, collectionData);
      } else {
        writeFileSync(`logs.txt`, `The title of ${allocineHomepage} has not been found!`, { flag: "a+" });
      }
    }
  } catch (error) {
    console.log(`Global: ${error}`);
  } finally {
    await countNullElements(collectionData);

    await client.close();
  }

  console.timeEnd("Duration", `- ${jsonArray.length} elements imported.`);
})();
