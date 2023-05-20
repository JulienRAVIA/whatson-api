/* A configuration file for the project. */
const config = {
  baseURLAllocine: "https://www.allocine.fr",
  baseURLBetaseriesAPI: "https://api.betaseries.com/shows/display",
  baseURLBetaseriesFilm: "https://www.betaseries.com/film/",
  baseURLBetaseriesSerie: "https://www.betaseries.com/serie/",
  baseURLCriticDetailsFilms: "/film/fichefilm-",
  baseURLCriticDetailsSeries: "/series/ficheserie-",
  baseURLIMDB: "https://www.imdb.com/title/",
  baseURLTMDB: "https://api.themoviedb.org/3",
  baseURLTypeFilms: "/film/fichefilm_gen_cfilm=",
  baseURLTypeSeries: "/series/ficheserie_gen_cserie=",
  baseURLMetacriticFilm: "https://www.metacritic.com/movie/",
  baseURLMetacriticSerie: "https://www.metacritic.com/tv/",

  collectionName: "data",
  dbName: "whatson",

  endURLCriticDetails: "/critiques/presse/",
  filmsIdsFilePath: "./src/assets/films_ids.txt",
  seriesIdsFilePath: "./src/assets/series_ids.txt",

  keysToCheck: ["allocine", "betaseries", "id", "image", "imdb", "is_active", "item_type", "metacritic", "platforms_links", "seasons_number", "status", "title", "trailer"],

  baseURLTheaters: "https://www.allocine.fr/_/showtimes/theater-",
  corsURL: "https://cors-sites-aafe82ad9d0c.fly.dev/",

  limit: 20,
  maxSeasonsNumber: 5,
  page: 1,
};

module.exports = { config };
