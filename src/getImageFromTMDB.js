const path = require("path");

const { getTMDBResponse } = require("./utils/getTMDBResponse");
const { config } = require("./config");

let errorCounter = 0;

/**
 * Retrieves the image path for a movie or TV show from The Movie Database (TMDB) API.
 * @param {string} allocineHomepage - The homepage of the movie or TV show on Allocine.
 * @param {number} theMoviedbId - The ID of the movie or TV show on TMDB.
 * @returns {Promise<string|null>} - A promise that resolves with the image path or null if there was an error.
 */
const getImageFromTMDB = async (allocineHomepage, theMoviedbId) => {
  try {
    const { data, status } = await getTMDBResponse(allocineHomepage, theMoviedbId);
    let image_path = data.poster_path || data.profile_path;
    if (status !== 200) image_path = null;

    return image_path;
  } catch (error) {
    const fileName = path.basename(__filename);

    console.log(`${fileName} - ${allocineHomepage}: ${error}`);

    errorCounter++;
    if (errorCounter > config.maxErrorCounter.default) {
      console.log(`An error on ${fileName} has been returned more than ${config.maxErrorCounter.default} times, exiting the script.`);
      process.exit(1);
    }
  }
};

module.exports = { getImageFromTMDB };
