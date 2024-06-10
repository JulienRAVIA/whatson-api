const axios = require("axios");
const axiosRetry = require("axios-retry").default;

const { config } = require("../config");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { logErrors } = require("../utils/logErrors");
const { getAllocinePopularity } = require("./getAllocinePopularity");

/**
 * It takes the IMDb homepage of a movie as an argument, and returns the IMDb popularity ranking of the movie
 * @param imdbHomepage - The IMDb homepage of the movie.
 * @returns The popularity ranking of the movie.
 */
const getImdbPopularity = async (imdbHomepage, allocineURL, item_type) => {
  try {
    axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
    const options = {
      headers: {
        "User-Agent": config.userAgent,
      },
    };
    const $ = await getCheerioContent(
      `${imdbHomepage}`,
      options,
      "getImdbPopularity",
    );

    const allocinePopularity = (
      await getAllocinePopularity(allocineURL, item_type)
    ).popularity;
    const rawPopularity = $(
      'div[data-testid="hero-rating-bar__popularity__score"]',
    )
      .first()
      .text()
      .trim();
    const popularity =
      rawPopularity !== "" ? parseInt(rawPopularity.replace(/,/g, "")) : null;

    const popularityResult =
      popularity - allocinePopularity > config.maxPopularityDiff
        ? null
        : popularity;

    return {
      popularity: popularityResult,
    };
  } catch (error) {
    logErrors(error, imdbHomepage, "getImdbPopularity");
  }
};

module.exports = { getImdbPopularity };
