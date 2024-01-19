require("dotenv").config();

const axios = require("axios");
const fs = require("fs");
const http = require("http");
const path = require("path");

const config = require("./src/config").config;
const { logErrors } = require("./src/utils/logErrors");

/**
 * Pings a website.
 * @param {string} url - The URL of the website to ping.
 * @returns {Promise} - A promise that resolves when the website has been successfully pinged, or rejects if an error occurs.
 */
function pingWebsite(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        res.on("data", () => {});
        res.on("end", resolve);
      })
      .on("error", reject);
  });
}

/**
 * Reads a file and counts the number of lines in it.
 * @param {string} filename - the name of the file to read
 * @returns {number} - the number of lines in the file
 * @throws {Error} - if the file cannot be read
 */
function countLines(filename) {
  const data = fs.readFileSync(filename, "utf8");
  const lines = data.split("\n");

  // Exclude header line
  if (lines.length > 0) {
    lines.shift();
  }

  return lines.length;
}

function isNumberWithDecimals(input) {
  const num = Number(input);

  if (isNaN(num)) {
    return false;
  }

  return Number.isInteger(num * 100);
}

/**
 * This function checks whether the 'property' of a given 'item'
 * falls within a predefined rating scale (between minRating and maxRating inclusive).
 * If the item or its property is not defined, the function does nothing.
 *
 * @param item - The object/item that contains the rating property. This could be any type of object.
 * @param property - The specific rating property in the item that needs to be checked.
 * @param minRating - Lower limit of the acceptable rating scale.
 * @param maxRating - Upper limit of the acceptable rating scale.
 */
function checkRatings(item, property, minRating, maxRating) {
  if (item && item[property]) {
    expect(item[property]).toBeGreaterThanOrEqual(minRating);
    expect(item[property]).toBeLessThanOrEqual(maxRating);
    expect(isNumberWithDecimals(item[property])).toBeTruthy;
  }
}

/**
 * This function checks properties of given items and outputs log.
 * It validates various metrics of different rating systems (like `allocine`, `imdb`, `betaseries`, `metacritic`, `rotten_tomatoes`) against predefined expectations.
 *
 * @param items - An array of objects/items that contains the properties to be checked.
 */
function checkItemProperties(items) {
  return items.forEach((item) => {
    console.log(item);

    config.keysToCheck.forEach((key) => {
      item.is_active === true ? expect(item).toHaveProperty(key) : null;
      item.is_active === true ? expect(typeof item[key]).not.toBe("undefined") : null;
    });

    expect(items.filter((item) => item.is_active).length).toBeLessThanOrEqual(config.maximumIsActiveItems);

    expect(item.allocine).not.toBeNull();
    expect(Object.keys(item.allocine).length).toBeGreaterThanOrEqual(config.minimumNumberOfItems.allocine);
    expect(items.filter((item) => item.allocine.users_rating).length).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    expect(items.filter((item) => item.allocine.critics_rating).length).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    expect(items.filter((item) => item.allocine.critics_number).length).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    expect(items.filter((item) => item.allocine.critics_rating_details).length).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);

    expect(item.imdb).not.toBeNull();
    expect(Object.keys(item.imdb).length).toBeGreaterThanOrEqual(config.minimumNumberOfItems.imdb);
    expect(item.imdb.id.startsWith("tt")).toBeTruthy();
    expect(items.filter((item) => item.imdb.users_rating).length).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);

    item.betaseries ? expect(Object.keys(item.betaseries).length).toBeGreaterThanOrEqual(config.minimumNumberOfItems.betaseries) : null;
    expect(items.filter((item) => item.betaseries && item.betaseries.users_rating).length).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);

    item.is_active === true && item.metacritic ? expect(Object.keys(item.metacritic).length).toBeGreaterThanOrEqual(config.minimumNumberOfItems.metacritic) : null;
    expect(items.filter((item) => item.metacritic && item.metacritic.users_rating).length).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    expect(items.filter((item) => item.metacritic && item.metacritic.critics_rating).length).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);

    item.rotten_tomatoes ? expect(Object.keys(item.rotten_tomatoes).length).toBeGreaterThanOrEqual(config.minimumNumberOfItems.rottenTomatoes) : null;
    expect(items.filter((item) => item.rotten_tomatoes && item.rotten_tomatoes.users_rating).length).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    expect(items.filter((item) => item.rotten_tomatoes && item.rotten_tomatoes.critics_rating).length).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);

    expect(
      items.filter(
        (item) =>
          item.allocine.critics_rating_details && typeof item.allocine.critics_rating_details[0].critic_name === "string" && typeof item.allocine.critics_rating_details[0].critic_rating === "number"
      ).length
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);

    expect(item.title).not.toBeNull();
    expect(item.image).not.toBeNull();
    expect(item.image).toMatch(/\.(jpg|jpeg|png|gif)(\?[a-zA-Z0-9=&]*)?$/i);

    item.platforms_links ? expect(item.platforms_links.filter((link) => link.link_url.startsWith("https")).length).toBe(item.platforms_links.length) : null;
    expect(items.filter((item) => item.platforms_links && item.platforms_links.length > 0).length).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);

    item.trailer ? expect(item.trailer).toMatch(/^https/) : null;
    expect(items.filter((item) => item.trailer).length).toBeGreaterThanOrEqual(config.minimumNumberOfItems.trailer);

    item.is_active === true ? expect(items.filter((item) => item.allocine.popularity).length).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default) : null;
    item.is_active === true ? expect(items.filter((item) => item.imdb.popularity).length).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default) : null;

    item.is_active === true && item.item_type === "movie"
      ? expect(items.filter((item) => item.mojo && item.mojo.lifetime_gross.charAt(0) === "$").length).toBeGreaterThanOrEqual(config.minimumNumberOfItems.mojo)
      : null;
    item.is_active === true && item.item_type === "movie"
      ? expect(items.filter((item) => item.mojo && Number.isInteger(item.mojo.rank)).length).toBeGreaterThanOrEqual(config.minimumNumberOfItems.mojo)
      : null;
  });
}

/**
 * An object containing various query parameters and their expected results.
 * @param {object} params - An object containing various query parameters and their expected results.
 * @returns None
 */
const params = {
  valid_users_ratings: {
    query: "?item_type=movie,tvshow&is_active=true&limit=400",
    expectedResult: (items) =>
      items.forEach((item) => {
        const ratingItems = [
          { source: item.allocine, ratingType: "users_rating", min: config.ratingsValues.minimum.allocine, max: config.ratingsValues.maximum.allocine },
          { source: item.allocine, ratingType: "critics_rating", min: config.ratingsValues.minimum.allocine, max: config.ratingsValues.maximum.allocine },
          { source: item.betaseries, ratingType: "users_rating", min: config.ratingsValues.minimum.betaseries, max: config.ratingsValues.maximum.betaseries },
          { source: item.imdb, ratingType: "users_rating", min: config.ratingsValues.minimum.imdb, max: config.ratingsValues.maximum.imdb },
          { source: item.metacritic, ratingType: "users_rating", min: config.ratingsValues.minimum.metacriticUsers, max: config.ratingsValues.maximum.metacriticUsers },
          { source: item.metacritic, ratingType: "critics_rating", min: config.ratingsValues.minimum.metacriticCritics, max: config.ratingsValues.maximum.metacriticCritics },
          { source: item.rotten_tomatoes, ratingType: "users_rating", min: config.ratingsValues.minimum.rottenTomatoes, max: config.ratingsValues.maximum.rottenTomatoes },
          { source: item.rotten_tomatoes, ratingType: "critics_rating", min: config.ratingsValues.minimum.rottenTomatoes, max: config.ratingsValues.maximum.rottenTomatoes },
        ];

        for (let ratingItem of ratingItems) {
          checkRatings(ratingItem.source, ratingItem.ratingType, ratingItem.min, ratingItem.max);
        }
      }),
  },

  default_movies: {
    query: "",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("movie");
      }),
  },

  only_movies: {
    query: "?item_type=movie",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("movie");
      }),
  },

  only_tvshows: {
    query: "?item_type=tvshow",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("tvshow");
      }),
  },

  only_active_items: {
    query: "?is_active=true",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("is_active");
        expect(item.is_active).toBeTruthy();
      }),
  },

  only_non_active_items: {
    query: "?is_active=false",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("is_active");
        expect(item.is_active).toBeFalsy();
      }),
  },

  both_movies_and_tvshows: {
    query: "?item_type=movie,tvshow",
    expectedResult: (items) => {
      const movieItems = items.filter((item) => item.item_type === "movie");
      const tvshowItems = items.filter((item) => item.item_type === "tvshow");

      expect(movieItems.length).toBeGreaterThan(0);
      expect(tvshowItems.length).toBeGreaterThan(0);
    },
  },

  both_active_and_non_active_items: {
    query: "?is_active=true,false",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("is_active");
        expect(item.is_active === true || item.is_active === false).toBeTruthy();
      }),
  },

  only_cinema_movies: {
    query: "?cinema_id=C0159&item_type=movie",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("movie");
      }),
  },

  only_tvshows_with_1_and_2_seasons: {
    query: "?cinema_id=C0159&item_type=tvshow&seasons_number=1,2",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("tvshow");
        expect(item).toHaveProperty("seasons_number");
        expect(item.seasons_number).toBeLessThanOrEqual(2);
      }),
  },

  only_tvshows_greater_than_1_season: {
    query: "?cinema_id=C0159&item_type=tvshow&seasons_number=1,2,5",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("tvshow");
        expect(item).toHaveProperty("seasons_number");
        expect(item.seasons_number).toBeGreaterThanOrEqual(1);
      }),
  },

  only_ongoing_tvshows: {
    query: "?item_type=tvshow&status=ongoing",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("status");
        expect(item.status).toBe("Ongoing");
        expect(item.status).not.toBeNull();
      }),
  },

  ongoing_and_canceled_tvshows: {
    query: "?item_type=tvshow&is_active=true,false&status=canceled,soon",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("status");
        expect(["Canceled", "Soon"]).toContain(item.status);
      }),
  },

  only_null_status_items: {
    query: "?status=&limit=200",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("status");
        expect(item.status).toBe(null);
      }),
  },

  custom_limit_value: {
    query: "?limit=5",
    expectedResult: (items) => {
      expect(items.length).toBe(5);
    },
  },

  ongoing_tvshows_with_1_and_2_seasons: {
    query: "?item_type=tvshow&status=ongoing&seasons_number=1,2",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("status");
        expect(item.status).toBe("Ongoing");
        expect(item).toHaveProperty("seasons_number");
        expect(item.seasons_number).toBeLessThanOrEqual(2);
      }),
  },

  page_2_with_20_items: {
    query: "?cinema_id=C0159&item_type=tvshow&seasons_number=1,2&page=2&limit=20&allData=true",
    expectedResult: (data) => {
      expect(data).toHaveProperty("page");
      expect(data.page).toBe(2);
      expect(data.results.length).toBe(20);
    },
  },

  no_items_found_on_page_3: {
    query: "?cinema_id=C0159&item_type=tvshow&seasons_number=1,2&page=3&limit=200&allData=true",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data.message).toBe("No items have been found for page 3.");
    },
  },

  same_files_line_number_as_remote: {
    query: "?item_type=movie,tvshow&is_active=true,false&allData=true",
    expectedResult: (items) => {
      if (config.checkItemsNumber) {
        const filmsLines = countLines(config.films_ids_path);
        const seriesLines = countLines(config.series_ids_path);

        expect(filmsLines + seriesLines - 2).toEqual(items.total_results);
      }
    },
  },

  correct_tmdb_id_returned: {
    query: "/tv/87108?ratings_filters=all&allData=true",
    expectedResult: (data) => {
      expect(typeof data).toBe("object");
      expect(data.id).toBe(87108);
    },
  },

  correct_tvshow_item_type_returned: {
    query: "/tv/121?allData=true",
    expectedResult: (data) => {
      expect(typeof data).toBe("object");
      expect(data.item_type).toBe("tvshow");
    },
  },

  correct_movie_item_type_returned: {
    query: "/movie/121?allData=true",
    expectedResult: (data) => {
      expect(typeof data).toBe("object");
      expect(data.item_type).toBe("movie");
    },
  },

  results_count_on_search: {
    query: "?title=wolf&allData=true",
    expectedResult: (data) => {
      expect(data).toHaveProperty("page");
      expect(data.page).toBe(1);
      expect(data.results.length).toEqual(data.total_results);
    },
  },

  titles_containing_game_on_search: {
    query: "?title=game",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item.title.toLowerCase()).toContain("game");
      }),
  },

  no_items_found_for_invalid_query: {
    query: "?title=some invalid value to be tested&allData=true",
    expectedResult: (data) => {
      expect(data).toHaveProperty("message");
      expect(data.message).toBe("No items have been found.");
    },
  },

  ascending_popularity_average: {
    query: "?item_type=tvshow",
    expectedResult: (items) => {
      for (let i = 1; i < items.length; i++) {
        expect(items[i].popularity_average).toBeGreaterThanOrEqual(items[i - 1].popularity_average);
      }
    },
  },

  top_popularity_items: {
    query: "?item_type=tvshow&limit=200",
    expectedResult: (items) => {
      expect(items.slice(0, 10).filter((item) => item.allocine.popularity < 10).length).toBeGreaterThanOrEqual(0);
      expect(items.slice(0, 10).filter((item) => item.imdb.popularity < 10).length).toBeGreaterThanOrEqual(0);
    },
  },

  correct_allocine_popularity_order: {
    query: "?item_type=tvshow&popularity_filters=allocine_popularity",
    expectedResult: (items) => {
      for (let i = 1; i < items.length; i++) {
        expect(items[i].allocine.popularity).toBeGreaterThanOrEqual(items[i - 1].allocine.popularity);
      }
    },
  },

  correct_imdb_popularity_order: {
    query: "?item_type=tvshow&popularity_filters=imdb_popularity",
    expectedResult: (items) => {
      for (let i = 1; i < items.length; i++) {
        expect(items[i].imdb.popularity).toBeGreaterThanOrEqual(items[i - 1].imdb.popularity);
      }
    },
  },

  correct_none_popularity_order: {
    query: "?item_type=tvshow&popularity_filters=none,imdb_popularity",
    expectedResult: (items) => {
      for (let i = 1; i < items.length; i++) {
        expect(items[i].ratings_average).toBeLessThanOrEqual(items[i - 1].ratings_average);
      }
    },
  },

  items_with_minimum_ratings: {
    query: "?minimum_ratings=4,3.5",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item.ratings_average).toBeGreaterThanOrEqual(3.5);
      }),
  },

  ratings_average_for_incorrect_minimum_ratings: {
    query: "?item_type=tvshow&popularity_filters=none&minimum_ratings=some invalid value to be tested",
    expectedResult: (items) => {
      for (let i = 1; i < items.length; i++) {
        expect(items[i].ratings_average).toBeLessThanOrEqual(items[i - 1].ratings_average);
      }
    },
  },

  items_with_all_required_keys_active: {
    query: "?item_type=movie,tvshow&is_active=true&limit=400",
    expectedResult: checkItemProperties,
  },

  items_with_all_required_keys_inactive: {
    query: "?item_type=movie,tvshow&is_active=false&limit=3000",
    expectedResult: checkItemProperties,
  },

  all_keys_are_lowercase: {
    query: "?item_type=movie,tvshow&is_active=true&limit=400",
    expectedResult: (items) =>
      items.forEach((item) => {
        for (let key in item) {
          expect(key).toEqual(key.toLowerCase());
        }
      }),
  },

  unique_allocine_ids_movie: {
    query: "?item_type=movie&is_active=true,false&limit=3000",
    expectedResult: (items) => {
      const ids = items.map((item) => item.allocine.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds.length).toEqual(ids.length);
    },
  },

  unique_allocine_ids_tvshow: {
    query: "?item_type=tvshow&is_active=true,false&limit=3000",
    expectedResult: (items) => {
      const ids = items.map((item) => item.allocine.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds.length).toEqual(ids.length);
    },
  },
};

test("Check API availability and run tests", async () => {
  await pingWebsite("http://whatson-api.onrender.com");
});

/**
 * Tests the What's on? API by iterating through the params object and running each test case.
 * @returns None
 */
describe("What's on? API tests", () => {
  const param = process.env.SOURCE;
  const baseURL = param === "remote" ? config.baseURLRemote : config.baseURL;
  console.log(`Testing on ${baseURL}.`);

  Object.entries(params).forEach(([name, { query, expectedResult }]) => {
    async function fetchItemsData() {
      const apiCall = `${baseURL}${query}`;

      console.log(`Calling ${apiCall}`);

      const response = await axios.get(apiCall);
      const data = response.data;
      const items = data.results;

      if (query.includes("allData=true")) {
        expectedResult(data);
      } else {
        expectedResult(items);
      }
    }

    test(
      name,
      async () => {
        await fetchItemsData();
      },
      config.timeout
    );
  });

  test(
    "api_response_time_should_be_within_an_acceptable_range",
    async () => {
      const start = new Date().valueOf();

      await axios.get(baseURL);

      const end = new Date().valueOf();
      const responseTime = end - start;

      const maxResponseTime = config.maxResponseTime;

      expect(responseTime).toBeLessThan(maxResponseTime);
    },
    config.timeout
  );
});

jest.mock("fs");

describe("Testing logErrors function", () => {
  test("It should increment the errorCounter when an error is logged", () => {
    const error = new Error("Test Error");
    let errorCounter = 0;

    for (let i = 1; i <= 5; i++) {
      errorCounter = logErrors(errorCounter, error);
      expect(errorCounter).toBe(i);
    }
  });
});
