/* Schema */
const schema = {
  _id: "string", // Unique MongoDB identifier for the item
  allocine: {
    /* Information related to AlloCiné platform */
    id: "number", // AlloCiné specific identifier
    url: "string", // URL to the AlloCiné page
    users_rating: "number", // Rating given by AlloCiné users
    critics_rating: "number", // Rating given by AlloCiné critics
    critics_number: "number", // Number of AlloCiné critics who rated
    critics_rating_details: [
      // To display this key, add the query parameter `critics_rating_details=true`
      {
        critic_name: "string", // Name of the critic
        critic_rating: "number", // Rating given by the critic
      },
    ],
    popularity: "number", // Popularity score on AlloCiné
  },
  betaseries: {
    /* Information related to BetaSeries platform */
    id: "string", // BetaSeries specific identifier
    url: "string", // URL to the BetaSeries page
    users_rating: "number", // Rating given by BetaSeries users
  },
  id: "number", // General identifier (The Movie Database ID)
  image: "string", // URL to the item's image
  imdb: {
    /* Information related to IMDb platform */
    id: "string", // IMDb specific identifier
    url: "string", // URL to the IMDb page
    users_rating: "number", // Rating given by IMDb users
    popularity: "number", // Popularity score on IMDb
  },
  is_active: "boolean", // Indicates if the item is currently active
  item_type: "string", // Type of the item (e.g., movie or tvshow)
  platforms_links: [
    {
      name: "string", // Name of the streaming platform
      link_url: "string", // URL to the streaming platform
    },
  ],
  release_date: "string", // Release date of the item
  seasons_number: "number", // Number of seasons available
  episodes_details: [
    // To display this key, add the query parameter `episodes_details=true`
    {
      season: "number", // Season number of the episode
      episode: "number", // Episode number within the season
      title: "string", // Title of the episode
      id: "string", // IMDb specific identifier
      url: "string", // URL to the IMDb page
      users_rating: "number", // Rating given by IMDb users
    },
  ],
  status: "string", // Current status of the item (e.g., ongoing, ended, etc.)
  tagline: "string", // Tagline of the item
  title: "string", // Title of the item
  trailer: "string", // URL to the item's trailer
  metacritic: {
    /* Information related to Metacritic platform */
    id: "string", // Metacritic specific identifier
    url: "string", // URL to the Metacritic page
    users_rating: "number", // Rating given by Metacritic users
    critics_rating: "number", // Rating given by Metacritic critics
  },
  mojo: {
    /* Information related to Box Office Mojo platform */
    rank: "number", // Ranking according to Box Office Mojo
    url: "string", // URL to the Box Office Mojo page
    lifetime_gross: "string", // Lifetime gross revenue (formatted as string with $)
  },
  rotten_tomatoes: {
    /* Information related to Rotten Tomatoes platform */
    id: "string", // Rotten Tomatoes specific identifier
    url: "string", // URL to the Rotten Tomatoes page
    users_rating: "number", // Rating given by Rotten Tomatoes users
    critics_rating: "number", // Rating given by Rotten Tomatoes critics
  },
  letterboxd: {
    /* Information related to Letterboxd platform */
    id: "string", // Letterboxd specific identifier
    url: "string", // URL to the Letterboxd page
    users_rating: "number", // Rating given by Letterboxd users
  },
  senscritique: {
    /* Information related to SensCritique platform */
    id: "number", // SensCritique specific identifier
    url: "string", // URL to the SensCritique page
    users_rating: "number", // Rating given by SensCritique users
  },
  updated_at: "string", // Timestamp of the last update
  trakt: {
    /* Information related to Trakt platform */
    id: "string", // Trakt specific identifier
    url: "string", // URL to the Trakt page
    users_rating: "number", // Rating given by Trakt users
  },
  tmdb: {
    /* Information related to The Movie Database (TMDB) platform */
    id: "number", // TMDB specific identifier
    url: "string", // URL to the TMDB page
    users_rating: "number", // Rating given by TMDB users
  },
  popularity_average: "number", // Average popularity score across platforms (AlloCiné and IMDb)
  ratings_average: "number", // Average rating score across platforms (all)
};

module.exports = { schema };
